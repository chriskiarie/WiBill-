"""Portal Design Studio API routes."""

import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.api.routes.auth import require_isp_admin
from app.models.admin_user import AdminUser
from app.models.tenant import Tenant
from app.models.portal_config_snapshot import PortalConfigSnapshot
from app.services.portal_templates import TEMPLATE_GALLERY, get_templates_by_category, get_template, get_categories, CATEGORY_EMOJIS
from app.services.portal_assets import save_upload, delete_asset, get_tenant_assets
from app.services.portal_export import generate_mikrotik_zip, generate_qr_poster_html

router = APIRouter(tags=["portal-wizard"])


# ── Request / Response Schemas ──────────────────────────────────────────────

class ThemeConfig(BaseModel):
    primary_color: str = "#E8B84B"
    secondary_color: str = "#1a1a2e"
    accent_color: str = "#00d4aa"
    background_type: str = "solid"
    background_value: str = "#0a0a0a"
    gradient: str | None = None
    background_url: str | None = None
    overlay_opacity: float = 0.3
    overlay_color: str = "#000000"
    button_style: str = "rounded"
    button_gradient: str | None = None


class TypographyConfig(BaseModel):
    font_family: str = "Space Grotesk"
    heading_size: int = 32
    body_size: int = 15
    font_weight: int = 500
    letter_spacing: float = 0.3
    heading_case: str = "normal"


class CardConfig(BaseModel):
    style: str = "glass"
    radius: int = 12
    elevation: int = 0
    size: str = "compact"


class BrandConfig(BaseModel):
    name: str = ""
    tagline: str = ""
    location: str = ""
    emoji: str = "📶"
    support_phone: str = ""
    support_number: str = ""
    support_email: str = ""
    whatsapp: str = ""
    website_url: str = ""
    logo_url: str | None = None
    hero_title: str = ""
    section_heading: str = ""
    footer_text: str = ""
    terms_url: str = ""
    facebook_url: str = ""
    twitter_url: str = ""
    instagram_url: str = ""
    technician_name: str = ""
    technician_phone: str = ""


class LayoutConfig(BaseModel):
    sections: list[str] = ["hero", "logo", "packages", "footer"]
    banner_position: str = "top"


class ComponentsConfig(BaseModel):
    hero: bool = True
    logo: bool = True
    welcome_text: bool = True
    packages: bool = True
    promo_banner: bool = False
    countdown: bool = False
    reviews: bool = False
    qr_code: bool = False
    social_links: bool = False
    faq: bool = False
    terms: bool = True
    footer: bool = True
    saved_number_login: bool = True
    session_timer: bool = True
    terms_checkbox: bool = True
    share_button: bool = False


class AnimationsConfig(BaseModel):
    entrance: str = "fade-in"
    floating_logo: bool = False
    particles: bool = False
    pulse_button: bool = False
    ripple: bool = False


class NetworkAwarenessConfig(BaseModel):
    show_status_banner: bool = False
    custom_status_message: str = ""


class EnabledFeaturesConfig(BaseModel):
    mpesa_stk: bool = True
    card_payments: bool = False
    vouchers: bool = True
    sms_receipts: bool = False


class SavePortalConfigRequest(BaseModel):
    template_id: str = "executive-dark"
    palette_index: int | None = None
    brand: BrandConfig = BrandConfig()
    theme: ThemeConfig = ThemeConfig()
    typography: TypographyConfig = TypographyConfig()
    card: CardConfig = CardConfig()
    layout: LayoutConfig = LayoutConfig()
    components: ComponentsConfig = ComponentsConfig()
    animations: AnimationsConfig = AnimationsConfig()
    network_awareness: NetworkAwarenessConfig = NetworkAwarenessConfig()
    enabled_features: EnabledFeaturesConfig = EnabledFeaturesConfig()
    version_tag: str | None = None


class CreateSnapshotRequest(BaseModel):
    version_tag: str


# ── Template Gallery Endpoints ──────────────────────────────────────────────

@router.get("/api/portal-templates")
async def list_templates(category: str | None = Query(None)):
    """List all portal templates, optionally filtered by category."""
    templates = get_templates_by_category(category)
    categories = get_categories()
    return {
        "templates": templates,
        "categories": categories,
        "total": len(templates),
    }


@router.get("/api/portal-templates/{template_id}")
async def get_template_detail(template_id: str):
    """Get a single template by ID with full preset details."""
    t = get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return t


# ── Portal Config Endpoints ─────────────────────────────────────────────────

@router.get("/api/portal-config")
async def get_portal_config(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Get the current tenant's portal configuration."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Platform admins don't have a portal")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "portal_config": tenant.portal_config,
        "configured": tenant.portal_config is not None,
    }


