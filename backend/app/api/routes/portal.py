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
    {"n": "Weekly", "p": 500, "d": "7 days", "s": "Up to 20 Mbps", "star": False},
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
        'stories': 'stories.html',
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

    palette = PALETTES[palette_idx]
    font_family = params.get("font", "Syne")
    card_radius = params.get("shape", "16px")

    # 3. Parse Brand Info
    live_brand = {
        "name": params.get("name", DEMO_BRAND["name"]),
        "emoji": params.get("emoji", DEMO_BRAND["emoji"]),
        "tagline": params.get("tag", DEMO_BRAND["tagline"]),
        "location": params.get("loc", DEMO_BRAND["location"]),
        "support_phone": params.get("phone", DEMO_BRAND["support_phone"]),
    }

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


@router.get("/portal/{slug}", response_class=HTMLResponse)
async def get_live_portal(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Serve live portal with tenant's actual config mapped to actual Jinja templates
    
    Flow:
    1. Find tenant by slug
    2. Load portal_config (brand, design, network settings)
    3. Fetch active packages
    4. Render template with Jinja2
    """
    
    # Find tenant
    result = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = result.scalar_one_or_none()
    
    if not tenant:
        raise HTTPException(status_code=404, detail=f"ISP '{slug}' not found")
    
    # Check portal is configured
    if not tenant.portal_config:
        raise HTTPException(
            status_code=400, 
            detail=f"Portal not configured for ISP '{slug}'. Run seed_portal_configs.py to initialize."
        )
    
    # Get template ID
    template_id = tenant.portal_config.get('template_id', 'dashboard')
    
    template_map = {
        'spotlight': 'portal_spotlight.html',
        'dashboard': 'portal_dashboard.html',
        'stories': 'stories.html',
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
    brand = tenant.portal_config.get('brand', {})
    brand['slug'] = tenant.slug  # Needed by template JS for API URLs
    network = tenant.portal_config.get('network_awareness', {})
    design = tenant.portal_config.get('design', {})
    
    # Validate palette index
    try:
        palette_idx = int(design.get('palette_index', 0))
        if palette_idx < 0 or palette_idx >= len(PALETTES):
            palette_idx = 0
    except:
        palette_idx = 0

    # Build rendering context
    context = {
        'brand': brand,
        'packages': packages_data,
        'network_up': network.get('show_status_banner', True),
        'network_status': network.get('custom_status_message', '✅ Network is online'),
        'status_message': network.get('custom_status_message', '✅ Network is online'),
        'palette': PALETTES[palette_idx],
        'font': design.get('font_family', 'Syne'),
        'radius': design.get('card_radius', '16px'),
        'design': design
    }
    
    try:
        html = PortalRenderer.render(filename, context)
        return html
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Template rendering error: {str(e)}"
        )


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