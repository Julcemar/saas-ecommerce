from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.schemas.user import UserLogin, TokenResponse, UserResponse
from app.security.auth import verify_password, create_access_token, require_auth

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(User).where(User.email == credentials.email, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )

    # Busca o slug do tenant do usuário
    tenant_slug = None
    if user.tenant_id:
        t_stmt = select(Tenant).where(Tenant.id == user.tenant_id)
        tenant = (await db.execute(t_stmt)).scalar_one_or_none()
        if tenant:
            tenant_slug = tenant.slug

    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        "tenant_slug": tenant_slug
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        tenant_slug=tenant_slug,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(user: User = Depends(require_auth)):
    return UserResponse.model_validate(user)
