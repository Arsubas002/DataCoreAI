"""RS256 verification only. Tokens must be issued by the configured identity provider."""

from dataclasses import dataclass
import os
from pathlib import Path
import jwt
from fastapi import HTTPException, Request


@dataclass(frozen=True)
class AuthSettings:
    issuer: str = ""
    audience: str = ""
    public_key: str = ""

    @classmethod
    def from_environment(cls):
        path = os.getenv("DATACORE_JWT_PUBLIC_KEY_FILE", "")
        try:
            key = Path(path).read_text(encoding="utf-8") if path else ""
        except (OSError, ValueError):
            key = ""
        return cls(
            os.getenv("DATACORE_JWT_ISSUER", ""),
            os.getenv("DATACORE_JWT_AUDIENCE", ""),
            key,
        )


@dataclass(frozen=True)
class Principal:
    subject: str
    scopes: frozenset[str]

    def require(self, scope: str):
        if scope not in self.scopes:
            raise HTTPException(403, detail={"code": "insufficient_scope"})


def authenticate(request: Request) -> Principal:
    header = request.headers.get("authorization", "")
    if not header.startswith("Bearer ") or not 1 <= len(header[7:]) <= 8192:
        raise HTTPException(
            401,
            detail={"code": "authentication_required"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    settings = request.app.state.auth
    if not all((settings.issuer, settings.audience, settings.public_key)):
        raise HTTPException(503, detail={"code": "authentication_not_configured"})
    try:
        claims = jwt.decode(
            header[7:],
            settings.public_key,
            algorithms=["RS256"],
            issuer=settings.issuer,
            audience=settings.audience,
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
            leeway=5,
        )
        if (
            not isinstance(claims["sub"], str)
            or not claims["sub"]
            or not isinstance(claims.get("scope", ""), str)
            or not isinstance(claims["iat"], (int, float))
            or not isinstance(claims["exp"], (int, float))
            or claims["exp"] <= claims["iat"]
            or claims["exp"] - claims["iat"] > 3600
        ):
            raise ValueError("Invalid token claims")
        return Principal(claims["sub"], frozenset(claims.get("scope", "").split()))
    except (jwt.PyJWTError, ValueError, TypeError, KeyError, OverflowError):
        raise HTTPException(
            401,
            detail={"code": "invalid_token"},
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
