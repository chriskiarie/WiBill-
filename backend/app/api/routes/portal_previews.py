from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/api/v1/portal-previews", tags=["portal-previews"])

def make_preview(template, shape: str, size: str):
    pkg_padding = {"compact": "1rem", "comfortable": "1.5rem", "large": "2rem"}.get(size, "1.5rem")

    if template == "spotlight":
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spotlight Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Syne', sans-serif;
      background: #0c0c1a; color: #e8e6ff;
      padding: 2rem; min-height: 100vh;
    }}
    .container {{ max-width: 500px; margin: 0 auto; }}
    .header {{ text-align: center; margin-bottom: 3rem; }}
    .header .title {{ font-size: 1.8rem; font-weight: 900; margin-bottom: 0.5rem; }}
    .header .subtitle {{ font-size: 0.9rem; opacity: 0.7; }}
    .pkg-card {{
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: {shape};
      padding: {pkg_padding};
      margin-bottom: 1rem;
    }}
    .pkg-name {{ font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }}
    .pkg-price {{ font-size: 1.4rem; font-weight: 900; color: #8b73ff; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">Spotlight</div>
      <div class="subtitle">Premium WiFi Experience</div>
    </div>
    <div class="pkg-card">
      <div class="pkg-name">1 Hour</div>
      <div class="pkg-price">KES 20</div>
    </div>
    <div class="pkg-card">
      <div class="pkg-name">Daily</div>
      <div class="pkg-price">KES 150</div>
    </div>
  </div>
</body>
</html>"""

    if template == "dashboard":
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Figtree', sans-serif;
      background: #f0f9ff; color: #0c4a6e;
      padding: 1.5rem; min-height: 100vh;
    }}
    .container {{ max-width: 800px; margin: 0 auto; }}
    .header {{
      background: white; padding: 2rem; border-radius: 12px;
      margin-bottom: 1.5rem; border: 1px solid #bae6fd;
    }}
    .header .title {{ font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem; }}
    .header .subtitle {{ color: #0369a1; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }}
    .pkg-card {{
      background: white; border: 1px solid #bae6fd;
      border-radius: {shape};
      padding: {pkg_padding};
    }}
    .pkg-name {{ font-weight: 700; margin-bottom: 0.5rem; }}
    .pkg-price {{ font-size: 1.3rem; color: #0284c7; font-weight: 900; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">📡 WiFi Network</div>
      <div class="subtitle">Fast & Reliable</div>
    </div>
    <div class="grid">
      <div class="pkg-card">
        <div class="pkg-name">1 Hour</div>
        <div class="pkg-price">KES 20</div>
      </div>
      <div class="pkg-card">
        <div class="pkg-name">Daily</div>
        <div class="pkg-price">KES 150</div>
      </div>
    </div>
  </div>
</body>
</html>"""

    if template == "stories":
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stories Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
      font-family: 'Figtree', sans-serif;
      background: #052e16; color: #dcfce7;
      padding: 1.5rem; min-height: 100vh;
    }}
    .container {{ max-width: 100%; }}
    .header {{ text-align: center; margin-bottom: 2rem; }}
    .header .title {{ font-size: 1.6rem; font-weight: 800; }}
    .cards {{ display: flex; gap: 1rem; overflow-x: auto; }}
    .pkg-card {{
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(134,239,172,.15);
      border-radius: {shape};
      padding: {pkg_padding};
      min-width: 280px;
      flex-shrink: 0;
    }}
    .pkg-name {{ font-weight: 700; margin-bottom: 0.5rem; }}
    .pkg-price {{ font-size: 1.3rem; color: #86efac; font-weight: 900; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">📡 Our Plans</div>
    </div>
    <div class="cards">
      <div class="pkg-card">
        <div class="pkg-name">1 Hour</div>
        <div class="pkg-price">KES 20</div>
      </div>
      <div class="pkg-card">
        <div class="pkg-name">Daily</div>
        <div class="pkg-price">KES 150</div>
      </div>
      <div class="pkg-card">
        <div class="pkg-name">Weekly</div>
        <div class="pkg-price">KES 500</div>
      </div>
    </div>
  </div>
</body>
</html>"""

    return make_preview("spotlight", shape, size)


@router.get("/{template_id}", response_class=HTMLResponse)
async def get_portal_preview(
    template_id: str,
    shape: str = Query("16px"),
    size: str = Query("comfortable"),
):
    return make_preview(template_id, shape, size)