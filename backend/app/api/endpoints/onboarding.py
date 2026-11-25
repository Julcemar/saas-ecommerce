from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.onboarding import CheckSlugResponse, OnboardingRequest, OnboardingResponse
from app.services.tenant_service import is_slug_available, create_new_tenant

router = APIRouter(prefix="/onboarding", tags=["Self-Service Onboarding"])


@router.get("/check-slug", response_model=CheckSlugResponse)
async def check_slug_availability(
    slug: str = Query(..., min_length=2, max_length=50),
    db: AsyncSession = Depends(get_db)
):
    """
    Verifica em tempo real se o subdomínio escolhido está disponível.
    """
    clean_slug = slug.strip().lower()
    available = await is_slug_available(db, clean_slug)
    if available:
        message = f"O subdomínio '{clean_slug}' está disponível para sua loja!"
    else:
        message = f"O subdomínio '{clean_slug}' já está em uso ou é um termo reservado."
    return CheckSlugResponse(slug=clean_slug, available=available, message=message)


@router.post("/register", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
async def register_new_store(
    payload: OnboardingRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Cria uma nova loja com tenant isolado, usuário lojista,
    categorias iniciais e banner de boas-vindas Pop-Art.
    """
    return await create_new_tenant(db, payload)
