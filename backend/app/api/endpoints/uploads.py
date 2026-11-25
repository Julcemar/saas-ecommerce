import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.config import settings

router = APIRouter(prefix="/uploads", tags=["Uploads & Mídia"])


@router.post("")
async def upload_file(file: UploadFile = File(...)):
    """
    Recebe upload de imagem ou arquivo de personalização (arte/vetor/foto).
    Valida tamanho e extensão, salvando no disco de uploads.
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    filename = file.filename or "file.bin"
    ext = filename.split(".")[-1].lower() if "." in filename else "bin"

    allowed_exts = {"png", "jpg", "jpeg", "svg", "pdf", "webp", "ai", "cdr"}
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão .{ext} não permitida. Formatos aceitos: {', '.join(allowed_exts)}"
        )

    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/api/uploads/static/{unique_filename}"

    return {
        "filename": filename,
        "saved_filename": unique_filename,
        "url": file_url,
        "size_bytes": os.path.getsize(file_path)
    }
