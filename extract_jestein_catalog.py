import os
import re
import csv
import json
import unicodedata
import urllib.request
import urllib.parse
from pathlib import Path

# Configurações de Diretórios
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data" / "jestein"
IMG_DIR = DATA_DIR / "imagens_produtos"

DATA_DIR.mkdir(parents=True, exist_ok=True)
IMG_DIR.mkdir(parents=True, exist_ok=True)

TENANT_ID = "ecdb1224-ce90-4322-b4a2-2d0c60cdeff0"
TENANT_SLUG = "jestein"
STORE_URL = "https://catalogopro.store/api/vitrine/jesteinpersonalizados"

def slugify(text: str) -> str:
    """Gera um slug limpo a partir de um texto em português."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)

def download_image(url: str, dest_path: Path) -> bool:
    """Baixa a imagem com headers adequados."""
    if dest_path.exists() and dest_path.stat().st_size > 0:
        return True
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
        with urllib.request.urlopen(req, timeout=30) as resp, open(dest_path, "wb") as f:
            f.write(resp.read())
        return True
    except Exception as e:
        print(f"Erro ao baixar imagem {url}: {e}")
        return False

def main():
    print(f"Iniciando extração da vitrine: {STORE_URL}")
    req = urllib.request.Request(
        STORE_URL,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw_data = json.loads(resp.read().decode("utf-8"))

    atelie = raw_data.get("atelie", {})
    produtos_raw = raw_data.get("produtos", [])
    print(f"Loja: {atelie.get('nome')} | Slug: {atelie.get('slug')}")
    print(f"Total de produtos encontrados na API: {len(produtos_raw)}")

    categorias_set = set()
    produtos_processados = []
    total_imagens_baixadas = 0

    slug_counts = {}

    for prod in produtos_raw:
        nome = (prod.get("nome") or "Sem Nome").strip()
        base_slug = slugify(nome)
        if base_slug in slug_counts:
            slug_counts[base_slug] += 1
            slug = f"{base_slug}-{slug_counts[base_slug]}"
        else:
            slug_counts[base_slug] = 1
            slug = base_slug

        cat = (prod.get("categoria") or "").strip()
        if not cat and prod.get("categorias"):
            cat = prod["categorias"][0].strip()
        if not cat:
            cat = "Outros"
        categorias_set.add(cat)

        # Download de fotos
        fotos_remotas = prod.get("fotos") or []
        fotos_locais = []

        for idx, foto_url in enumerate(fotos_remotas):
            ext = ".jpg"
            if ".png" in foto_url.lower():
                ext = ".png"
            elif ".webp" in foto_url.lower():
                ext = ".webp"

            img_filename = f"{slug}{f'-{idx+1}' if idx > 0 else ''}{ext}"
            img_dest = IMG_DIR / img_filename

            if download_image(foto_url, img_dest):
                total_imagens_baixadas += 1
                fotos_locais.append(f"/data/jestein/imagens_produtos/{img_filename}")

        # Variações limpas
        variacoes = prod.get("variacoes")
        tem_var = bool(prod.get("tem_variacao") or variacoes)

        produto_estruturado = {
            "id_origem": prod.get("id"),
            "tenant_id": TENANT_ID,
            "tenant_slug": TENANT_SLUG,
            "nome": nome,
            "slug": slug,
            "categoria": cat,
            "todas_categorias": prod.get("categorias") or [cat],
            "preco": float(prod.get("preco") or 0.0),
            "preco_original": float(prod.get("preco_original")) if prod.get("preco_original") else None,
            "descricao": prod.get("descricao") or "",
            "estoque": prod.get("estoque"),
            "ordem": prod.get("ordem", 0),
            "destaque": bool(prod.get("destaque")),
            "sob_encomenda": bool(prod.get("sob_encomenda")),
            "prazo_encomenda": prod.get("prazo_encomenda"),
            "tem_variacao": tem_var,
            "variacoes": variacoes,
            "dimensoes": {
                "peso_kg": float(prod.get("peso") or 0.35),
                "altura_cm": float(prod.get("altura") or 10.0),
                "largura_cm": float(prod.get("largura") or 10.0),
                "comprimento_cm": float(prod.get("comprimento") or 10.0),
            },
            "personalizacao": {
                "ativo": bool(prod.get("personalizar_ativo")),
                "rotulo": prod.get("personalizar_rotulo") or ""
            },
            "codigo_sku": prod.get("codigo_sku") or f"JES-{slug.upper()[:10]}",
            "fotos_remotas": fotos_remotas,
            "fotos_locais": fotos_locais,
            "foto_principal_local": fotos_locais[0] if fotos_locais else None,
            "foto_principal_remota": fotos_remotas[0] if fotos_remotas else None,
        }
        produtos_processados.append(produto_estruturado)

    # 1. Salvar JSON estruturado completo
    json_path = DATA_DIR / "catalogo_jestein.json"
    catalogo_output = {
        "tenant_id": TENANT_ID,
        "tenant_slug": TENANT_SLUG,
        "loja_origem": {
            "nome": atelie.get("nome"),
            "slug": atelie.get("slug"),
            "whatsapp": atelie.get("whatsapp"),
            "instagram": atelie.get("instagram"),
            "logo_url": atelie.get("logo_url"),
            "banner_url": atelie.get("banner_url"),
            "bio": atelie.get("bio")
        },
        "estatisticas": {
            "total_produtos": len(produtos_processados),
            "total_categorias": len(categorias_set),
            "total_imagens": total_imagens_baixadas,
            "categorias": sorted(list(categorias_set))
        },
        "produtos": produtos_processados
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(catalogo_output, f, indent=2, ensure_ascii=False)
    print(f"JSON salvo com sucesso em: {json_path}")

    # 2. Salvar CSV legível e portátil
    csv_path = DATA_DIR / "catalogo_jestein.csv"
    fieldnames = [
        "id_origem",
        "nome",
        "slug",
        "categoria",
        "preco",
        "preco_original",
        "descricao",
        "tem_variacao",
        "variacoes_resumo",
        "prazo_encomenda",
        "peso_kg",
        "altura_cm",
        "largura_cm",
        "comprimento_cm",
        "foto_principal_local",
        "foto_principal_remota",
        "codigo_sku"
    ]

    with open(csv_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=";")
        writer.writeheader()
        for p in produtos_processados:
            var_summary = ""
            if p["variacoes"]:
                var_parts = []
                for v in p["variacoes"]:
                    if isinstance(v, dict):
                        var_parts.append(f"{v.get('nome')}: {v.get('opcoes')}")
                var_summary = " | ".join(var_parts)

            writer.writerow({
                "id_origem": p["id_origem"],
                "nome": p["nome"],
                "slug": p["slug"],
                "categoria": p["categoria"],
                "preco": f"{p['preco']:.2f}",
                "preco_original": f"{p['preco_original']:.2f}" if p["preco_original"] else "",
                "descricao": p["descricao"].replace("\n", " "),
                "tem_variacao": "Sim" if p["tem_variacao"] else "Não",
                "variacoes_resumo": var_summary,
                "prazo_encomenda": p["prazo_encomenda"] or "",
                "peso_kg": p["dimensoes"]["peso_kg"],
                "altura_cm": p["dimensoes"]["altura_cm"],
                "largura_cm": p["dimensoes"]["largura_cm"],
                "comprimento_cm": p["dimensoes"]["comprimento_cm"],
                "foto_principal_local": p["foto_principal_local"] or "",
                "foto_principal_remota": p["foto_principal_remota"] or "",
                "codigo_sku": p["codigo_sku"]
            })
    print(f"CSV salvo com sucesso em: {csv_path}")

    print("\n--- RESUMO DA EXTRAÇÃO ---")
    print(f"Tenant ID: {TENANT_ID} ({TENANT_SLUG})")
    print(f"Total de Categorias: {len(categorias_set)}")
    print(f"Categorias: {', '.join(sorted(list(categorias_set)))}")
    print(f"Total de Produtos: {len(produtos_processados)}")
    print(f"Total de Imagens Baixadas: {total_imagens_baixadas}")

if __name__ == "__main__":
    main()
