from typing import Optional
import json
from urllib.parse import unquote

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/api/v1/portal-previews", tags=["portal-previews"])

# Palette swatches for preview colouring
PALETTES = [
    {"bg": "#0c0c1a", "card": "rgba(255,255,255,.06)", "border": "rgba(255,255,255,.12)", "text": "#ffffff", "dim": "rgba(255,255,255,.6)", "accent": "#8b73ff", "price": "#b8a5ff"},
    {"bg": "#fff7ed", "card": "#ffffff", "border": "#fed7aa", "text": "#1c1917", "dim": "#78716c", "accent": "#f97316", "price": "#ea580c"},
    {"bg": "#f0f9ff", "card": "#ffffff", "border": "#bae6fd", "text": "#0f172a", "dim": "#64748b", "accent": "#0ea5e9", "price": "#0284c7"},
    {"bg": "#052e16", "card": "rgba(255,255,255,.07)", "border": "rgba(134,239,172,.15)", "text": "#ffffff", "dim": "rgba(255,255,255,.55)", "accent": "#22c55e", "price": "#6ee7b7"},
    {"bg": "#fff1f2", "card": "#ffffff", "border": "#fecdd3", "text": "#1c1917", "dim": "#78716c", "accent": "#f43f5e", "price": "#e11d48"},
    {"bg": "#f8fafc", "card": "#ffffff", "border": "#e2e8f0", "text": "#0f172a", "dim": "#64748b", "accent": "#1e293b", "price": "#334155"},
    {"bg": "#fffbeb", "card": "#ffffff", "border": "#fde68a", "text": "#1c1917", "dim": "#78716c", "accent": "#d97706", "price": "#b45309"},
    {"bg": "#faf5ff", "card": "#ffffff", "border": "#ddd6fe", "text": "#1c1917", "dim": "#78716c", "accent": "#7c3aed", "price": "#6d28d9"},
]

FONTS = {
    "Syne": "'Syne', sans-serif",
    "Cabinet Grotesk": "'Cabinet Grotesk', sans-serif",
    "Space Mono": "'Space Mono', monospace",
    "Figtree": "'Figtree', sans-serif",
    "Inter": "'Inter', sans-serif",
}


def make_preview(template: str, shape: str, size: str, name: str = "", tagline: str = "",
                 emoji: str = "", location: str = "", phone: str = "",
                 palette: int = 0, font: str = "Inter",
                 packages_json: str = "[]", show_sb: bool = True, sb_msg: str = ""):
    p = PALETTES[palette % len(PALETTES)]
    font_family = FONTS.get(font, "'Inter', sans-serif")
    pkg_padding = {"compact": "1rem", "comfortable": "1.5rem", "large": "2rem"}.get(size, "1.5rem")

    try:
        pkgs = json.loads(unquote(packages_json)) if packages_json != "[]" else []
    except Exception:
        pkgs = []
    if not pkgs:
        pkgs = [
            {"n": "1 Hour", "d": "60 min", "p": 20},
            {"n": "Daily", "d": "24 hrs", "p": 100},
        ]

    display_name = name or "Your WiFi"
    display_tag = tagline or "Fast & reliable internet"
    display_loc = location or ""
    display_phone = phone or ""

    pkg_html = ""
    for pkg in pkgs:
        pkg_name = pkg.get("n", "Package")
        pkg_price = pkg.get("p", 0)
        pkg_html += f"""
    <div class="pkg-card" style="border-radius:{shape};padding:{pkg_padding}">
      <div class="pkg-name">{pkg_name}</div>
      <div class="pkg-price">KES {pkg_price}</div>
    </div>"""

    sb_html = ""
    if show_sb:
        sb_html = f"""
    <div class="status-banner">
      <span class="dot"></span>
      <span>{sb_msg or 'Internet is live'}</span>
    </div>"""

    loc_html = f'<div class="loc">📍 {display_loc}</div>' if display_loc else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Portal Preview</title>
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{
      font-family: {font_family};
      background: {p['bg']}; color: {p['text']};
      padding: 1.25rem; min-height: 100vh;
      font-size: 14px;
    }}
    .container {{ max-width: 480px; margin: 0 auto; }}
    .header {{ text-align: center; margin-bottom: 1.5rem; }}
    .header .name {{ font-size: 1.4rem; font-weight: 800; margin-bottom: 0.25rem; color: {p['accent']}; }}
    .header .tag {{ font-size: 0.85rem; color: {p['dim']}; }}
    .header .loc {{ font-size: 0.8rem; color: {p['dim']}; margin-top: 0.35rem; }}
    .status-banner {{
      display: flex; align-items: center; gap: 6px;
      background: rgba(34,197,94,.12); border: 1px solid rgba(34,197,94,.25);
      border-radius: 8px; padding: 8px 14px; margin-bottom: 1rem;
      font-size: 0.8rem; color: #22c55e;
    }}
    .status-banner .dot {{ width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }}
    .section-title {{ font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: {p['dim']}; margin-bottom: 0.75rem; }}
    .pkg-card {{
      background: {p['card']}; border: 1px solid {p['border']};
      margin-bottom: 0.75rem;
    }}
    .pkg-name {{ font-size: 0.95rem; font-weight: 700; margin-bottom: 0.25rem; }}
    .pkg-price {{ font-size: 1.3rem; font-weight: 900; color: {p['price']}; }}
    .voucher-section {{ margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid {p['border']}; }}
    .voucher-section .v-label {{ font-size: 0.75rem; color: {p['dim']}; margin-bottom: 0.5rem; }}
    .voucher-row {{ display: flex; gap: 0.5rem; }}
    .voucher-row input {{
      flex: 1; background: {p['card']}; border: 1px solid {p['border']};
      border-radius: 8px; padding: 9px 12px; font-size: 0.85rem;
      color: {p['text']}; outline: none; font-family: inherit;
    }}
    .voucher-row button {{
      background: {p['accent']}; color: {p['text']}; border: none;
      border-radius: 8px; padding: 9px 18px; font-size: 0.8rem;
      font-weight: 700; cursor: pointer; font-family: inherit;
    }}
  </style>
</head>
<body>
  <div class="container">
    {sb_html}
    <div class="header">
      <div class="name">{display_name}</div>
      <div class="tag">{display_tag}</div>
      {loc_html}
    </div>
    <div class="section-title">Quick Start</div>
    <div style="font-size:0.8rem;color:{p['dim']};margin-bottom:1rem;line-height:1.6">
      1️⃣ Select a plan<br>
      2️⃣ Tap "Get Now"<br>
      3️⃣ Get connected
    </div>
    {pkg_html}
    <div class="voucher-section">
      <div class="v-label">Got a voucher code?</div>
      <div class="voucher-row">
        <input type="text" placeholder="e.g. ABC12345" value="">
        <button>Redeem</button>
      </div>
    </div>
  </div>
</body>
</html>"""


@router.get("/{template_id}", response_class=HTMLResponse)
async def get_portal_preview(
    template_id: str,
    shape: str = Query("16px"),
    size: str = Query("comfortable"),
    name: str = Query(""),
    tag: str = Query(""),
    loc: str = Query(""),
    phone: str = Query(""),
    emoji: str = Query(""),
    palette: int = Query(0),
    font: str = Query("Inter"),
    packages: str = Query("[]"),
    showSB: bool = Query(True),
    sbMsg: str = Query(""),
):
    return make_preview(template_id, shape, size, name, tag, emoji, loc, phone, palette, font, packages, showSB, sbMsg)