@router.post("/api/portal-config")
async def save_portal_config(
    data: SavePortalConfigRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Save complete portal configuration from the design studio."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="Platform admins don't have a portal")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    brand_data = data.brand.model_dump()
    if not brand_data.get('support_number') and brand_data.get('support_phone'):
        brand_data['support_number'] = brand_data['support_phone']
    portal_config = {
        "version": "2.0",
        "template_id": data.template_id,
        "palette_index": data.palette_index,
        "brand": brand_data,
        "theme": data.theme.model_dump(),
        "typography": data.typography.model_dump(),
        "card": data.card.model_dump(),
        "layout": data.layout.model_dump(),
        "components": data.components.model_dump(),
        "animations": data.animations.model_dump(),
        "network_awareness": data.network_awareness.model_dump(),
        "enabled_features": data.enabled_features.model_dump(),
        "saved_at": datetime.utcnow().isoformat(),
    }

    tenant.portal_config = portal_config
    if not current_user.onboarding_complete:
        current_user.onboarding_complete = True

    await db.commit()
    await db.refresh(tenant)

    return {
        "ok": True,
        "message": "Portal configuration saved",
        "portal_url": f"/portal/{tenant.slug}",
        "onboarding_complete": True,
    }


# ── Snapshot Endpoints ──────────────────────────────────────────────────────

@router.get("/api/portal-config/snapshots")
async def list_snapshots(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """List all portal config snapshots for the tenant."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")
    result = await db.execute(
        select(PortalConfigSnapshot)
        .where(PortalConfigSnapshot.tenant_id == tenant_id)
        .order_by(PortalConfigSnapshot.created_at.desc())
    )
    snapshots = result.scalars().all()
    return {
        "snapshots": [
            {
                "id": str(s.id),
                "version_tag": s.version_tag,
                "created_at": s.created_at.isoformat(),
                "created_by": str(s.created_by) if s.created_by else None,
            }
            for s in snapshots
        ],
        "total": len(snapshots),
    }


@router.post("/api/portal-config/snapshots")
async def create_snapshot(
    data: CreateSnapshotRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Create a manual named snapshot of the current portal config."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant or not tenant.portal_config:
        raise HTTPException(status_code=400, detail="No portal config to snapshot")

    snapshot = PortalConfigSnapshot(
        tenant_id=tenant_id,
        version_tag=data.version_tag,
        config_snapshot=tenant.portal_config,
        created_by=current_user.id,
    )
    db.add(snapshot)
    await db.commit()
    await db.refresh(snapshot)

    return {
        "ok": True,
        "snapshot_id": str(snapshot.id),
        "version_tag": snapshot.version_tag,
    }


@router.post("/api/portal-config/snapshots/{snapshot_id}/restore")
async def restore_snapshot(
    snapshot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Restore a snapshot, overwriting the current portal config."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")

    result = await db.execute(
        select(PortalConfigSnapshot).where(
            PortalConfigSnapshot.id == snapshot_id,
            PortalConfigSnapshot.tenant_id == tenant_id,
        )
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    tenant.portal_config = snapshot.config_snapshot
    await db.commit()

    return {
        "ok": True,
        "message": f"Restored snapshot '{snapshot.version_tag}'",
        "portal_config": snapshot.config_snapshot,
    }


@router.delete("/api/portal-config/snapshots/{snapshot_id}")
async def delete_snapshot(
    snapshot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Delete a snapshot."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")

    result = await db.execute(
        select(PortalConfigSnapshot).where(
            PortalConfigSnapshot.id == snapshot_id,
            PortalConfigSnapshot.tenant_id == tenant_id,
        )
    )
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")

    await db.delete(snapshot)
    await db.commit()

    return {"ok": True, "message": "Snapshot deleted"}


# ── Asset Upload Endpoints ──────────────────────────────────────────────────

@router.post("/api/portal/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    subfolder: str = Form("assets"),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Upload a logo, background image, or video asset."""
    tenant_id = str(current_user.tenant_id) if current_user.tenant_id else None
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")
    result = await save_upload(file, tenant_id, subfolder)
    return {"ok": True, "asset": result}


@router.get("/api/portal/assets")
async def list_assets(
    subfolder: str = Query("assets"),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """List all uploaded assets for the tenant."""
    tenant_id = str(current_user.tenant_id) if current_user.tenant_id else None
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")
    assets = get_tenant_assets(tenant_id, subfolder)
    return {"assets": assets, "total": len(assets)}


@router.delete("/api/portal/assets")
async def delete_asset_endpoint(
    url: str = Query(..., description="Asset URL path to delete"),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Delete an uploaded asset."""
    tenant_id = str(current_user.tenant_id) if current_user.tenant_id else None
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")
    ok = delete_asset(url, tenant_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"ok": True, "message": "Asset deleted"}


# ── Export Endpoints ────────────────────────────────────────────────────────

@router.get("/api/portal/export/zip")
async def export_mikrotik_zip(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Generate and download a MikroTik offline portal ZIP bundle."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant or not tenant.portal_config:
        raise HTTPException(status_code=400, detail="No portal config to export")

    config = tenant.portal_config
    brand_name = config.get("brand", {}).get("name", tenant.name or "WiFi")

    buf = generate_mikrotik_zip(config, brand_name, tenant.slug)

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{tenant.slug}_portal.zip"'},
    )


@router.get("/api/portal/export/qr-poster")
async def export_qr_poster(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Generate a print-ready QR code poster HTML."""
    tenant_id = current_user.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=403, detail="No tenant")

    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant or not tenant.portal_config:
        raise HTTPException(status_code=400, detail="No portal config")

    config = tenant.portal_config
    brand_name = config.get("brand", {}).get("name", tenant.name or "WiFi")

    html = generate_qr_poster_html(config, brand_name, tenant.slug)

    return Response(
        content=html,
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="{tenant.slug}_qr_poster.html"'},
    )


# ── Apply Template Preset ───────────────────────────────────────────────────

@router.get("/api/portal/apply-preset/{template_id}")
async def apply_template_preset(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(require_isp_admin),
):
    """Preview what a template preset looks like without saving."""
    t = get_template(template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    return {
        "template": t,
        "preset": t["preset"],
    }
