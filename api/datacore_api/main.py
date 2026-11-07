"""Ejecutar solo localmente: python -m uvicorn api.datacore_api.main:app ..."""

from datetime import date
import os
from typing import Annotated, Literal
from fastapi import Depends, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .models import (
    Answer,
    AssistantRequest,
    Product,
    Report,
    Sale,
    SalePreview,
    SalePreviewRequest,
    Snapshot,
    Summary,
)
from .repository import DemoRepository, DemoRuleError, validate_period
from .security import RateLimiter, SafetyMiddleware, authorize


def create_app(
    *, mode: str | None = None, limiter: RateLimiter | None = None
) -> FastAPI:
    if (mode if mode is not None else os.getenv("DATACORE_API_MODE", "demo")) != "demo":
        raise RuntimeError(
            "Solo está implementado el adaptador demo; producción deshabilitada."
        )
    repository = DemoRepository()
    api = FastAPI(
        title="DataCore AI · Demo API",
        version="1.0.0-demo",
        debug=False,
        description="Solo datos ficticios. Sin SQL, Groq, cuentas ni escrituras de producción.",
    )
    api.add_middleware(SafetyMiddleware, limiter=limiter or RateLimiter())
    api.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "[::1]", "testserver"],
    )

    @api.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": "Solicitud inválida. Revisa el contrato OpenAPI."},
        )

    @api.exception_handler(DemoRuleError)
    async def rule_error(request: Request, error: DemoRuleError):
        return JSONResponse(status_code=422, content={"detail": str(error)})

    @api.exception_handler(Exception)
    async def internal_error(request: Request, error: Exception):
        return JSONResponse(
            status_code=500,
            content={"detail": "No fue posible procesar la solicitud."},
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )

    def period(
        start: date = date(2026, 11, 1), end: date = date(2026, 11, 7)
    ) -> tuple[date, date]:
        validate_period(start, end)
        return start, end

    read = [Depends(authorize("demo:read"))]

    @api.get("/health", tags=["diagnóstico"])
    def health():
        return {"status": "ok", "mode": "demo", "production_enabled": False}

    @api.get("/v1/snapshot", response_model=Snapshot, dependencies=read)
    def snapshot():
        return repository.snapshot()

    @api.get("/v1/dashboard", response_model=Summary, dependencies=read)
    def dashboard(dates: Annotated[tuple[date, date], Depends(period)]):
        return repository.summary(*dates)

    @api.get("/v1/products", response_model=tuple[Product, ...], dependencies=read)
    def products(
        q: str = Query("", max_length=120),
        category: str | None = Query(None, max_length=80),
    ):
        return repository.products(q, category)

    @api.get("/v1/inventory", response_model=tuple[Product, ...], dependencies=read)
    def inventory(state: Literal["all", "low", "out"] = "all"):
        return tuple(
            p
            for p in repository.products()
            if state == "all"
            or (state == "out" and p.stock == 0)
            or (state == "low" and p.stock <= p.minimum_stock)
        )

    @api.get("/v1/sales", response_model=tuple[Sale, ...], dependencies=read)
    def sales(dates: Annotated[tuple[date, date], Depends(period)]):
        start, end = dates
        return tuple(s for s in repository.snapshot().sales if start <= s.day <= end)

    @api.post(
        "/v1/sales/preview",
        response_model=SalePreview,
        dependencies=[Depends(authorize("demo:preview"))],
    )
    def preview(body: SalePreviewRequest):
        return repository.preview(body)

    @api.get("/v1/reports", response_model=Report, dependencies=read)
    def reports(dates: Annotated[tuple[date, date], Depends(period)]):
        return repository.report(*dates)

    @api.post("/v1/assistant", response_model=Answer, dependencies=read)
    def assistant(body: AssistantRequest):
        return repository.answer(body)

    return api


app = create_app()
