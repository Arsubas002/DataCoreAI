"""Local read-only API. Bind to loopback; no SQL database is created or migrated."""

from datetime import date, datetime
from decimal import Decimal
from typing import Annotated
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.security import AuthSettings, Principal, authenticate
from backend.sql_store import SqlStore, DatabaseUnavailable, boundaries

User = Annotated[Principal, Depends(authenticate)]
QueryText = Annotated[str, Query(max_length=200)]
Limit = Annotated[int, Query(ge=1, le=200)]
Offset = Annotated[int, Query(ge=0, le=10000)]
Identifier = Annotated[int | None, Query(ge=1, le=2147483647)]


def safe_json(value):
    if isinstance(value, Decimal):
        return format(value, ".2f")
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: safe_json(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [safe_json(v) for v in value]
    return value


def create_app(auth=None, store=None):
    app = FastAPI(
        title="DataCore AI · Original SQL API",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.auth = auth if auth is not None else AuthSettings.from_environment()
    app.state.store = store if store is not None else SqlStore()

    @app.middleware("http")
    async def headers(request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid(request, exception):
        # Do not echo supplied tokens, query values or internal schema details.
        return JSONResponse({"error": {"code": "invalid_input"}}, status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, exception):
        detail = exception.detail
        return JSONResponse(
            {
                "error": (
                    detail if isinstance(detail, dict) else {"code": "request_rejected"}
                )
            },
            status_code=exception.status_code,
            headers=exception.headers,
        )

    @app.exception_handler(DatabaseUnavailable)
    async def database_error(request, exception):
        return JSONResponse(
            {
                "error": {
                    "code": "original_database_unavailable",
                    "message": "No se pudo consultar la base original. No se sustituyeron los datos.",
                }
            },
            status_code=503,
        )

    def respond(data):
        return JSONResponse(
            safe_json(
                {"source": {"database": "DataCoreAI", "mode": "live-sql"}, "data": data}
            )
        )

    def period(start, end):
        try:
            boundaries(start, end)
        except ValueError:
            raise HTTPException(422, detail={"code": "invalid_period"}) from None

    @app.get("/health")
    def health():
        return {"status": "process_alive", "databaseVerified": False}

    @app.get("/api/products")
    def products(
        user: User,
        q: QueryText = "",
        category_id: Identifier = None,
        limit: Limit = 100,
        offset: Offset = 0,
    ):
        user.require("products:read")
        return respond(app.state.store.products(q.strip(), category_id, limit, offset))

    @app.get("/api/categories")
    def categories(user: User):
        user.require("products:read")
        return respond(app.state.store.categories())

    @app.get("/api/customers")
    def customers(
        user: User, q: QueryText = "", limit: Limit = 100, offset: Offset = 0
    ):
        user.require("customers:read")
        return respond(app.state.store.customers(q.strip(), limit, offset))

    @app.get("/api/inventory")
    def inventory(
        user: User,
        q: QueryText = "",
        low_only: bool = False,
        limit: Limit = 100,
        offset: Offset = 0,
    ):
        user.require("inventory:read")
        return respond(app.state.store.inventory(q.strip(), low_only, limit, offset))

    @app.get("/api/sales")
    def sales(
        user: User, start: date, end: date, limit: Limit = 100, offset: Offset = 0
    ):
        user.require("sales:read")
        period(start, end)
        return respond(app.state.store.sales(start, end, limit, offset))

    @app.get("/api/reports")
    def reports(
        user: User,
        start: date,
        end: date,
        product_id: Identifier = None,
        category_id: Identifier = None,
    ):
        user.require("reports:read")
        period(start, end)
        return respond(app.state.store.reports(start, end, product_id, category_id))

    @app.get("/api/source/status")
    def source_status(user: User):
        user.require("source:read")
        rows = app.state.store.schema()
        expected = {
            "Categorias": {"CategoriaID", "Nombre"},
            "Productos": {
                "ProductoID",
                "Codigo",
                "Nombre",
                "CategoriaID",
                "Precio",
                "Existencias",
                "StockMinimo",
                "Activo",
                "VersionFila",
            },
            "Clientes": {
                "ClienteID",
                "Documento",
                "Nombre",
                "Correo",
                "Telefono",
                "Activo",
            },
            "Ventas": {"VentaID", "ClienteID", "Fecha", "Total"},
            "DetalleVentas": {
                "DetalleVentaID",
                "VentaID",
                "ProductoID",
                "Cantidad",
                "PrecioUnitario",
                "Subtotal",
            },
            "VentasSolicitudes": {"SolicitudID", "Huella", "VentaID", "FechaCreacion"},
        }
        actual = {
            table: {r["COLUMN_NAME"] for r in rows if r["TABLE_NAME"] == table}
            for table in expected
        }
        missing = {
            table: sorted(fields - actual[table])
            for table, fields in expected.items()
            if fields - actual[table]
        }
        return respond(
            {
                "connected": True,
                "columnContractCompatible": not missing,
                "constraintsVerified": False,
                "missing": missing,
                "branchesSupported": False,
            }
        )

    @app.post("/api/assistant")
    async def assistant(request: Request, user: User):
        user.require("assistant:read")
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 8192:
                raise HTTPException(413, detail={"code": "body_too_large"})
        import json

        try:
            payload = json.loads(body)
        except Exception:
            raise HTTPException(422, detail={"code": "invalid_input"}) from None
        if (
            not isinstance(payload, dict)
            or not isinstance(payload.get("message"), str)
            or not 1 <= len(payload["message"].strip()) <= 2000
        ):
            raise HTTPException(422, detail={"code": "invalid_input"})
        question = payload["message"].casefold()
        if any(word in question for word in ("sucursal", "rentabilidad", "margen")):
            return respond(
                {
                    "mode": "verified-read-only",
                    "modelConnected": False,
                    "answer": "El esquema original no contiene sucursales ni costos. No puedo calcular ese dato.",
                }
            )
        if any(
            word in question
            for word in ("stock", "disponibilidad", "inventario", "repon")
        ):
            user.require("inventory:read")
            inventory = await run_in_threadpool(
                app.state.store.inventory, "", True, 200, 0
            )
            return respond(
                {
                    "mode": "verified-read-only",
                    "modelConnected": False,
                    "answer": "Existencias consultadas en la base original; no es una respuesta de IA generativa.",
                    "inventory": inventory,
                }
            )
        return respond(
            {
                "mode": "verified-read-only",
                "modelConnected": False,
                "answer": "La pregunta es abierta, pero aún no hay un modelo de lenguaje conectado. Consulta ventas/reportes con fechas para obtener cifras verificadas; no generaré resultados inventados.",
            }
        )

    return app


app = create_app()
