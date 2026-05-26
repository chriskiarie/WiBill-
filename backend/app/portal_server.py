"""
MINIMAL FASTAPI SERVER FOR WIBILL PORTAL PREVIEWS

This server handles:
- GET /api/v1/portal-previews/{template_id}
  Returns: HTML portal template with CSS variables + postMessage listener

Requirements:
  pip install fastapi uvicorn python-multipart

Run:
  uvicorn portal_server:app --host 0.0.0.0 --port 8000 --reload

Visit:
  http://localhost:8000/api/v1/portal-previews/spotlight
  http://localhost:8000/api/v1/portal-previews/dashboard
  http://localhost:8000/api/v1/portal-previews/stories
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

app = FastAPI(title="WiBill Portal Previews")

# Enable CORS so iframes can communicate with parent
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


PORTAL_TEMPLATE_BASE = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WiBill Portal — {template_name}</title>
  
  <!-- GOOGLE FONTS FOR ALL TYPOGRAPHY OPTIONS -->
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* ROOT VARIABLES (ALL EDITABLE VIA POSTMESSAGE)                          */
    /* ═══════════════════════════════════════════════════════════════════════ */
    :root {{
      /* COLOR PALETTE */
      --primary-color: #5b4fff;
      --primaryDark: #3a2dcc;
      --bgStart: #0c0c1a;
      --bgEnd: #1a1040;
      --text: #e8e6ff;
      --textDim: rgba(232, 230, 255, 0.5);
      --card: rgba(255, 255, 255, 0.06);
      --cardBorder: rgba(255, 255, 255, 0.12);
      --cardHl: linear-gradient(135deg, rgba(91, 79, 255, 0.5), rgba(139, 115, 255, 0.3));
      --accent: #8b73ff;
      --accentLight: #ede9ff;
      
      /* TYPOGRAPHY */
      --font-heading: 'Syne', sans-serif;
      --font-body: 'Figtree', sans-serif;
      
      /* CARD STYLING */
      --card-radius: 16px;
      --card-scale: 1;
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* GLOBAL STYLES                                                           */
    /* ═══════════════════════════════════════════════════════════════════════ */
    *,
    *::before,
    *::after {{
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }}
    
    html,
    body {{
      height: 100%;
      width: 100%;
      font-family: var(--font-body);
      background: linear-gradient(135deg, var(--bgStart), var(--bgEnd));
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }}
    
    body {{
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* HERO / HEADER SECTION                                                   */
    /* ═══════════════════════════════════════════════════════════════════════ */
    .hero {{
      padding: 2rem;
      text-align: center;
      border-bottom: 1px solid var(--cardBorder);
      animation: fadeIn 0.6s ease-out;
    }}
    
    .hero-emoji {{
      font-size: 3.5rem;
      margin-bottom: 1rem;
      display: inline-block;
    }}
    
    .hero h1 {{
      font-family: var(--font-heading);
      font-size: 2.4rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
      color: var(--text);
      transition: all 0.3s ease;
    }}
    
    .hero p {{
      font-size: 1rem;
      color: var(--textDim);
      margin-bottom: 0.5rem;
      transition: color 0.3s ease;
    }}
    
    .hero .location {{
      color: var(--accent);
      font-weight: 600;
      margin-top: 0.5rem;
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* PACKAGES GRID                                                            */
    /* ═══════════════════════════════════════════════════════════════════════ */
    .packages-container {{
      padding: 2rem;
      flex: 1;
    }}
    
    .packages-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: calc(1.5rem * var(--card-scale));
      max-width: 1200px;
      margin: 0 auto;
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* PACKAGE CARD (CORE INTERACTIVE ELEMENT)                                */
    /* ═══════════════════════════════════════════════════════════════════════ */
    .package-card {{
      background: var(--card);
      border: 2px solid var(--cardBorder);
      border-radius: var(--card-radius);
      padding: calc(1rem * var(--card-scale));
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      animation: slideUp 0.5s ease-out backwards;
    }}
    
    .package-card:nth-child(1) {{ animation-delay: 0.05s; }}
    .package-card:nth-child(2) {{ animation-delay: 0.1s; }}
    .package-card:nth-child(3) {{ animation-delay: 0.15s; }}
    .package-card:nth-child(4) {{ animation-delay: 0.2s; }}
    
    .package-card:hover {{
      transform: translateY(-8px);
      border-color: var(--accent);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
    }}
    
    .package-card.featured {{
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px rgba(91, 79, 255, 0.25), 0 12px 32px rgba(91, 79, 255, 0.18);
    }}
    
    .featured-badge {{
      position: absolute;
      top: -1px;
      right: -1px;
      background: var(--primary-color);
      color: white;
      padding: 0.5rem 1rem;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 0 0 0 16px;
      animation: slideDown 0.4s ease-out;
    }}
    
    .package-name {{
      font-family: var(--font-heading);
      font-size: calc(1.3rem * var(--card-scale));
      font-weight: 800;
      margin-bottom: 0.5rem;
      color: var(--text);
      letter-spacing: -0.01em;
    }}
    
    .package-duration {{
      font-size: 0.85rem;
      color: var(--textDim);
      margin-bottom: 1rem;
      font-weight: 500;
    }}
    
    .package-speed {{
      font-size: 0.95rem;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 1.2rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    
    .package-price {{
      font-family: var(--font-heading);
      font-size: calc(2rem * var(--card-scale));
      font-weight: 900;
      color: var(--primary-color);
      margin-bottom: 1.2rem;
      letter-spacing: -0.02em;
    }}
    
    .package-price-currency {{
      font-size: 0.65em;
      color: var(--textDim);
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* CTA BUTTON                                                               */
    /* ═══════════════════════════════════════════════════════════════════════ */
    .cta-button {{
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 8px;
      padding: calc(0.75rem * var(--card-scale)) calc(1.5rem * var(--card-scale));
      font-family: var(--font-body);
      font-size: calc(0.9rem * var(--card-scale));
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    
    .cta-button:hover {{
      background: var(--primaryDark);
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(91, 79, 255, 0.3);
    }}
    
    .cta-button:active {{
      transform: translateY(0);
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* FOOTER                                                                   */
    /* ═══════════════════════════════════════════════════════════════════════ */
    footer {{
      padding: 1.5rem;
      border-top: 1px solid var(--cardBorder);
      text-align: center;
      font-size: 0.8rem;
      color: var(--textDim);
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* ANIMATIONS                                                               */
    /* ═══════════════════════════════════════════════════════════════════════ */
    @keyframes fadeIn {{
      from {{
        opacity: 0;
      }}
      to {{
        opacity: 1;
      }}
    }}
    
    @keyframes slideUp {{
      from {{
        opacity: 0;
        transform: translateY(20px);
      }}
      to {{
        opacity: 1;
        transform: translateY(0);
      }}
    }}
    
    @keyframes slideDown {{
      from {{
        opacity: 0;
        transform: translateY(-10px);
      }}
      to {{
        opacity: 1;
        transform: translateY(0);
      }}
    }}
    
    /* ═══════════════════════════════════════════════════════════════════════ */
    /* RESPONSIVE                                                               */
    /* ═══════════════════════════════════════════════════════════════════════ */
    @media (max-width: 768px) {{
      .hero h1 {{
        font-size: 1.8rem;
      }}
      
      .packages-grid {{
        grid-template-columns: 1fr;
      }}
    }}
  </style>
</head>
<body>
  <!-- HERO SECTION -->
  <div class="hero">
    <div class="hero-emoji" id="brand-emoji">📡</div>
    <h1 id="brand-name">Vertex WiFi</h1>
    <p id="brand-tagline">Fast, affordable internet for everyone.</p>
    <p class="location" id="brand-location">📍 Nairobi CBD</p>
  </div>
  
  <!-- PACKAGES SECTION -->
  <div class="packages-container">
    <div class="packages-grid" id="packages-grid">
      <!-- Generated by JavaScript below -->
    </div>
  </div>
  
  <!-- FOOTER -->
  <footer id="footer-content">
    Terms & Privacy · Vertex WiFi © 2025
  </footer>
  
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- POSTMESSAGE LISTENER: HANDLES REAL-TIME UPDATES FROM WIZARD            -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <script>
    // Sample packages
    const PACKAGES = [
      {{
        name: '1 Hour',
        duration: '60 min',
        speed: '10 Mbps',
        price: 20,
        featured: false,
      }},
      {{
        name: '6 Hours',
        duration: '6 hrs',
        speed: 'Unlimited',
        price: 80,
        featured: true,
      }},
      {{
        name: 'Daily',
        duration: '24 hrs',
        speed: 'Unlimited',
        price: 150,
        featured: false,
      }},
      {{
        name: 'Weekly',
        duration: '7 days',
        speed: 'Unlimited',
        price: 500,
        featured: false,
      }},
    ];
    
    // Render packages on load
    function renderPackages() {{
      const grid = document.getElementById('packages-grid');
      grid.innerHTML = PACKAGES.map((pkg, idx) => `
        <div class="package-card ${{pkg.featured ? 'featured' : ''}}" style="animation-delay: ${{idx * 0.05}}s">
          ${{pkg.featured ? '<div class="featured-badge">⭐ POPULAR</div>' : ''}}
          <div class="package-name">${{pkg.name}}</div>
          <div class="package-duration">${{pkg.duration}}</div>
          <div class="package-speed">${{pkg.speed}}</div>
          <div class="package-price">
            <span class="package-price-currency">KES</span><br>
            ${{pkg.price}}
          </div>
          <button class="cta-button">Select Plan</button>
        </div>
      `).join('');
    }}
    
    // ─────────────────────────────────────────────────────────────────────────
    // CRITICAL: LISTEN FOR POSTMESSAGE EVENTS FROM PARENT WIZARD
    // ─────────────────────────────────────────────────────────────────────────
    window.addEventListener('message', function(event) {{
      const data = event.data;
      if (!data || !data.type) return;
      
      const root = document.documentElement;
      
      // MESSAGE TYPE 1: UPDATE_PALETTE (Colors)
      if (data.type === 'UPDATE_PALETTE') {{
        console.log('🎨 Portal received palette update:', data.colors.name);
        
        // Apply each color property
        root.style.setProperty('--primary-color', data.colors.primary);
        root.style.setProperty('--primaryDark', data.colors.primaryDark);
        root.style.setProperty('--bgStart', data.colors.bgStart);
        root.style.setProperty('--bgEnd', data.colors.bgEnd);
        root.style.setProperty('--text', data.colors.text);
        root.style.setProperty('--textDim', data.colors.textDim);
        root.style.setProperty('--card', data.colors.card);
        root.style.setProperty('--cardBorder', data.colors.cardBorder);
        root.style.setProperty('--cardHl', data.colors.cardHl);
        root.style.setProperty('--accent', data.colors.accent);
        root.style.setProperty('--accentLight', data.colors.accentLight);
      }}
      
      // MESSAGE TYPE 2: UPDATE_BRAND_NAME
      if (data.type === 'UPDATE_BRAND_NAME') {{
        console.log('📝 Portal received brand name update:', data.name);
        const nameEl = document.getElementById('brand-name');
        if (nameEl) nameEl.textContent = data.name;
      }}
      
      // MESSAGE TYPE 3: UPDATE_TYPOGRAPHY
      if (data.type === 'UPDATE_TYPOGRAPHY') {{
        console.log('🔤 Portal received typography update:', data.font);
        root.style.setProperty('--font-heading', `'${{data.font}}', sans-serif`);
      }}
      
      // MESSAGE TYPE 4: UPDATE_CARD_STYLE
      if (data.type === 'UPDATE_CARD_STYLE') {{
        console.log('📦 Portal received card style update:', data);
        
        if (data.radius) {{
          root.style.setProperty('--card-radius', data.radius);
        }}
        
        if (data.size) {{
          const sizeMap = {{'compact': 0.8, 'comfortable': 1.0, 'large': 1.2}};
          root.style.setProperty('--card-scale', sizeMap[data.size] || 1.0);
        }}
      }}
    }});
    
    // Render on load
    if (document.readyState === 'loading') {{
      document.addEventListener('DOMContentLoaded', renderPackages);
    }} else {{
      renderPackages();
    }}
    
    console.log('✅ Portal preview initialized. Listening for postMessage events...');
  </script>
</body>
</html>
"""


