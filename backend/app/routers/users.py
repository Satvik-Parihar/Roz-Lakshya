import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import LoginRequest, LoginResponse

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

HARDCODED_EMAIL = "admin@gmail.com"
HARDCODED_PASSWORD = "admin123"


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _create_jwt_token(subject: str, expires_delta: timedelta) -> str:
    if settings.JWT_ALGORITHM != "HS256":
        raise HTTPException(status_code=500, detail="Unsupported JWT algorithm")

    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    header = {"alg": "HS256", "typ": "JWT"}

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    signature = hmac.new(
        settings.JWT_SECRET_KEY.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()
    signature_b64 = _b64url_encode(signature)
    return f"{header_b64}.{payload_b64}.{signature_b64}"


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    if payload.email.lower() != HARDCODED_EMAIL or payload.password != HARDCODED_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = _create_jwt_token(
        subject=payload.email.lower(),
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return LoginResponse(access_token=token)
