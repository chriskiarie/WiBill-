"""
app/api/routes/portal.py - Serves rendered portal HTML
Uses Jinja2 (PortalRenderer) to render ACTUAL templates with LIVE data from the wizard!
"""
import json
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.tenant import Tenant
from app.models.package import Package
from app.models.session import Session as DBSession
from app.models.transaction import Transaction
from app.services.portal_renderer import PortalRenderer
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Jinja2 environment for templates that use {% extends %}
_portal_env = Environment(
    loader=FileSystemLoader("app/templates"),
    autoescape=select_autoescape(["html", "xml"]),
)

router = APIRouter()

# Demo data for previews
DEMO_PACKAGES = [
    {"n": "1 Hour", "p": 20, "d": "60 min", "s": "Up to 5 Mbps", "star": False},
    {"n": "6 Hours", "p": 80, "d": "6 hrs", "s": "Up to 10 Mbps", "star": False},
    {"n": "Daily", "p": 150, "d": "24 hrs", "s": "Up to 15 Mbps", "star": True},
]

DEMO_BRAND = {
    "name": "Demo WiFi",
    "emoji": "📡",
    "tagline": "Fast, reliable internet",
    "location": "Nairobi, Kenya",
    "support_phone": "+254 700 123 456",
}

DEMO_NETWORK = {
    "status_message": "✅ Network is online and stable",
    "network_up": True,
}

# The color palettes mapping required for the Jinja templates
PALETTES = [
    {"name": "Midnight Indigo", "primary": "#5b4fff", "primaryDark": "rgba(91,79,255,.6)", "bg": "#0c0c1a", "text": "#e8e6ff", "textDim": "rgba(232,230,255,.5)", "card": "rgba(255,255,255,.06)", "cardBorder": "rgba(255,255,255,.12)", "accent": "#8b73ff"},
    {"name": "Nairobi Sun", "primary": "#f97316", "primaryDark": "#f97316", "bg": "#fff7ed", "text": "#431407", "textDim": "#a1520b", "card": "#ffffff", "cardBorder": "#fed7aa", "accent": "#ea6b03"},
    {"name": "Ocean Deep", "primary": "#0ea5e9", "primaryDark": "#0c4a6e", "bg": "#f0f9ff", "text": "#0c4a6e", "textDim": "#0369a1", "card": "#ffffff", "cardBorder": "#bae6fd", "accent": "#0284c7"},
    {"name": "Forest Night", "primary": "#16a34a", "primaryDark": "rgba(134,239,172,.5)", "bg": "#052e16", "text": "#dcfce7", "textDim": "rgba(220,252,231,.5)", "card": "rgba(255,255,255,.07)", "cardBorder": "rgba(134,239,172,.15)", "accent": "#22c55e"},
    {"name": "Rose Quartz", "primary": "#f43f5e", "primaryDark": "#f43f5e", "bg": "#fff1f2", "text": "#4c0519", "textDim": "#881337", "card": "#ffffff", "cardBorder": "#fecdd3", "accent": "#e11d48"},
    {"name": "Obsidian Slate", "primary": "#1e293b", "primaryDark": "#1e293b", "bg": "#f8fafc", "text": "#0f172a", "textDim": "#64748b", "card": "#ffffff", "cardBorder": "#e2e8f0", "accent": "#334155"},
    {"name": "Amber Dusk", "primary": "#b45309", "primaryDark": "#d97706", "bg": "#fffbeb", "text": "#451a03", "textDim": "#92400e", "card": "#ffffff", "cardBorder": "#fde68a", "accent": "#d97706"},
    {"name": "Electric Violet", "primary": "#7c3aed", "primaryDark": "#7c3aed", "bg": "#faf5ff", "text": "#2e1065", "textDim": "#6d28d9", "card": "#ffffff", "cardBorder": "#ddd6fe", "accent": "#6d28d9"},
]


