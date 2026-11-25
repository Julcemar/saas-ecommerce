import re
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.tenant import Tenant
from app.models.user import User
from app.models.category import Category
from app.models.product import Product, ProductWholesaleTier
from app.models.storefront import StorefrontBanner
from app.schemas.onboarding import OnboardingRequest
from app.security.auth import get_password_hash, create_access_token
from app.config import settings

# Slugs reservados da plataforma
RESERVED_SLUGS = {
    "admin", "api", "app", "dashboard", "superadmin", "system",
    "caddy", "login", "register", "onboarding", "static", "assets",
    "www", "mail", "internal", "webhook", "help", "suporte"
}


async def is_slug_available(db: AsyncSession, slug: str) -> bool:
    slug = slug.strip().lower()
    if slug in RESERVED_SLUGS:
        return False
    if not re.match(r"^[a-z0-9-]+$", slug):
        return False
    stmt = select(Tenant).where(Tenant.slug == slug)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is None


async def create_new_tenant(db: AsyncSession, req: OnboardingRequest) -> Dict[str, Any]:
    slug = req.slug.strip().lower()

    if not await is_slug_available(db, slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O subdomínio '{slug}' já está em uso ou é reservado pelo sistema."
        )

    # 1. Cria o Tenant
    tenant = Tenant(
        name=req.store_name,
        slug=slug,
        primary_color=req.primary_color,
        secondary_color=req.secondary_color,
        settings_json={
            "currency": "BRL",
            "tax_rate": 0,
            "free_shipping_min_amount": 199.00,
            "whatsapp_phone": req.whatsapp_phone or "",
            "b2b_cta_enabled": True
        },
        is_active=True
    )
    db.add(tenant)
    await db.flush()

    # 2. Cria o Usuário Lojista (tenant_owner)
    user = User(
        tenant_id=tenant.id,
        name=req.owner_name,
        email=req.owner_email,
        password_hash=get_password_hash(req.owner_password),
        role="tenant_owner",
        is_active=True
    )
    db.add(user)
    await db.flush()

    # 3. Cria Categorias Padrão (conforme o BLUEPRINT.md)
    default_categories = [
        {"name": "Canecas", "slug": "canecas", "description": "Canecas de cerâmica, polímero e mágicas", "display_order": 1},
        {"name": "Camisetas", "slug": "camisetas", "description": "Camisetas personalizadas 100% algodão e dry-fit", "display_order": 2},
        {"name": "Canetas & Laser", "slug": "canetas-e-laser", "description": "Gravação a laser em metais e madeira", "display_order": 3},
        {"name": "Kits Corporativos", "slug": "kits-corporativos", "description": "Kits de boas-vindas para eventos e empresas", "display_order": 4},
        {"name": "Squeezes & Térmicas", "slug": "squeezes-e-termicas", "description": "Garrafas e squeezes de alta resistência", "display_order": 5},
    ]
    created_cats = []
    for cat_data in default_categories:
        cat = Category(
            tenant_id=tenant.id,
            name=cat_data["name"],
            slug=cat_data["slug"],
            description=cat_data["description"],
            display_order=cat_data["display_order"],
            is_active=True
        )
        db.add(cat)
        created_cats.append(cat)
    await db.flush()

    # 4. Cria Produtos Exemplo com Atacado Progressivo e Personalização
    p1 = Product(
        tenant_id=tenant.id,
        category_id=created_cats[0].id,
        name="Caneca de Cerâmica Pop-Art Personalizada",
        slug="caneca-de-ceramica-pop-art-personalizada",
        sku="CAN-POP-001",
        base_price=39.90,
        compare_at_price=49.90,
        badge_label="Mais Vendido",
        is_featured=True,
        description="Caneca premium resinada para alta definição com acabamento brilhante impecável. Ideal para brindes corporativos e presentes únicos.",
        short_description="Cerâmica AAA 325ml com impressão de alta resolução",
        weight_grams=350,
        enable_text_customization=True,
        text_customization_label="Nome ou Frase para Gravação",
        text_max_length=40,
        enable_artwork_upload=True,
        upload_max_size_mb=10,
        production_lead_time_days=3,
        image_url="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80"
    )
    db.add(p1)
    await db.flush()

    # Faixas de atacado progressivo conforme o BLUEPRINT.md
    t1 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p1.id, min_quantity=1, unit_price=39.90)
    t2 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p1.id, min_quantity=4, unit_price=34.90)
    t3 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p1.id, min_quantity=36, unit_price=29.90)
    db.add_all([t1, t2, t3])

    p2 = Product(
        tenant_id=tenant.id,
        category_id=created_cats[1].id,
        name="Camiseta 100% Algodão com Estampa Digital",
        slug="camiseta-100-algodao-estampa-digital",
        sku="CAM-ALG-002",
        base_price=59.90,
        compare_at_price=79.90,
        badge_label="HOT",
        is_featured=True,
        description="Camiseta fio 30.1 penteado com toque macio e estampa direta no tecido (DTG) que não desbota.",
        short_description="Algodão Penteado 30.1 com acabamento reforçado",
        weight_grams=200,
        enable_text_customization=True,
        text_customization_label="Texto na Frente ou Costas",
        text_max_length=50,
        enable_artwork_upload=True,
        upload_max_size_mb=20,
        production_lead_time_days=4,
        image_url="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80"
    )
    db.add(p2)
    await db.flush()

    t2_1 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p2.id, min_quantity=1, unit_price=59.90)
    t2_2 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p2.id, min_quantity=10, unit_price=49.90)
    t2_3 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p2.id, min_quantity=50, unit_price=39.90)
    db.add_all([t2_1, t2_2, t2_3])

    p3 = Product(
        tenant_id=tenant.id,
        category_id=created_cats[3].id,
        name="Kit Boas-Vindas Corporativo Premium",
        slug="kit-boas-vindas-corporativo-premium",
        sku="KIT-CORP-003",
        base_price=129.90,
        compare_at_price=159.90,
        badge_label="Kit Corporativo",
        is_featured=True,
        description="Composto por Caderno executivo, caneta metálica gravada a laser e squeeze térmico inox em caixa rígida personalizada.",
        short_description="Kit Onboarding completo para novos colaboradores",
        weight_grams=850,
        enable_text_customization=True,
        text_customization_label="Nome do Colaborador / Cargo",
        text_max_length=60,
        enable_artwork_upload=True,
        upload_max_size_mb=30,
        production_lead_time_days=5,
        image_url="https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=600&auto=format&fit=crop&q=80"
    )
    db.add(p3)
    await db.flush()

    t3_1 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p3.id, min_quantity=1, unit_price=129.90)
    t3_2 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p3.id, min_quantity=10, unit_price=109.90)
    t3_3 = ProductWholesaleTier(tenant_id=tenant.id, product_id=p3.id, min_quantity=30, unit_price=94.90)
    db.add_all([t3_1, t3_2, t3_3])

    # 5. Cria Banner Inicial Pop-Art
    banner = StorefrontBanner(
        tenant_id=tenant.id,
        badge_1="⚡ ENVIO PARA TODO O BRASIL",
        badge_2="🔥 DESCONTOS PROGRESSIVOS NO ATACADO",
        title_prefix="SEUS PRODUTOS",
        title_highlight="PERSONALIZADOS",
        title_suffix="COM ALTO PADRÃO & IMPACTO",
        description="Canecas, camisetas, brindes corporativos e itens exclusivos produzidos com tecnologia de ponta para empresas e eventos.",
        btn_1_text="VER CATÁLOGO COMPLETO",
        btn_1_url="#catalogo",
        btn_2_text="SOLICITAR COTAÇÃO B2B",
        btn_2_url=f"https://wa.me/{req.whatsapp_phone or '5511999999999'}",
        highlight_1="Gravação a laser e estampa ultra HD",
        highlight_2="Tabela de atacado direto no carrinho",
        highlight_3="Aprovação digital rápida antes da produção",
        banner_image_url="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80",
        is_active=True
    )
    db.add(banner)

    await db.commit()

    # Gera token de acesso
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "tenant_id": str(tenant.id)
    })

    main_domain = settings.MAIN_DOMAINS[0]
    store_url = f"http://{slug}.{main_domain}"
    admin_url = f"http://{slug}.{main_domain}/admin"

    return {
        "tenant_id": tenant.id,
        "tenant_name": tenant.name,
        "tenant_slug": tenant.slug,
        "store_url": store_url,
        "admin_url": admin_url,
        "access_token": access_token,
        "user_id": user.id,
        "message": "Loja criada com sucesso! Você já pode acessar seu painel administrativo."
    }
