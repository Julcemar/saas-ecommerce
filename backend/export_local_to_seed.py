"""
Exporta o banco SQLite local (saas_local.db) e as imagens de backend/uploads/
para backend/seed_data/, permitindo sincronizar todo o catálogo, usuários e
mídias para o PostgreSQL do Dokploy no deploy via Git.

Uso:
    python backend/export_local_to_seed.py
"""
import json
import shutil
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "saas_local.db"
UPLOADS_DIR = BASE_DIR / "uploads"
SEED_DIR = BASE_DIR / "seed_data"
SEED_UPLOADS_DIR = SEED_DIR / "uploads"
SNAPSHOT_PATH = SEED_DIR / "database_snapshot.json"

TABLES_IN_ORDER = [
    "tenants",
    "users",
    "categories",
    "products",
    "product_variants",
    "product_wholesale_tiers",
    "storefront_banners",
    "tenant_integrations",
]


def export_database() -> dict:
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Banco local não encontrado em: {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    existing_tables = {
        row[0]
        for row in cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }

    snapshot = {}
    for table in TABLES_IN_ORDER:
        if table not in existing_tables:
            snapshot[table] = []
            continue
        rows = cur.execute(f"SELECT * FROM {table}").fetchall()
        snapshot[table] = [dict(row) for row in rows]

    conn.close()

    SEED_DIR.mkdir(parents=True, exist_ok=True)
    with open(SNAPSHOT_PATH, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    return snapshot


def export_uploads() -> int:
    if SEED_UPLOADS_DIR.exists():
        shutil.rmtree(SEED_UPLOADS_DIR)
    SEED_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    if not UPLOADS_DIR.exists():
        return 0

    copied = 0
    for src in UPLOADS_DIR.rglob("*"):
        if not src.is_file() or src.name == ".gitkeep":
            continue
        rel = src.relative_to(UPLOADS_DIR)
        dst = SEED_UPLOADS_DIR / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        copied += 1

    return copied


def main():
    snapshot = export_database()
    images_count = export_uploads()

    print("=== Exportação concluída com sucesso ===")
    print(f"Snapshot salvo em: {SNAPSHOT_PATH}")
    for table in TABLES_IN_ORDER:
        print(f"  - {table}: {len(snapshot.get(table, []))} registro(s)")
    print(f"Imagens copiadas para {SEED_UPLOADS_DIR}: {images_count} arquivo(s)")


if __name__ == "__main__":
    main()
