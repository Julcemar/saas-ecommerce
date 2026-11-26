import os
import re
import uuid
import shutil
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends, status
from app.config import settings
from app.middleware.tenant import get_optional_tenant

router = APIRouter(prefix="/uploads", tags=["Uploads & Mídia"])

ALLOWED_FOLDERS = {"products", "categories", "banners", "logos", "orders", "custom_uploads", "general", "artwork"}
ALLOWED_EXTS = {"png", "jpg", "jpeg", "svg", "pdf", "webp", "ai", "cdr"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Query("general", description="Subpasta isolada: products, categories, orders, banners, logos, general"),
    order_id: Optional[str] = Query(None, description="ID do pedido para isolamento em /storage/{tenant_id}/orders/{order_id}/"),
    tenant_dict: Optional[Dict[str, Any]] = Depends(get_optional_tenant),
):
    """
    Recebe upload de imagem ou arquivo de personalização.
    Isola os arquivos por tenant_id em /uploads/storage/{tenant_id}/{folder}/ (e /{order_id} quando aplicável).
    """
    safe_folder = folder.strip().lower()
    if safe_folder not in ALLOWED_FOLDERS:
        safe_folder = "general"

    filename = file.filename or "file.bin"
    clean_name = re.sub(r"[^a-zA-Z0-9._-]", "_", os.path.basename(filename))
    ext = clean_name.split(".")[-1].lower() if "." in clean_name else "bin"

    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão .{ext} não permitida. Formatos aceitos: {', '.join(sorted(ALLOWED_EXTS))}"
        )

    unique_filename = f"{uuid.uuid4().hex}_{clean_name}"

    if tenant_dict and tenant_dict.get("id"):
        tenant_id = str(tenant_dict["id"])
        if safe_folder == "orders" and order_id:
            clean_oid = re.sub(r"[^a-zA-Z0-9-]", "", order_id)
            rel_dir = os.path.join("storage", tenant_id, "orders", clean_oid)
            url_prefix = f"/api/uploads/static/storage/{tenant_id}/orders/{clean_oid}"
        else:
            rel_dir = os.path.join("storage", tenant_id, safe_folder)
            url_prefix = f"/api/uploads/static/storage/{tenant_id}/{safe_folder}"
    else:
        rel_dir = safe_folder
        url_prefix = f"/api/uploads/static/{safe_folder}"

    target_dir = os.path.join(settings.UPLOAD_DIR, rel_dir)
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"{url_prefix}/{unique_filename}"

    return {
        "filename": filename,
        "saved_filename": unique_filename,
        "url": file_url,
        "size_bytes": os.path.getsize(file_path),
    }