@router.get("/studio", response_class=HTMLResponse)
async def portal_studio():
    """Serve the Portal Design Studio wizard."""
    import os
    wizard_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "portal_wizard.html")
    wizard_path = os.path.normpath(wizard_path)
    if os.path.exists(wizard_path):
        with open(wizard_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Wizard not found</h1>", status_code=404)


@router.get("/api/v1/portal-previews/{template_id}", response_class=HTMLResponse)
async def preview_portal(template_id: str, request: Request):
    """
    Preview portal template with LIVE data dynamically injected into Jinja2 templates
    
    Query params:
    - pkgs: JSON array of packages [{n: name, p: price, d: duration, star: bool}]
    - palette: palette index (0-7)
    - font: font family (default: Syne)
    - shape: card border radius (default: 16px)
    - name: ISP name
    - emoji: brand emoji
    - tag: tagline
    - loc: location
    - phone: support phone
    - showSB: show status banner (true/false)
    - sbMsg: status banner message
    """
    
    template_map = {
        'spotlight': 'portal_spotlight.html',
        'dashboard': 'portal_dashboard.html',
        'split': 'portal_split.html',
        'bento': 'portal_bento.html',
    }
    
    filename = template_map.get(template_id, 'portal_dashboard.html')
    params = request.query_params

    # 1. Parse Live Packages from URL
    try:
        pkgs_json = params.get("pkgs", "[]")
        packages_raw = json.loads(pkgs_json) if pkgs_json else []
        
        if not packages_raw:
            live_packages = DEMO_PACKAGES
        else:
            live_packages = [
                {
                    "name": p.get("n", "Plan"),
                    "price_ksh": float(p.get("p", 0)),
                    "duration_label": p.get("d", "1 hr"),
                    "star": p.get("star", False)
                }
                for p in packages_raw
            ]
    except Exception as e:
        live_packages = DEMO_PACKAGES

    # 2. Parse Palette and Design
    try:
        palette_idx = int(params.get("palette", "0"))
        if palette_idx < 0 or palette_idx >= len(PALETTES):
            palette_idx = 0
    except:
        palette_idx = 0

    palette = dict(PALETTES[palette_idx])
    # Allow individual color overrides from raw color pickers
    for key, qp in [('primary','primary'), ('bg','secondary'), ('accent','accent')]:
        val = params.get(qp)
        if val:
            palette[key] = val
    font_family = params.get("font", "Syne")
    card_radius = params.get("shape", "16px")

    # 3. Parse Brand Info
    live_brand = {
        "name": params.get("name", DEMO_BRAND["name"]),
        "emoji": params.get("emoji", DEMO_BRAND["emoji"]),
        "tagline": params.get("tag", DEMO_BRAND["tagline"]),
        "location": params.get("loc", DEMO_BRAND["location"]),
        "support_phone": params.get("phone", DEMO_BRAND["support_phone"]),
        "support_number": params.get("phone", DEMO_BRAND["support_phone"]),
        "support_email": params.get("support_email", ""),
        "whatsapp": params.get("whatsapp", ""),
        "website_url": params.get("website_url", ""),
        "logo_url": params.get("logo_url"),
        "hero_title": params.get("hero_title", "Choose Your Plan"),
        "section_heading": params.get("section_heading", "Internet Packages"),
        "footer_text": params.get("footer_text", ""),
        "terms_url": params.get("terms_url", ""),
        "facebook_url": params.get("facebook_url", ""),
        "twitter_url": params.get("twitter_url", ""),
        "instagram_url": params.get("instagram_url", ""),
        "technician_name": params.get("technician_name", ""),
        "technician_phone": params.get("technician_phone", ""),
    }

    # Normalize logo URL (rebase stale hosts, drop blob/data/foreign-host)
    logo_url = live_brand.get("logo_url")
    if logo_url:
        normalized = _normalize_logo_url(logo_url, request)
        if normalized:
            live_brand["logo_url"] = normalized
        else:
            live_brand.pop("logo_url", None)

    # 4. Parse Network Status
    show_status = params.get("showSB", "true").lower() == "true"
    status_msg = params.get("sbMsg", DEMO_NETWORK["status_message"])

    try:
        # Build the exact context the ACTUAL Jinja templates expect!
        context = {
            'brand': live_brand,
            'packages': live_packages,
            'network_up': show_status,
            'network_status': status_msg,
            'status_message': status_msg,
            
            # --- CRITICAL NEW ADDITIONS FOR JINJA2 STYLING ---
            'palette': palette,
            'font': font_family,
            'radius': card_radius,
            'design': { 
                'font_family': font_family,
                'card_radius': card_radius,
                'palette_index': palette_idx
            }
        }
        
        # Render ACTUAL template file
        html = PortalRenderer.render(filename, context)
        return html
    
    except Exception as e:
        return f"""
        <html><body style="font-family: monospace; padding: 20px;">
            <h1>Preview Error</h1>
            <p><strong>Template:</strong> {template_id}</p>
            <p><strong>Error:</strong> {str(e)}</p>
            <pre style="background: #f5f5f5; padding: 10px; overflow-x: auto;">
{type(e).__name__}: {str(e)}
            </pre>
        </body></html>
        """


def _normalize_logo_url(logo: str, request: Request) -> str | None:
    """Return the logo URL rewritten against THIS API host — or None.

    Handles every flavor a logo can be stored as:
      - /uploads/...            → absolute against the current host
      - <host>/uploads/...      → rebased to the current host (old API
                                  domains baked in by earlier saves)
      - http(s) on another host → dropped (would render a broken image)
      - blob:/data:             → dropped (device-local only)
    """
    if not logo:
        return None
    if logo.startswith("blob:") or logo.startswith("data:"):
        return None
    base = f"{request.base_url.scheme}://{request.base_url.netloc}"
    if logo.startswith("/uploads/") or logo.startswith("\\uploads\\"):
        return base + logo.replace("\\", "/")
    if "/uploads/" in logo:
        idx = logo.index("/uploads/")
        return base + logo[idx:]
    if logo.startswith("http://") or logo.startswith("https://"):
        return logo if logo.startswith(base) else None
    return base + logo


def _default_portal_config(tenant: Tenant) -> dict:
    """Fallback portal config so /portal/{slug} NEVER 400s on a phone.

    A blank/white captive portal page is the worst possible failure — any
    guest device must always get a branded page, even before the wizard has
    been run. Mirrors the seed default; brand comes from the tenant row.
    """
    return {
        "template_id": "dashboard",
        "version": "2.0",
        "palette_index": 0,
        "brand": {
            "name": tenant.name or "WiFi",
            "emoji": "📡",
            "tagline": f"Fast, reliable internet by {tenant.name or 'this WiFi'}",
            "location": "Nairobi, Kenya",
            "support_phone": "+254 700 000 000",
        },
        "theme": {
            "primary_color": "#5b4fff",
            "secondary_color": "#0c0c1a",
            "accent_color": "#5b4fff",
            "background_type": "solid",
            "background_value": "#0c0c1a",
        },
        "typography": {"font_family": "Inter", "heading_size": 36, "body_size": 16},
        "card": {"style": "glass", "radius": 16},
        "network_awareness": {"show_status_banner": True, "custom_status_message": "✅ Network is online and stable"},
        "enabled_features": {"mpesa_stk": True, "card_payments": False, "vouchers": False},
    }


@router.get("/portal/{slug}", response_class=HTMLResponse)
async def get_live_portal(
    slug: str,
    token: str = Query(None),
    mac: str = Query(""),
    request: Request = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve live portal with tenant's actual config mapped to actual Jinja templates
    Supports ?token=CODE for reward token redemption.
    
    Flow:
    1. Find tenant by slug
    2. If token param present, attempt token redemption
    3. Load portal_config (brand, design, network settings)
    4. Fetch active packages
    5. Render template with Jinja2
    """
    
    # Find tenant
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()

    # Handle reward token redemption
    if token:
        from app.models.reward_token import RewardToken
        from app.services.session_service import create_session, activate_session
        from datetime import datetime, timedelta
        tr = await db.execute(select(RewardToken).where(RewardToken.token_code == token))
        rtoken = tr.scalar_one_or_none()
        if not rtoken:
            return HTMLResponse(content=f"""<html><body style="font-family:monospace;padding:40px;background:#030303;color:#f0f0f0"><h1 style="color:#ef4444">Token Not Found</h1><p>This token code is invalid. Please check your link.</p><a href="/portal/{slug}" style="color:#E8B84B">Back to portal</a></body></html>""", status_code=404)
        if rtoken.redeemed:
            return HTMLResponse(content=f"""<html><body style="font-family:monospace;padding:40px;background:#030303;color:#f0f0f0"><h1 style="color:#ef4444">Token Already Used</h1><p>This token was already redeemed on {rtoken.redeemed_at.strftime('%Y-%m-%d %H:%M') if rtoken.redeemed_at else 'an earlier date'}.</p><a href="/portal/{slug}" style="color:#E8B84B">Back to portal</a></body></html>""", status_code=400)
        def _naive(dt):
            return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt
        if rtoken.expires_at and _naive(rtoken.expires_at) < datetime.utcnow():
            return HTMLResponse(content=f"""<html><body style="font-family:monospace;padding:40px;background:#030303;color:#f0f0f0"><h1 style="color:#ef4444">Token Expired</h1><p>This token expired on {rtoken.expires_at.strftime('%Y-%m-%d %H:%M')}. Tokens have a limited validity window.</p><a href="/portal/{slug}" style="color:#E8B84B">Back to portal</a></body></html>""", status_code=400)
        if rtoken.tenant_id != tenant.id:
            return HTMLResponse(content=f"""<html><body style="font-family:monospace;padding:40px;background:#030303;color:#f0f0f0"><h1 style="color:#ef4444">Invalid Token</h1><p>This token is not valid for this ISP.</p><a href="/portal/{slug}" style="color:#E8B84B">Back to portal</a></body></html>""", status_code=400)

        # Redeem: create session
        session = await create_session(
            tenant_id=rtoken.tenant_id,
            mac_address=mac or rtoken.bound_mac or "00:00:00:00:00:00",
            ip_address=request.client.host if request else "0.0.0.0",
            package_id=None,
            expires_at=datetime.utcnow() + timedelta(minutes=rtoken.minutes),
            db=db,
        )
        await activate_session(session_id=str(session.id), db=db)
        rtoken.redeemed = True
        rtoken.redeemed_at = datetime.utcnow()
        rtoken.session_id = session.id
        rtoken.bound_mac = mac or rtoken.bound_mac
        await db.commit()

        # Provision on MikroTik (non-blocking)
        from app.services.mikrotik_service import create_mikrotik_user
        try:
            await create_mikrotik_user(
                tenant_id=str(rtoken.tenant_id),
                session_id=str(session.id),
                mac_address=mac or rtoken.bound_mac or "00:00:00:00:00:00",
                ip_address=request.client.host if request else "0.0.0.0",
                username=session.reconnect_code,
                password=session.reconnect_code,
                expires_at=session.expires_at,
                db=db,
            )
        except Exception:
            pass

        return HTMLResponse(content=f"""<html><body style="font-family:monospace;padding:40px;background:#030303;color:#f0f0f0;text-align:center">
            <div style="font-size:48px;margin-bottom:16px">&#10004;&#65039;</div>
            <h1 style="color:#22c55e;margin-bottom:8px">Token Redeemed!</h1>
            <p style="color:#f0f0f0;font-size:16px">You have <strong>{rtoken.minutes} minutes</strong> of free internet access.</p>
            <p style="color:#666;font-size:12px">Your session is active. Enjoy browsing.</p>
            <p style="color:#666;font-size:10px;margin-top:24px">Session: {str(session.id)[:8]}...</p>
        </body></html>""")
    
    if not tenant:
        raise HTTPException(status_code=404, detail=f"ISP '{slug}' not found")
    
    # Check portal is configured — if not, render with a sensible default
    # instead of erroring: a captive phone must never see a white page.
    portal_config = tenant.portal_config or _default_portal_config(tenant)

    # Get template ID
    template_id = portal_config.get('template_id', 'dashboard')
    
    template_map = {
        'spotlight': 'portal_spotlight.html',
        'dashboard': 'portal_dashboard.html',
        'split': 'portal_split.html',
        'bento': 'portal_bento.html',
    }
    
    filename = template_map.get(template_id, 'portal_dashboard.html')
    
    # Load packages
    pkg_result = await db.execute(
        select(Package).where(
            Package.tenant_id == tenant.id,
            Package.is_active == True
        ).order_by(Package.display_order)
    )
    packages_list = pkg_result.scalars().all()
    
    packages_data = [
        {
            "id": str(pkg.id),
            "n": pkg.name,
            "p": float(pkg.price_ksh),
            "d": pkg.duration_label,
            "s": "High Speed",
            "star": False,
        }
        for pkg in packages_list
    ]
    
    if not packages_data:
        packages_data = DEMO_PACKAGES
    
    # Prepare context from tenant's portal_config; inject slug for JS URLs
    brand = dict(portal_config.get('brand', {}) or {})
    brand['slug'] = tenant.slug  # Needed by template JS for API URLs
    brand.setdefault('name', tenant.name or 'WiFi')
    brand.setdefault('emoji', '📡')
    brand.setdefault('tagline', f'Fast, reliable internet by {tenant.name or "this WiFi"}')
    if 'support_phone' in brand and 'support_number' not in brand:
        brand['support_number'] = brand['support_phone']
    # Normalize logo URL: strip any host prefix, rebuild with correct one.
    # blob:/data:/foreign-host logos never render on a guest device — fall
    # back to the emoji mark instead of showing a broken image.
    logo = brand.get('logo_url')
    if logo:
        normalized = _normalize_logo_url(logo, request)
        if normalized:
            brand['logo_url'] = normalized
        else:
            brand.pop('logo_url', None)
    network = portal_config.get('network_awareness', {}) or {}
    theme = portal_config.get('theme', {}) or {}
    typography = portal_config.get('typography', {}) or {}
    card = portal_config.get('card', {}) or {}

    # Resolve palette index — stored directly, or match by primary color, or default 0
    palette_idx = portal_config.get('palette_index')
    if palette_idx is None:
        try:
            pc = (theme.get('primary_color') or '').lower()
            for i, p in enumerate(PALETTES):
                if p['primary'].lower() == pc:
                    palette_idx = i
                    break
        except:
            pass
    try:
        palette_idx = int(palette_idx) if palette_idx is not None else 0
        if palette_idx < 0 or palette_idx >= len(PALETTES):
            palette_idx = 0
    except:
        palette_idx = 0

    font = typography.get('font_family') or 'Syne'
    radius = f"{card.get('radius', 16)}px" if card.get('radius') else '16px'

    # Build palette, with overrides from custom theme colors
    palette = dict(PALETTES[palette_idx])
    if theme.get('primary_color'): palette['primary'] = theme['primary_color']
    if theme.get('secondary_color'): palette['bg'] = theme['secondary_color']
    if theme.get('accent_color'): palette['accent'] = theme['accent_color']

    context = {
        'brand': brand,
        'packages': packages_data,
        'network_up': True,
        'network_status': network.get('custom_status_message', '✅ Network is online'),
        'status_message': network.get('custom_status_message', '✅ Network is online'),
        'palette': palette,
        'font': font,
        'radius': radius,
        'design': { 'font_family': font, 'card_radius': radius, 'palette_index': palette_idx }
    }
    
    try:
        html = PortalRenderer.render(filename, context)
        return html
    except Exception as e:
        # Never hand a captive phone a white error page — render a minimal
        # branded fallback instead.
        brand_name = brand.get('name') or tenant.name or 'WiFi'
        brand_emoji = brand.get('emoji') or '📡'
        return HTMLResponse(content=f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{brand_name}</title>
<style>
  html,body {{ margin:0; padding:0; height:100%; background:#0c0c1a; color:#e8e6ff;
    font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
  .wrap {{ min-height:100%; display:flex; flex-direction:column; align-items:center;
    justify-content:center; text-align:center; padding:32px; box-sizing:border-box; }}
  .logo {{ font-size:44px; line-height:1; margin-bottom:16px; }}
  h1 {{ font-size:19px; font-weight:700; margin:0 0 6px; }}
  p {{ font-size:13px; color:rgba(232,230,255,.55); margin:0; }}
</style></head>
<body><div class="wrap"><div class="logo">{brand_emoji}</div>
<h1>{brand_name}</h1>
<p>This portal is temporarily unavailable. Please try again shortly.</p>
</div></body></html>""")


@router.get("/api/v1/portal/{slug}/config")
async def get_portal_config(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get tenant's portal configuration as JSON (for debugging/admin)
    """
    
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail=f"ISP '{slug}' not found")
    
    if not tenant.portal_config:
        raise HTTPException(status_code=400, detail="Portal not configured")
    
    return {"slug": slug, "portal_config": tenant.portal_config}


@router.get("/api/v1/palettes")
async def get_available_palettes():
    """
    Return all available color palettes for portal design
    """
    return {
        "palettes": [
            {
                "index": idx,
                "name": p["name"],
                "colors": {
                    "primary": p["primary"],
                    "primaryDark": p["primaryDark"],
                    "bg": p["bg"],
                    "text": p["text"],
                    "textDim": p["textDim"],
                    "card": p["card"],
                    "cardBorder": p["cardBorder"],
                    "accent": p["accent"]
                }
            }
            for idx, p in enumerate(PALETTES)
        ]
    }


@router.get("/seed-portal/{slug}")
async def seed_portal_for_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Initialize portal_config for a tenant by slug."""
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail=f"Tenant '{slug}' not found")

    if tenant.portal_config:
        return {"message": f"Portal already configured for '{slug}'", "slug": slug}

    default_config = {
        "template_id": "dashboard",
        "version": "2.0",
        "palette_index": 0,
        "brand": {
            "name": tenant.name,
            "emoji": "\U0001f4e1",
            "tagline": f"Fast, reliable internet by {tenant.name}",
            "location": "Nairobi, Kenya",
            "support_phone": "+254 700 123 456",
        },
        "theme": {
            "primary_color": "#5b4fff",
            "secondary_color": "#0c0c1a",
            "accent_color": "#5b4fff",
            "background_type": "solid",
            "background_value": "#0c0c1a",
            "gradient": None, "background_url": None,
            "overlay_opacity": 0.4, "overlay_color": "#000000",
            "button_style": "rounded", "button_gradient": None,
        },
        "typography": {
            "font_family": "Syne",
            "heading_size": 36, "body_size": 16,
            "font_weight": 600, "letter_spacing": 0.5,
            "heading_case": "normal",
        },
        "card": { "style": "glass", "radius": 16, "elevation": 0, "size": "compact" },
        "layout": { "sections": ["hero", "logo", "packages", "footer"], "banner_position": "top" },
        "components": {
            "hero": True, "logo": True, "welcome_text": True, "packages": True,
            "promo_banner": False, "countdown": False, "reviews": False,
            "qr_code": False, "social_links": False, "faq": False,
            "terms": True, "footer": True, "saved_number_login": True,
            "session_timer": True, "terms_checkbox": True, "share_button": False,
        },
        "animations": { "entrance": "fade-in", "floating_logo": False, "particles": False, "pulse_button": False, "ripple": False },
        "network_awareness": {
            "show_status_banner": True,
            "custom_status_message": "\u2705 Network is online and stable",
        },
        "enabled_features": {
            "mpesa_stk": True,
            "card_payments": False,
            "vouchers": False,
            "sms_receipts": False,
        },
    }
    tenant.portal_config = default_config
    await db.commit()
    return {"message": f"Portal configured for '{slug}'", "slug": slug}


@router.get("/portal/{slug}/success/{session_id}", response_class=HTMLResponse)
async def portal_success_page(
    slug: str,
    session_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Render the payment success page after M-Pesa confirmation.

    Shows receipt with package name, amount paid, phone, and a live
    countdown timer until session expiry.
    """
    # Validate session_id
    try:
        session_uuid = UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id")

    # Look up session
    result = await db.execute(
        select(DBSession).where(DBSession.id == session_uuid)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify slug matches
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == session.tenant_id)
    )
    tenant = tenant_result.scalar_one_or_none()
    if not tenant or tenant.slug != slug:
        raise HTTPException(status_code=404, detail="ISP not found")

    # Get package details
    pkg_result = await db.execute(
        select(Package).where(Package.id == session.package_id)
    )
    package = pkg_result.scalar_one_or_none()

    # Get transaction for amount paid
    txn_result = await db.execute(
        select(Transaction).where(Transaction.session_id == session.id)
    )
    txn = txn_result.scalar_one_or_none()

    context = {
        "package": {
            "name": package.name if package else "Unknown",
            "duration_hours": package.duration_hours if package else 0,
            "price_ksh": float(package.price_ksh) if package else 0,
        },
        "session": {
            "phone_number": session.phone_number or "Unknown",
            "amount_paid": float(txn.amount_ksh) if txn else 0,
        },
        "expires_at": session.expires_at.isoformat(),
        "slug": slug,
    }

    try:
        template = _portal_env.get_template("portal_success.html")
        return template.render(context)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Template error: {str(e)}"
        )