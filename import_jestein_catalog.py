import os
import re
import json
import uuid
import shutil
import sqlite3
import unicodedata
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "jestein"
IMG_SOURCE_DIR = DATA_DIR / "imagens_produtos"
JSON_FILE = DATA_DIR / "catalogo_jestein.json"

FRONTEND_UPLOADS = BASE_DIR / "frontend" / "public" / "uploads" / "jestein"
BACKEND_UPLOADS = BASE_DIR / "backend" / "uploads" / "jestein"

FRONTEND_UPLOADS.mkdir(parents=True, exist_ok=True)
BACKEND_UPLOADS.mkdir(parents=True, exist_ok=True)

DB_PATHS = [
    BASE_DIR / "backend" / "saas_local.db",
    BASE_DIR / "saas_local.db",
]

TENANT_ID = "ecdb1224-ce90-4322-b4a2-2d0c60cdeff0"
TENANT_SLUG = "jestein"

def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)

def copy_images():
    print(f"Copiando imagens de {IMG_SOURCE_DIR} para as pastas de uploads...")
    count = 0
    if IMG_SOURCE_DIR.exists():
        for img in IMG_SOURCE_DIR.glob("*"):
            if img.is_file():
                shutil.copy2(img, FRONTEND_UPLOADS / img.name)
                shutil.copy2(img, BACKEND_UPLOADS / img.name)
                count += 1
    print(f"Total de {count} imagens copiadas para frontend e backend.")

