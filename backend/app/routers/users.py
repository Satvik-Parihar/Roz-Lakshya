import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, LoginResponse, SignupRequest, SignupResponse

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

HARDCODED_EMAIL = "admin@gmail.com"
HARDCODED_PASSWORD = "admin123"

ROLE_MAP = {
    "team member": "team_member",
    "team_member": "team_member",
    "manager": "manager",
    "subject teacher": "teacher",
    "teacher": "teacher",
}


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


def _normalize_role(raw_role: str) -> str:
    role_key = (raw_role or "").strip().lower().replace("-", " ").replace("_", " ")
    normalized = ROLE_MAP.get(role_key)
    if normalized is None:
        allowed_roles = ", ".join(sorted(set(ROLE_MAP.values())))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role. Allowed roles: {allowed_roles}",
        )
    return normalized


def _hash_password(password: str) -> str:
    iterations = 200_000
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    salt_b64 = base64.urlsafe_b64encode(salt).decode("utf-8")
    hash_b64 = base64.urlsafe_b64encode(derived).decode("utf-8")
    return f"pbkdf2_sha256${iterations}${salt_b64}${hash_b64}"


def _verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iter_text, salt_b64, hash_b64 = stored_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iter_text)
        salt = base64.urlsafe_b64decode(salt_b64.encode("utf-8"))
        expected = base64.urlsafe_b64decode(hash_b64.encode("utf-8"))
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(candidate, expected)
    except Exception:
        return False


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = payload.email.strip().lower()

    existing_user = await db.execute(select(User).where(User.email == normalized_email))
    if existing_user.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.name.strip(),
        role=_normalize_role(payload.role),
        email=normalized_email,
        password_hash=_hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = _create_jwt_token(
        subject=normalized_email,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return SignupResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email or normalized_email,
        role=user.role,
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = payload.email.strip().lower()

    user_result = await db.execute(select(User).where(User.email == normalized_email))
    user = user_result.scalars().first()

    if user and user.password_hash and _verify_password(payload.password, user.password_hash):
        token = _create_jwt_token(
            subject=normalized_email,
            expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        )
        return LoginResponse(access_token=token)

    # Temporary fallback for seeded/demo access.
    if normalized_email != HARDCODED_EMAIL or payload.password != HARDCODED_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = _create_jwt_token(
        subject=normalized_email,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return LoginResponse(access_token=token)
