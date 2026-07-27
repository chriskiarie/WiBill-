"""
Portal Template Viewer
Renders all 3 portal templates with demo data and saves as static HTML files.
Includes mobile preview mode showing how templates look on mobile devices.

Usage:
  cd D:\honestbill\backend
  python view_templates.py

Then open: D:\honestbill\backend\portal_views\index.html
"""

import sys
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.portal_renderer import PortalRenderer

# Demo data matching what the portal routes use
DEMO_PACKAGES = [
    {"name": "1 Hour", "price_ksh": 20, "duration_label": "60 min", "star": False, "speed": "Up to 5 Mbps"},
    {"name": "6 Hours", "price_ksh": 80, "duration_label": "6 hrs", "star": False, "speed": "Up to 10 Mbps"},
    {"name": "Daily", "price_ksh": 150, "duration_label": "24 hrs", "star": True, "speed": "Up to 15 Mbps"},
    {"name": "Weekly", "price_ksh": 500, "duration_label": "7 days", "star": False, "speed": "Up to 20 Mbps"},
]

DEMO_BRAND = {
    "name": "Demo WiFi",
    "emoji": "📡",
    "tagline": "Fast, reliable internet",
    "location": "Nairobi, Kenya",
    "support_phone": "+254 700 123 456",
    "slug": "demo-wifi",
}

DEMO_NETWORK = {
    "status_message": "Network is online and stable",
    "network_up": True,
}

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

TEMPLATES = [
    {"id": "dashboard", "file": "portal_dashboard.html", "name": "Dashboard Portal", "desc": "Compact 2-col grid with top bar, payment modal, and loading sequence"},
    {"id": "spotlight", "file": "portal_spotlight.html", "name": "Spotlight Portal", "desc": "Hero section with brand showcase and compact package grid"},
    {"id": "split", "file": "portal_split.html", "name": "Split Portal", "desc": "Split-screen layout with sticky brand panel and scrollable package rows"},
    {"id": "bento", "file": "portal_bento.html", "name": "Bento Portal", "desc": "Asymmetric bento grid with varying card sizes like Apple bento boxes"},
]

OUTPUT_DIR = Path(__file__).parent / "portal_views"


def render_template(template_file: str, palette_idx: int = 0) -> str:
    """Render a template with demo data."""
    palette = PALETTES[palette_idx]
    context = {
        "brand": DEMO_BRAND,
        "packages": DEMO_PACKAGES,
        "network_up": DEMO_NETWORK["network_up"],
        "network_status": DEMO_NETWORK["status_message"],
        "status_message": DEMO_NETWORK["status_message"],
        "palette": palette,
        "font": "Inter",
        "radius": "16px",
        "design": {
            "font_family": "Inter",
            "card_radius": "16px",
            "palette_index": palette_idx,
        },
    }
    return PortalRenderer.render(template_file, context)


