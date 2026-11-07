"""Controles locales demo; no representan autenticación de usuarios reales."""

from collections import OrderedDict
from dataclasses import dataclass
import logging
from threading import Lock
import time
from uuid import uuid4
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.responses import JSONResponse

log = logging.getLogger("datacore.api.audit")
bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant: str
    scopes: frozenset[str]
    authenticated: bool = False


def demo_principal(
    request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)
) -> Principal:
    if request.headers.get("authorization") is not None:
        raise HTTPException(
            401,
            "La autenticación de producción no está habilitada.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Exclusivamente fixtures públicos: no interpreta tenant/user enviados por el cliente.
    return Principal(
        "anonymous-demo", "sample-only", frozenset({"demo:read", "demo:preview"})
    )


def authorize(scope: str):
    def check(principal: Principal = Depends(demo_principal)) -> Principal:
        if scope not in principal.scopes:
            raise HTTPException(403, "Operación no permitida.")
        return principal

    return check


class RateLimiter:
    """Ventana fija, memoria acotada; deniega nuevos clientes si se llena."""

    def __init__(self, limit=60, window=60, capacity=1024, clock=time.monotonic):
        self.limit, self.window, self.capacity, self.clock = (
            limit,
            window,
            capacity,
            clock,
        )
        self.clients = OrderedDict()
        self.lock = Lock()

    def allow(self, client: str) -> bool:
        now = self.clock()
        with self.lock:
            while (
                self.clients
                and now - next(iter(self.clients.values()))[0] >= self.window
            ):
                self.clients.popitem(last=False)
            if client not in self.clients:
                if len(self.clients) >= self.capacity:
                    return False
                self.clients[client] = [now, 0]
            entry = self.clients[client]
            if entry[1] >= self.limit:
                return False
            entry[1] += 1
            return True


class SafetyMiddleware:
    """No registra cuerpos, IP, queries, tokens ni rutas que incluyan entradas."""

    def __init__(self, app, limiter: RateLimiter, max_body=32768):
        self.app, self.limiter, self.max_body = app, limiter, max_body

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        request_id = str(uuid4())
        status = 500
        response_started = False

        async def safe_send(message):
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                status = message["status"]
                response_started = True
                headers = list(message.get("headers", []))
                headers.extend(
                    [
                        (b"cache-control", b"no-store"),
                        (b"x-content-type-options", b"nosniff"),
                        (b"x-frame-options", b"DENY"),
                        (b"x-request-id", request_id.encode()),
                    ]
                )
                message = {**message, "headers": headers}
            await send(message)

        async def reject(code, text, headers=None):
            await JSONResponse({"detail": text}, status_code=code, headers=headers)(
                scope, receive, safe_send
            )

        try:
            client = scope.get("client")
            if not self.limiter.allow(client[0] if client else "unknown"):
                return await reject(
                    429, "Límite de solicitudes alcanzado.", {"Retry-After": "60"}
                )
            size, chunks = 0, []
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                size += len(chunk)
                if size > self.max_body:
                    return await reject(413, "Solicitud demasiado grande.")
                chunks.append(chunk)
                if not message.get("more_body", False):
                    break
            replayed = False

            async def replay():
                nonlocal replayed
                if replayed:
                    return await receive()
                replayed = True
                return {
                    "type": "http.request",
                    "body": b"".join(chunks),
                    "more_body": False,
                }

            await self.app(scope, replay, safe_send)
        except Exception:
            # No exception repr/traceback or request content leaves this boundary.
            if not response_started:
                await reject(500, "No fue posible procesar la solicitud.")
            else:
                raise RuntimeError("Respuesta interrumpida.") from None
        finally:
            route = scope.get("route")
            template = getattr(route, "path", "unmatched")
            log.info(
                "request=%s method=%s route=%s status=%s",
                request_id,
                scope.get("method", "unknown"),
                template,
                status,
            )