@app.get("/api/v1/portal-previews/{template_id}", response_class=HTMLResponse)
async def get_portal_preview(template_id: str):
    """
    Serves portal template HTML with real-time update listener.
    
    Endpoints:
    - /api/v1/portal-previews/spotlight
    - /api/v1/portal-previews/dashboard
    - /api/v1/portal-previews/stories
    """
    template_names = {
        "spotlight": "Spotlight Dark",
        "dashboard": "Dashboard Light",
        "stories": "Stories Flow",
    }
    
    template_name = template_names.get(template_id, "Portal")
    
    # Return the portal template with postMessage listener
    return PORTAL_TEMPLATE_BASE.format(template_name=template_name)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Portal preview server is running"}


@app.get("/", response_class=HTMLResponse)
async def root():
    """Root endpoint with helpful info"""
    return """
    <h1>✅ WiBill Portal Preview Server</h1>
    <p>Server is running and ready to serve portal templates.</p>
    
    <h2>Available Endpoints:</h2>
    <ul>
      <li><a href="/api/v1/portal-previews/spotlight">GET /api/v1/portal-previews/spotlight</a></li>
      <li><a href="/api/v1/portal-previews/dashboard">GET /api/v1/portal-previews/dashboard</a></li>
      <li><a href="/api/v1/portal-previews/stories">GET /api/v1/portal-previews/stories</a></li>
      <li><a href="/health">GET /health</a></li>
    </ul>
    
    <h2>Test postMessage Communication:</h2>
    <pre><code>
    // Open /api/v1/portal-previews/spotlight
    // Then in console:
    
    window.parent.postMessage({{
      type: 'UPDATE_PALETTE',
      colors: {{
        primary: '#ff00ff',
        primaryDark: '#cc00cc',
        bgStart: '#000000',
        bgEnd: '#111111',
        text: '#ffffff',
        textDim: 'rgba(255,255,255,.5)',
        card: 'rgba(255,255,255,.1)',
        cardBorder: 'rgba(255,255,255,.2)',
        cardHl: 'linear-gradient(135deg, #ff00ff, #cc00cc)',
        accent: '#ff00ff',
        accentLight: '#ffccff'
      }}
    }}, '*');
    </code></pre>
    """


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)