def generate_index(template_files: list[dict]) -> str:
    """Generate an index.html page linking to all rendered templates with desktop and mobile previews."""
    template_cards = ""
    for t in template_files:
        template_cards += f"""
        <div class="template-card">
            <div class="template-card__header">
                <h2>{t['name']}</h2>
                <p>{t['desc']}</p>
            </div>
            <div class="template-card__actions">
                <a href="{t['filename']}" class="btn btn--primary" target="_blank">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                    Desktop View
                </a>
                <a href="mobile_{t['filename']}" class="btn btn--secondary" target="_blank">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>
                    Mobile View
                </a>
            </div>
        </div>"""

    palette_options = ""
    for i, p in enumerate(PALETTES):
        palette_options += f'<option value="{i}">{p["name"]}</option>'

    font_options = ""
    for fn in ["Inter", "Space Grotesk", "Playfair Display", "Orbitron", "Syne", "Figtree", "DM Sans", "Poppins", "Raleway", "Montserrat", "Outfit", "Sora"]:
        font_options += f'<option value="{fn}">{fn}</option>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal Template Viewer</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800&family=Syne:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Raleway:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: #0a0a14;
            color: #e8e6ff;
            min-height: 100vh;
        }}

        .header {{
            padding: 2.5rem 2rem 1.5rem;
            text-align: center;
            background: linear-gradient(180deg, rgba(91,79,255,0.08) 0%, transparent 100%);
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }}
        .header h1 {{
            font-size: 2rem;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }}
        .header p {{
            color: rgba(232,230,255,0.5);
            font-size: 0.95rem;
        }}

        .toolbar {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            padding: 1rem 2rem;
            background: rgba(255,255,255,0.02);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            flex-wrap: wrap;
        }}
        .toolbar label {{
            font-size: 0.8rem;
            font-weight: 600;
            color: rgba(232,230,255,0.5);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}
        .toolbar select, .toolbar input[type="text"] {{
            padding: 0.5rem 1rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 8px;
            color: #e8e6ff;
            font-family: inherit;
            font-size: 0.85rem;
            cursor: pointer;
            outline: none;
        }}
        .toolbar input[type="text"] {{
            width: 220px;
            cursor: text;
        }}
        .toolbar input[type="range"] {{
            width: 80px;
            accent-color: #5b4fff;
        }}
        .toolbar select:focus, .toolbar input[type="text"]:focus {{
            border-color: #5b4fff;
        }}
        .toolbar select option {{
            background: #1a1a2e;
            color: #e8e6ff;
        }}
        .toolbar .sep {{
            width: 1px;
            height: 24px;
            background: rgba(255,255,255,0.1);
        }}

        .content {{
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }}

        .section-title {{
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(232,230,255,0.4);
            margin-bottom: 1rem;
        }}

        .template-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }}

        .template-card {{
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
        }}
        .template-card:hover {{
            border-color: rgba(91,79,255,0.4);
            box-shadow: 0 8px 32px rgba(91,79,255,0.1);
        }}

        .template-card__header {{
            padding: 1.5rem;
        }}
        .template-card__header h2 {{
            font-size: 1.2rem;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 0.35rem;
        }}
        .template-card__header p {{
            font-size: 0.85rem;
            color: rgba(232,230,255,0.5);
            line-height: 1.5;
        }}

        .template-card__actions {{
            display: flex;
            gap: 0.5rem;
            padding: 0 1.5rem 1.5rem;
        }}

        .btn {{
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 1rem;
            font-family: inherit;
            font-size: 0.8rem;
            font-weight: 600;
            border-radius: 8px;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
            flex: 1;
            justify-content: center;
        }}
        .btn--primary {{
            background: #5b4fff;
            color: #ffffff;
        }}
        .btn--primary:hover {{
            background: #4a3fee;
            box-shadow: 0 4px 12px rgba(91,79,255,0.3);
        }}
        .btn--secondary {{
            background: rgba(255,255,255,0.06);
            color: #e8e6ff;
            border: 1px solid rgba(255,255,255,0.12);
        }}
        .btn--secondary:hover {{
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
        }}

        .info {{
            padding: 1.5rem;
            background: rgba(255,255,255,0.03);
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.06);
            font-size: 0.85rem;
            color: rgba(232,230,255,0.5);
            line-height: 1.7;
        }}
        .info strong {{
            color: rgba(232,230,255,0.8);
        }}
        .info code {{
            background: rgba(255,255,255,0.08);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.8rem;
        }}

        .mobile-preview-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }}

        .mobile-preview-card {{
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            overflow: hidden;
        }}
        .mobile-preview-card__header {{
            padding: 1rem 1.25rem;
            border-bottom: 1px solid rgba(255,255,255,0.06);
        }}
        .mobile-preview-card__header h3 {{
            font-size: 0.95rem;
            font-weight: 600;
            color: #ffffff;
        }}
        .mobile-preview-card__frame {{
            padding: 1rem;
            display: flex;
            justify-content: center;
        }}
        .phone-frame {{
            width: 220px;
            height: 400px;
            border: 2px solid rgba(255,255,255,0.15);
            border-radius: 20px;
            overflow: hidden;
            background: #000;
            position: relative;
        }}
        .phone-frame::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 80px;
            height: 6px;
            background: rgba(255,255,255,0.2);
            border-radius: 0 0 4px 4px;
            z-index: 10;
        }}
        .phone-frame iframe {{
            width: 375px;
            height: 812px;
            border: none;
            transform: scale(0.587);
            transform-origin: top left;
        }}

        @media (max-width: 768px) {{
            .header h1 {{ font-size: 1.5rem; }}
            .content {{ padding: 1rem; }}
            .template-grid {{ grid-template-columns: 1fr; }}
            .mobile-preview-grid {{ grid-template-columns: 1fr 1fr; }}
        }}
        @media (max-width: 480px) {{
            .mobile-preview-grid {{ grid-template-columns: 1fr; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Portal Template Viewer</h1>
        <p>Preview desktop and mobile views for all captive portal templates</p>
        <a href="../portal_wizard.html" style="display:inline-flex;align-items:center;gap:8px;margin-top:1rem;padding:10px 20px;background:linear-gradient(135deg,#5b4fff,#7c6fff);color:#fff;border-radius:10px;text-decoration:none;font-size:.85rem;font-weight:700;transition:all .15s">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Open Design Studio
        </a>
    </div>

    <div class="toolbar">
        <label>Palette:</label>
        <select id="palette-select" onchange="updateAll()">
            {palette_options}
        </select>
        <div class="sep"></div>
        <label>Font:</label>
        <select id="font-select" onchange="updateAll()">
            {font_options}
        </select>
        <div class="sep"></div>
        <label>BG Image:</label>
        <input type="text" id="bgimg-input" placeholder="Paste image URL..." onchange="updateAll()">
        <div class="sep"></div>
        <label>Blur:</label>
        <input type="range" id="blur-slider" min="0" max="20" step="1" value="0" onchange="updateAll()">
    </div>

    <div class="content">
        <div class="section-title">Desktop Previews</div>
        <div class="template-grid">
            {template_cards}
        </div>

        <div class="section-title">Mobile Previews (375px viewport)</div>
        <div class="mobile-preview-grid">
            <div class="mobile-preview-card">
                <div class="mobile-preview-card__header">
                    <h3>Dashboard</h3>
                </div>
                <div class="mobile-preview-card__frame">
                    <div class="phone-frame">
                        <iframe src="mobile_dashboard.html" loading="lazy"></iframe>
                    </div>
                </div>
            </div>
            <div class="mobile-preview-card">
                <div class="mobile-preview-card__header">
                    <h3>Spotlight</h3>
                </div>
                <div class="mobile-preview-card__frame">
                    <div class="phone-frame">
                        <iframe src="mobile_spotlight.html" loading="lazy"></iframe>
                    </div>
                </div>
            </div>
            <div class="mobile-preview-card">
                <div class="mobile-preview-card__header">
                    <h3>Split</h3>
                </div>
                <div class="mobile-preview-card__frame">
                    <div class="phone-frame">
                        <iframe src="mobile_split.html" loading="lazy"></iframe>
                    </div>
                </div>
            </div>
            <div class="mobile-preview-card">
                <div class="mobile-preview-card__header">
                    <h3>Bento</h3>
                </div>
                <div class="mobile-preview-card__frame">
                    <div class="phone-frame">
                        <iframe src="mobile_bento.html" loading="lazy"></iframe>
                    </div>
                </div>
            </div>
        </div>

        <div class="info">
            <strong>Templates rendered with:</strong> Midnight Indigo palette, Inter font, 16px card radius<br>
            <strong>Source files:</strong> <code>backend/app/templates/portal_dashboard.html</code>,
            <code>portal_spotlight.html</code>, <code>portal_split.html</code>, <code>portal_bento.html</code><br>
            <strong>Mobile preview:</strong> Each template is rendered at 375px width (iPhone SE/Mini viewport)<br>
            <strong>To view with different palettes:</strong> Select from the dropdown above, or edit <code>view_templates.py</code>
        </div>
    </div>

    <script>
        function updateAll() {{
            var pi = document.getElementById('palette-select').value;
            var font = document.getElementById('font-select').value;
            var bgimg = document.getElementById('bgimg-input').value;
            var blur = document.getElementById('blur-slider').value;

            var params = '?palette=' + pi + '&font=' + encodeURIComponent(font);
            if (bgimg) params += '&bgimg=' + encodeURIComponent(bgimg);
            params += '&blur=' + blur;

            // Reload iframes
            document.querySelectorAll('iframe').forEach(function(iframe) {{
                var base = iframe.src.split('?')[0];
                iframe.src = base + params;
            }});
            // Reload desktop links
            document.querySelectorAll('.btn--primary, .btn--secondary').forEach(function(link) {{
                var base = link.href.split('?')[0];
                link.href = base + params;
            }});
        }}
    </script>
</body>
</html>"""


def generate_mobile_wrapper(template_html: str, template_name: str) -> str:
    """Wrap a template in a mobile viewport container."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=375, initial-scale=1.0">
    <title>{template_name} - Mobile Preview</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        html, body {{ width: 375px; overflow-x: hidden; }}
    </style>
</head>
<body>
    {template_html}
</body>
</html>"""


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    rendered = []
    for tmpl in TEMPLATES:
        print(f"Rendering {tmpl['name']}...")

        # Desktop version
        html = render_template(tmpl["file"], palette_idx=0)
        filename = f"{tmpl['id']}.html"
        (OUTPUT_DIR / filename).write_text(html, encoding="utf-8")
        print(f"  -> Desktop: {OUTPUT_DIR / filename}")

        # Mobile version (constrained to 375px)
        mobile_html = generate_mobile_wrapper(html, tmpl["name"])
        mobile_filename = f"mobile_{tmpl['id']}.html"
        (OUTPUT_DIR / mobile_filename).write_text(mobile_html, encoding="utf-8")
        print(f"  -> Mobile:  {OUTPUT_DIR / mobile_filename}")

        rendered.append({**tmpl, "filename": filename})

    index_html = generate_index(rendered)
    (OUTPUT_DIR / "index.html").write_text(index_html, encoding="utf-8")
    print(f"\nIndex page saved to {OUTPUT_DIR / 'index.html'}")
    print(f"\nOpen in browser: file:///{OUTPUT_DIR / 'index.html'}")


if __name__ == "__main__":
    main()
