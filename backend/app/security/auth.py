import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.customer import Customer
from app.middleware.tenant import get_current_tenant

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
CUSTOMER_COOKIE_NAME = "saas_customer_token"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha utilizando bcrypt direto."""
    if not plain_password or not hashed_password:
        return False
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.strip().encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Gera hash seguro bcrypt (compatível com todas as versões)."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """Autenticação estrita de usuário administrativo (rejeita tokens de cliente da vitrine)."""
    if not token:
        return None

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou sessão expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        # Isolamento estrito: token de cliente jamais acessa rotas administrativas
        if payload.get("token_type") == "customer" or payload.get("role") == "CUSTOMER":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    stmt = select(User).where(User.id == user_id, User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception
    return user


async def require_auth(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação obrigatória"
        )
    return user


def _extract_customer_token(request: Request, bearer_token: Optional[str]) -> Optional[str]:
    """Extrai o token do cliente via cookie HttpOnly ou header Authorization Bearer."""
    cookie_token = request.cookies.get(CUSTOMER_COOKIE_NAME)
    if cookie_token:
        return cookie_token
    if bearer_token:
        return bearer_token
    return None


async def get_optional_customer(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db),
) -> Optional[Customer]:
    """Retorna o cliente autenticado na vitrine do tenant atual, ou None se não autenticado/inválido."""
    token = _extract_customer_token(request, bearer_token)
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None

    # Isolamento estrito: apenas tokens de cliente do tenant atual são aceitos
    if payload.get("token_type") != "customer" or payload.get("role") != "CUSTOMER":
        return None

    token_tenant_id = payload.get("tenant_id")
    customer_id = payload.get("sub")
    if not token_tenant_id or not customer_id or str(token_tenant_id) != str(tenant_dict["id"]):
        return None

    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == tenant_dict["id"],
        Customer.is_active == True,
    )
    return (await db.execute(stmt)).scalar_one_or_none()


async def require_customer(
    customer: Optional[Customer] = Depends(get_optional_customer),
) -> Customer:
    """Exige cliente autenticado na vitrine do tenant atual."""
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Faça login na sua conta para continuar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return customer
