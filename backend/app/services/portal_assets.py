"""Asset upload service for portal backgrounds, logos, and media files."""

import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/svg+xml", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_tenant_dir(tenant_id: str) -> Path:
    d = UPLOAD_DIR / str(tenant_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


async def save_upload(file: UploadFile, tenant_id: str, subfolder: str = "assets") -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed. Allowed: images (JPEG, PNG, GIF, SVG, WebP) and videos (MP4, WebM)")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large ({len(content)} bytes). Max: {MAX_FILE_SIZE} bytes (10MB)")

    ensure_upload_dir()
    tenant_assets = get_tenant_dir(tenant_id) / subfolder
    tenant_assets.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ".bin"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = tenant_assets / filename

    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/{tenant_id}/{subfolder}/{filename}",
        "filename": filename,
        "original_name": file.filename,
        "size": len(content),
        "content_type": file.content_type,
        "mime_category": "image" if file.content_type in ALLOWED_IMAGE_TYPES else "video",
    }


def delete_asset(url_path: str, tenant_id: str) -> bool:
    path = UPLOAD_DIR / url_path.lstrip("/uploads/")
    if path.exists() and path.is_file():
        path.unlink()
        return True
    return False


def get_tenant_assets(tenant_id: str, subfolder: str = "assets") -> list[dict]:
    tenant_assets = get_tenant_dir(tenant_id) / subfolder
    if not tenant_assets.exists():
        return []
    assets = []
    for f in sorted(tenant_assets.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if f.is_file():
            assets.append({
                "url": f"/uploads/{tenant_id}/{subfolder}/{f.name}",
                "filename": f.name,
                "size": f.stat().st_size,
            })
    return assets
