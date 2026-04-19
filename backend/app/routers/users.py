from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import (
    EmployeeCreateRequest,
    EmployeeCreateResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    SignupRequest,
    SignupResponse,
    UserListItem,
)
from app.security import (
    create_jwt_token,
    generate_temp_password,
    get_current_user,
    hash_password,
    is_admin_user,
    require_admin,
    verify_password,
)

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

ROLE_MAP = {
    "team member": "team_member",
    "team_member": "team_member",
    "employee": "team_member",
    "admin": "admin",
}


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


def _create_user_login_response(user: User) -> LoginResponse:
    normalized_email = str(user.email or "").strip().lower()
    response_role = "admin" if bool(user.is_admin) else str(user.role or "team_member")
    token = create_jwt_token(
        subject=normalized_email,
        expires_delta=timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
        extra_payload={
            "uid": user.id,
            "role": response_role,
            "is_admin": bool(user.is_admin),
            "must_reset_password": bool(user.must_reset_password),
            "company_name": user.company_name,
        },
    )
    return LoginResponse(
        access_token=token,
        user_id=user.id,
        role=response_role,
        is_admin=bool(user.is_admin),
        must_reset_password=bool(user.must_reset_password),
    )


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
async def signup_admin_company(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = payload.admin_email.strip().lower()
    existing_user = await db.execute(select(User).where(User.email == normalized_email))
    if existing_user.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        name=payload.admin_name.strip(),
        role="manager",
        is_admin=True,
        company_name=payload.company_name.strip(),
        company_domain=(payload.company_domain or "").strip().lower() or None,
        email=normalized_email,
        password_hash=hash_password(payload.password),
        must_reset_password=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    login_response = _create_user_login_response(user)
    return SignupResponse(
        access_token=login_response.access_token,
        user_id=user.id,
        name=user.name,
        email=user.email or normalized_email,
        role="admin",
        company_name=user.company_name,
        is_admin=True,
    )


@router.post("/employees", response_model=EmployeeCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    normalized_email = payload.email.strip().lower()

    existing_user = await db.execute(select(User).where(User.email == normalized_email))
    if existing_user.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An employee with this email already exists",
        )

    role = _normalize_role(payload.role)
    create_admin = role == "admin"
    stored_role = "manager" if create_admin else role

    temp_password = generate_temp_password()
    employee = User(
        name=payload.name.strip(),
        role=stored_role,
        is_admin=create_admin,
        email=normalized_email,
        password_hash=hash_password(temp_password),
        must_reset_password=True,
        created_by_id=current_admin.id,
        company_name=current_admin.company_name,
        company_domain=current_admin.company_domain,
    )

    db.add(employee)
    await db.commit()
    await db.refresh(employee)

    return EmployeeCreateResponse(
        user_id=employee.id,
        name=employee.name,
        email=employee.email or normalized_email,
        role="admin" if bool(employee.is_admin) else employee.role,
        temp_password=temp_password,
        must_reset_password=True,
    )


@router.get("/", response_model=list[UserListItem])
async def list_users(
    limit: int = 500,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    safe_limit = max(1, min(limit, 2000))

    stmt = select(User)
    if current_admin.company_name:
        stmt = stmt.where(User.company_name == current_admin.company_name)

    users_result = await db.execute(stmt.order_by(User.name.asc(), User.id.asc()).limit(safe_limit))
    users = users_result.scalars().all()
    return [
        UserListItem(
            id=user.id,
            name=user.name,
            email=user.email,
            role="admin" if bool(user.is_admin) else user.role,
            is_admin=bool(user.is_admin),
            company_name=user.company_name,
            must_reset_password=bool(user.must_reset_password),
        )
        for user in users
    ]


@router.get("/admins", response_model=list[UserListItem])
async def list_admin_users(
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    safe_limit = max(1, min(limit, 1000))

    stmt = select(User).where(User.is_admin.is_(True))
    if current_admin.company_name:
        stmt = stmt.where(User.company_name == current_admin.company_name)

    users_result = await db.execute(stmt.order_by(User.name.asc(), User.id.asc()).limit(safe_limit))
    users = users_result.scalars().all()
    return [
        UserListItem(
            id=user.id,
            name=user.name,
            email=user.email,
            role="admin",
            is_admin=True,
            company_name=user.company_name,
            must_reset_password=bool(user.must_reset_password),
        )
        for user in users
    ]


@router.get("/me", response_model=UserListItem)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserListItem(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role="admin" if bool(current_user.is_admin) else current_user.role,
        is_admin=bool(current_user.is_admin),
        company_name=current_user.company_name,
        must_reset_password=bool(current_user.must_reset_password),
    )


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    normalized_email = payload.email.strip().lower()

    user_result = await db.execute(select(User).where(User.email == normalized_email))
    user = user_result.scalars().first()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return _create_user_login_response(user)


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if payload.old_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_reset_password = False
    await db.commit()

    return PasswordResetResponse(success=True, message="Password reset successful")


@router.get("/bootstrap-status")
async def bootstrap_status(db: AsyncSession = Depends(get_db)):
    has_admin = (
        await db.scalar(select(User.id).where((User.is_admin.is_(True)) | (User.role == "admin")).limit(1))
    ) is not None
    return {"has_admin": has_admin}
