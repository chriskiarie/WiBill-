from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/api/v1/portal-previews", tags=["portal-previews"])

SPOTLIGHT_PREVIEW = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Spotlight Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Syne', sans-serif;
      background: #0c0c1a;
      color: #e8e6ff;
      padding: 2rem;
      min-height: 100vh;
    }
    .container { max-width: 500px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 3rem; }
    .logo { font-size: 3rem; margin-bottom: 1rem; }
    .title { font-size: 1.8rem; font-weight: 900; margin-bottom: 0.5rem; }
    .subtitle { font-size: 0.9rem; opacity: 0.7; }
    .pkg-card {
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .pkg-name { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
    .pkg-price { font-size: 1.4rem; font-weight: 900; color: #8b73ff; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">📡</div>
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

DASHBOARD_PREVIEW = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Figtree', sans-serif;
      background: #f0f9ff;
      color: #0c4a6e;
      padding: 1.5rem;
      min-height: 100vh;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 1px solid #bae6fd;
    }
    .title { font-size: 1.6rem; font-weight: 800; margin-bottom: 0.5rem; }
    .subtitle { color: #0369a1; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .pkg-card {
      background: white;
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 1.5rem;
    }
    .pkg-name { font-weight: 700; margin-bottom: 0.5rem; }
    .pkg-price { font-size: 1.3rem; color: #0284c7; font-weight: 900; }
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

STORIES_PREVIEW = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stories Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Figtree', sans-serif;
      background: #052e16;
      color: #dcfce7;
      padding: 1.5rem;
      min-height: 100vh;
    }
    .container { max-width: 100%; }
    .header { text-align: center; margin-bottom: 2rem; }
    .title { font-size: 1.6rem; font-weight: 800; }
    .cards { display: flex; gap: 1rem; overflow-x: auto; }
    .pkg-card {
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(134,239,172,.15);
      border-radius: 12px;
      padding: 1.5rem;
      min-width: 280px;
      flex-shrink: 0;
    }
    .pkg-name { font-weight: 700; margin-bottom: 0.5rem; }
    .pkg-price { font-size: 1.3rem; color: #86efac; font-weight: 900; }
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

@router.get("/{template_id}", response_class=HTMLResponse)
async def get_portal_preview(template_id: str):
    """Return HTML preview for wizard iframe - static preview templates"""
    previews = {
        "spotlight": SPOTLIGHT_PREVIEW,
        "dashboard": DASHBOARD_PREVIEW,
        "stories": STORIES_PREVIEW,
    }
    
    html = previews.get(template_id, SPOTLIGHT_PREVIEW)
    return html