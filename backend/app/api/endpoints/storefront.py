from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from app.database import get_db
from app.models.storefront import StorefrontBanner
from app.models.tenant import Tenant
from app.models.category import Category
from app.models.user import User
from app.middleware.tenant import get_current_tenant
from app.security.auth import require_auth

router = APIRouter(prefix="/storefront", tags=["Vitrine / Banners"])


class StorefrontBannerUpdate(BaseModel):
    badge_1: Optional[str] = None
    badge_2: Optional[str] = None
    title_prefix: Optional[str] = None
    title_highlight: str
    title_suffix: Optional[str] = None
    description: Optional[str] = None
    btn_1_text: Optional[str] = None
    btn_1_url: Optional[str] = None
    btn_2_text: Optional[str] = None
    btn_2_url: Optional[str] = None
    highlight_1: Optional[str] = None
    highlight_2: Optional[str] = None
    highlight_3: Optional[str] = None
    banner_image_url: str
    config_json: Optional[Dict[str, Any]] = None
    is_active: bool = True


@router.get("/banner")
async def get_active_banner(
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    stmt = (
        select(StorefrontBanner)
        .where(StorefrontBanner.tenant_id == tenant_id, StorefrontBanner.is_active == True)
        .order_by(StorefrontBanner.created_at.desc())
    )
    res = await db.execute(stmt)
    banner = res.scalar_one_or_none()
    if not banner:
        return None
    return banner


@router.put("/banner")
async def save_storefront_banner(
    payload: StorefrontBannerUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a este tenant.")

    stmt = (
        select(StorefrontBanner)
        .where(StorefrontBanner.tenant_id == tenant_id)
        .order_by(StorefrontBanner.created_at.desc())
    )
    res = await db.execute(stmt)
    banner = res.scalar_one_or_none()

    data = payload.model_dump()
    if not banner:
        banner = StorefrontBanner(tenant_id=tenant_id, **data)
        db.add(banner)
    else:
        for key, val in data.items():
            setattr(banner, key, val)

    await db.commit()
    await db.refresh(banner)
    return banner


class NavigationSubItem(BaseModel):
    id: str
    label: str
    type: str = "custom_link"  # "category" | "product" | "custom_link"
    target_id: Optional[str] = None
    url: str


class NavigationItem(BaseModel):
    id: str
    label: str
    type: str = "custom_link"  # "category" | "product" | "custom_link"
    target_id: Optional[str] = None
    url: str
    children: List[NavigationSubItem] = Field(default_factory=list)


class NavigationMenuUpdate(BaseModel):
    items: List[NavigationItem]


@router.get("/navigation")
async def get_navigation_menu(
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna o menu de navegação do topo (2 níveis) para o tenant atual.
    Se ainda não configurado pelo lojista, gera um menu padrão dinâmico baseado nas categorias ativas.
    """
    tenant_id = tenant_dict["id"]
    stmt = select(Tenant).where(Tenant.id == tenant_id)
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()

    if tenant and tenant.settings_json and "navigation_menu" in tenant.settings_json:
        menu_items = tenant.settings_json.get("navigation_menu")
        if isinstance(menu_items, list) and len(menu_items) > 0:
            return menu_items

    # Se não configurado, gera menu padrão baseado nas categorias ativas
    cat_stmt = (
        select(Category)
        .where(Category.tenant_id == tenant_id, Category.is_active == True)
        .order_by(Category.display_order, Category.name)
    )
    cat_res = await db.execute(cat_stmt)
    categories = cat_res.scalars().all()

    default_menu = [
        {
            "id": "nav-all-products",
            "label": "TODOS OS PRODUTOS",
            "type": "custom_link",
            "target_id": None,
            "url": "/#catalogo",
            "children": []
        }
    ]

    for cat in categories:
        default_menu.append({
            "id": f"nav-cat-{cat.id}",
            "label": cat.name.upper(),
            "type": "category",
            "target_id": str(cat.id),
            "url": f"/#catalogo?categoria={cat.slug}",
            "children": []
        })

    default_menu.append({
        "id": "nav-b2b",
        "label": "⚡ ATACADO B2B",
        "type": "custom_link",
        "target_id": None,
        "url": f"https://wa.me/{tenant_dict.get('whatsapp_phone') or '5541997098905'}?text=Olá,%20gostaria%20de%20um%20orçamento%20no%20Atacado%20B2B.",
        "children": []
    })

    return default_menu


@router.put("/navigation")
async def save_navigation_menu(
    payload: NavigationMenuUpdate,
    user: User = Depends(require_auth),
    tenant_dict: Dict[str, Any] = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    """
    Atualiza o menu de navegação do topo (2 níveis) para o tenant autenticado.
    """
    tenant_id = tenant_dict["id"]
    if str(user.tenant_id) != str(tenant_id) and user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Acesso negado a este tenant.")

    stmt = select(Tenant).where(Tenant.id == tenant_id)
    res = await db.execute(stmt)
    tenant = res.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado.")

    settings = dict(tenant.settings_json or {})
    settings["navigation_menu"] = [item.model_dump() for item in payload.items]
    tenant.settings_json = settings
    flag_modified(tenant, "settings_json")

    await db.commit()
    await db.refresh(tenant)

    return {"status": "success", "items": tenant.settings_json.get("navigation_menu", [])}