def import_to_db(db_path: Path, data: dict):
    if not db_path.exists():
        print(f"Aviso: Banco não encontrado em {db_path}")
        return

    print(f"\n--- Importando para o banco: {db_path} ---")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Validação estrita do Tenant
    cur.execute("SELECT id, name, slug FROM tenants WHERE id = ?", (TENANT_ID,))
    tenant = cur.fetchone()
    if not tenant:
        conn.close()
        raise RuntimeError(f"ERRO CRÍTICO: Tenant ID {TENANT_ID} não existe em {db_path}!")

    print(f"Tenant validado: {tenant[1]} ({tenant[2]}) | ID: {tenant[0]}")

    produtos = data.get("produtos", [])
    categorias_origem = data.get("estatisticas", {}).get("categorias", [])

    # 1. Importação / Sincronização de Categorias
    cat_mapping = {}
    for idx, cat_name in enumerate(categorias_origem):
        cat_slug = slugify(cat_name)

        cur.execute(
            "SELECT id FROM categories WHERE tenant_id = ? AND (slug = ? OR name = ?)",
            (TENANT_ID, cat_slug, cat_name)
        )
        existing = cur.fetchone()

        if existing:
            cat_id = existing[0]
            cur.execute(
                "UPDATE categories SET name = ?, display_order = ?, updated_at = datetime('now') WHERE id = ?",
                (cat_name, idx * 10, cat_id)
            )
        else:
            cat_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO categories (id, tenant_id, name, slug, display_order, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (cat_id, TENANT_ID, cat_name, cat_slug, idx * 10)
            )
        cat_mapping[cat_name] = cat_id

    print(f"Categorias sincronizadas: {len(cat_mapping)}")

    # 2. Importação / Sincronização de Produtos
    produtos_inseridos = 0
    produtos_atualizados = 0
    variacoes_inseridas = 0
    tiers_inseridos = 0

    for p in produtos:
        slug = p["slug"]
        nome = p["nome"]
        cat_name = p["categoria"]
        cat_id = cat_mapping.get(cat_name)

        preco_base = float(p.get("preco") or 0.0)
        preco_comp = float(p.get("preco_original")) if p.get("preco_original") else None
        desc = p.get("descricao") or ""

        # Imagem principal
        foto_local = p.get("foto_principal_local")
        if foto_local:
            img_filename = Path(foto_local).name
            image_url = f"/uploads/jestein/{img_filename}"
        else:
            image_url = p.get("foto_principal_remota")

        # Dimensões
        dim = p.get("dimensoes") or {}
        peso_g = int(dim.get("peso_kg", 0.35) * 1000)
        altura_cm = int(dim.get("altura_cm", 10))
        largura_cm = int(dim.get("largura_cm", 10))
        comprimento_cm = int(dim.get("comprimento_cm", 10))

        # Personalização
        pers = p.get("personalizacao") or {}
        enable_text = 1 if pers.get("ativo") else 0
        text_label = pers.get("rotulo") or "Nome ou Frase para Personalizar"

        tem_var = p.get("tem_variacao", False)
        prod_type = "variable" if tem_var else "simple"
        badge = "DESTAQUE" if p.get("destaque") else ("PERSONALIZADO" if enable_text else None)

        sku = p.get("codigo_sku") or f"JES-{slug.upper()[:10]}"

        # Prazo de produção
        lead_time = 5
        prazo_txt = p.get("prazo_encomenda") or ""
        prazo_match = re.search(r"(\d+)", prazo_txt)
        if prazo_match:
            lead_time = int(prazo_match.group(1))

        # Verifica existência
        cur.execute("SELECT id FROM products WHERE tenant_id = ? AND slug = ?", (TENANT_ID, slug))
        existing_prod = cur.fetchone()

        if existing_prod:
            product_id = existing_prod[0]
            cur.execute(
                """
                UPDATE products SET
                    category_id = ?,
                    name = ?,
                    sku = ?,
                    product_type = ?,
                    description = ?,
                    base_price = ?,
                    compare_at_price = ?,
                    image_url = ?,
                    weight_grams = ?,
                    length_cm = ?,
                    width_cm = ?,
                    height_cm = ?,
                    badge_label = ?,
                    is_featured = ?,
                    is_active = 1,
                    enable_text_customization = ?,
                    text_customization_label = ?,
                    text_max_length = 40,
                    enable_artwork_upload = 1,
                    upload_max_size_mb = 10,
                    allowed_upload_formats = '["png","jpg","jpeg","svg","pdf"]',
                    production_lead_time_days = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (
                    cat_id, nome, sku, prod_type, desc, preco_base, preco_comp, image_url,
                    peso_g, comprimento_cm, largura_cm, altura_cm, badge, 1 if p.get("destaque") else 0,
                    enable_text, text_label, lead_time, product_id
                )
            )
            produtos_atualizados += 1
        else:
            product_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO products (
                    id, tenant_id, category_id, name, slug, sku, product_type,
                    description, base_price, compare_at_price, image_url,
                    weight_grams, length_cm, width_cm, height_cm,
                    badge_label, is_featured, is_active,
                    enable_text_customization, text_customization_label, text_max_length,
                    enable_artwork_upload, upload_max_size_mb, allowed_upload_formats,
                    production_lead_time_days, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, 1,
                    ?, ?, 40,
                    1, 10, '["png","jpg","jpeg","svg","pdf"]',
                    ?, datetime('now'), datetime('now')
                )
                """,
                (
                    product_id, TENANT_ID, cat_id, nome, slug, sku, prod_type,
                    desc, preco_base, preco_comp, image_url,
                    peso_g, comprimento_cm, largura_cm, altura_cm,
                    badge, 1 if p.get("destaque") else 0,
                    enable_text, text_label,
                    lead_time
                )
            )
            produtos_inseridos += 1

        # 3. Tiers de Atacado (10+, 50+, 100+)
        cur.execute("DELETE FROM product_wholesale_tiers WHERE product_id = ?", (product_id,))
        if preco_base > 0:
            tiers = [
                (10, round(preco_base * 0.90, 2)),
                (50, round(preco_base * 0.82, 2)),
                (100, round(preco_base * 0.75, 2)),
            ]
            for min_q, unit_p in tiers:
                tier_id = str(uuid.uuid4())
                cur.execute(
                    """
                    INSERT INTO product_wholesale_tiers (id, tenant_id, product_id, min_quantity, unit_price, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """,
                    (tier_id, TENANT_ID, product_id, min_q, unit_p)
                )
                tiers_inseridos += 1

        # 4. Variações do Produto (se houver)
        cur.execute("DELETE FROM product_variants WHERE product_id = ?", (product_id,))
        raw_vars = p.get("variacoes")
        if raw_vars and isinstance(raw_vars, list):
            for var_group in raw_vars:
                if not isinstance(var_group, dict):
                    continue
                var_name = var_group.get("nome") or "Variação"
                precos_map = var_group.get("precos") or {}
                opcoes_raw = var_group.get("opcoes") or ""

                if isinstance(opcoes_raw, str):
                    opcoes_list = [o.strip() for o in opcoes_raw.split(",") if o.strip()]
                elif isinstance(opcoes_list, list):
                    opcoes_list = opcoes_raw
                else:
                    opcoes_list = []

                for opt in opcoes_list:
                    var_id = str(uuid.uuid4())
                    opt_preco = float(precos_map.get(opt, preco_base))
                    var_sku = f"{sku}-{slugify(opt).upper()}"
                    cur.execute(
                        """
                        INSERT INTO product_variants (
                            id, tenant_id, product_id, sku, name, attribute_options,
                            price_modifier, final_price, is_active, created_at, updated_at
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, 1, datetime('now'), datetime('now')
                        )
                        """,
                        (
                            var_id, TENANT_ID, product_id, var_sku,
                            f"{nome} - {var_name}: {opt}",
                            json.dumps({var_name: opt}),
                            round(opt_preco - preco_base, 2),
                            opt_preco
                        )
                    )
                    variacoes_inseridas += 1

    conn.commit()
    conn.close()

    print(f"Sucesso em {db_path}:")
    print(f" - Produtos Inseridos: {produtos_inseridos}")
    print(f" - Produtos Atualizados: {produtos_atualizados}")
    print(f" - Total Produtos no Banco: {produtos_inseridos + produtos_atualizados}")
    print(f" - Faixas de Atacado Criadas: {tiers_inseridos}")
    print(f" - Variações Criadas: {variacoes_inseridas}")

def main():
    if not JSON_FILE.exists():
        raise FileNotFoundError(f"Arquivo de catálogo não encontrado: {JSON_FILE}")

    with open(JSON_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    copy_images()

    for db_path in DB_PATHS:
        import_to_db(db_path, data)

    print("\n✅ IMPORTAÇÃO COMPLETA FINALIZADA COM SUCESSO!")

if __name__ == "__main__":
    main()
