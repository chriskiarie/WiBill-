// app/api/v1/portal-previews/[template]/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface PreviewQuery {
  // Branding
  name?: string;
  tag?: string;
  emoji?: string;
  loc?: string;
  phone?: string;
  
  // Colors (palette index)
  palette?: string;
  
  // Typography
  font?: string;
  
  // Card style
  shape?: string;
  size?: string;
  
  // Features
  mpesa?: string;
  card?: string;
  sms?: string;
  login?: string;
  countdown?: string;
  
  // Packages JSON
  packages?: string;
  
  // Status banner
  showSB?: string;
  sbMsg?: string;
}

// Palette data (same as frontend)
const PALETTES = [
  {
    name: 'Midnight Indigo',
    primary: '#5b4fff',
    primaryDark: '#8b73ff',
    bgStart: '#0c0c1a',
    bgEnd: '#0c0c1a',
    text: '#e8e6ff',
    textDim: 'rgba(232,230,255,.5)',
    card: 'rgba(255,255,255,.06)',
    cardBorder: 'rgba(255,255,255,.12)',
    cardHl: 'linear-gradient(135deg,rgba(91,79,255,.5),rgba(139,115,255,.3))',
    accent: '#8b73ff',
    accentLight: '#8b73ff',
    isDark: true,
  },
  {
    name: 'Nairobi Sun',
    primary: '#f97316',
    primaryDark: '#f97316',
    bgStart: '#fff7ed',
    bgEnd: '#fff7ed',
    text: '#431407',
    textDim: '#a1520b',
    card: '#ffffff',
    cardBorder: '#fed7aa',
    cardHl: '#f97316',
    accent: '#ea6b03',
    accentLight: '#f97316',
    isDark: false,
  },
  {
    name: 'Ocean Deep',
    primary: '#0ea5e9',
    primaryDark: '#0c4a6e',
    bgStart: '#f0f9ff',
    bgEnd: '#f0f9ff',
    text: '#0c4a6e',
    textDim: '#0369a1',
    card: '#ffffff',
    cardBorder: '#bae6fd',
    cardHl: '#0c4a6e',
    accent: '#0284c7',
    accentLight: '#0ea5e9',
    isDark: false,
  },
  {
    name: 'Forest Night',
    primary: '#16a34a',
    primaryDark: '#16a34a',
    bgStart: '#052e16',
    bgEnd: '#052e16',
    text: '#dcfce7',
    textDim: 'rgba(220,252,231,.5)',
    card: 'rgba(255,255,255,.07)',
    cardBorder: 'rgba(134,239,172,.15)',
    cardHl: 'rgba(22,163,74,.3)',
    accent: '#22c55e',
    accentLight: '#86efac',
    isDark: true,
  },
  {
    name: 'Rose Quartz',
    primary: '#f43f5e',
    primaryDark: '#f43f5e',
    bgStart: '#fff1f2',
    bgEnd: '#fff1f2',
    text: '#4c0519',
    textDim: '#881337',
    card: '#ffffff',
    cardBorder: '#fecdd3',
    cardHl: '#f43f5e',
    accent: '#e11d48',
    accentLight: '#f43f5e',
    isDark: false,
  },
  {
    name: 'Obsidian Slate',
    primary: '#1e293b',
    primaryDark: '#1e293b',
    bgStart: '#f8fafc',
    bgEnd: '#f8fafc',
    text: '#0f172a',
    textDim: '#64748b',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    cardHl: '#1e293b',
    accent: '#334155',
    accentLight: '#64748b',
    isDark: false,
  },
  {
    name: 'Amber Dusk',
    primary: '#b45309',
    primaryDark: '#d97706',
    bgStart: '#fffbeb',
    bgEnd: '#fffbeb',
    text: '#451a03',
    textDim: '#92400e',
    card: '#ffffff',
    cardBorder: '#fde68a',
    cardHl: '#d97706',
    accent: '#d97706',
    accentLight: '#fbbf24',
    isDark: false,
  },
  {
    name: 'Electric Violet',
    primary: '#7c3aed',
    primaryDark: '#7c3aed',
    bgStart: '#faf5ff',
    bgEnd: '#faf5ff',
    text: '#2e1065',
    textDim: '#6d28d9',
    card: '#ffffff',
    cardBorder: '#ddd6fe',
    cardHl: '#7c3aed',
    accent: '#6d28d9',
    accentLight: '#7c3aed',
    isDark: false,
  },
];

// Portal template HTML generators
function generateSpotlightPortal(params: any, palette: any): string {
  const { name, tag, emoji, loc, phone, packages, showSB, sbMsg, font } = params;
  
  const fontFamily = font === 'Space Mono' ? "'Space Mono', monospace" :
                     font === 'Cabinet Grotesk' ? "'Cabinet Grotesk', sans-serif" :
                     font === 'Syne' ? "'Syne', sans-serif" :
                     "'Figtree', sans-serif";

  const pkgs = packages ? JSON.parse(decodeURIComponent(packages)) : [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - WiFi Portal</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: ${palette.primary};
      --primary-dark: ${palette.primaryDark};
      --bg: ${palette.bgStart};
      --text: ${palette.text};
      --text-dim: ${palette.textDim};
      --card: ${palette.card};
      --card-border: ${palette.cardBorder};
      --accent: ${palette.accent};
      --font: ${fontFamily};
    }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    .container {
      max-width: 390px;
      margin: 0 auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .hero {
      padding: 2rem 1.5rem 3rem;
      text-align: center;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
    }
    .hero-emoji {
      font-size: 3.5rem;
      margin-bottom: 0.8rem;
    }
    .hero h1 {
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.02em;
      margin-bottom: 0.3rem;
      line-height: 1.2;
    }
    .hero .tag {
      font-size: 0.9rem;
      opacity: 0.9;
      margin-bottom: 0.8rem;
    }
    .hero .location {
      font-size: 0.85rem;
      opacity: 0.8;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.3rem;
    }
    .status-banner {
      background: rgba(16, 185, 129, 0.15);
      border-left: 3px solid #10b981;
      padding: 0.8rem 1rem;
      margin: 1.5rem;
      border-radius: 8px;
      font-size: 0.85rem;
      color: var(--text);
    }
    .packages {
      padding: 1.5rem;
      flex: 1;
    }
    .package-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.2rem;
      margin-bottom: 1rem;
      position: relative;
      transition: all 0.3s;
    }
    .package-card:hover {
      border-color: var(--primary);
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    }
    .package-card.featured {
      border: 2px solid var(--primary);
      background: linear-gradient(135deg, var(--primary), transparent 100%);
      background-clip: padding-box;
    }
    .package-card.featured::before {
      content: '⭐ POPULAR';
      position: absolute;
      top: -12px;
      left: 1rem;
      background: var(--primary);
      color: #fff;
      padding: 0.3rem 0.7rem;
      border-radius: 99px;
      font-size: 0.65rem;
      font-weight: 700;
    }
    .pkg-name {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .pkg-specs {
      font-size: 0.8rem;
      color: var(--text-dim);
      margin-bottom: 1rem;
      display: flex;
      gap: 1rem;
    }
    .pkg-price {
      font-size: 1.8rem;
      font-weight: 900;
      color: var(--primary);
      margin-bottom: 1rem;
    }
    .pkg-btn {
      width: 100%;
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 0.8rem;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font);
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .pkg-btn:hover {
      opacity: 0.9;
      transform: scale(1.02);
    }
    .footer {
      padding: 1.5rem;
      text-align: center;
      border-top: 1px solid var(--card-border);
      font-size: 0.75rem;
      color: var(--text-dim);
    }
    .contact-btn {
      display: inline-block;
      background: transparent;
      border: 1px solid var(--primary);
      color: var(--primary);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.8rem;
      text-decoration: none;
      margin-top: 1rem;
      cursor: pointer;
      font-family: var(--font);
      transition: all 0.2s;
    }
    .contact-btn:hover {
      background: var(--primary);
      color: #fff;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="hero-emoji">${emoji || '📡'}</div>
      <h1>${name || 'WiFi Zone'}</h1>
      <p class="tag">${tag || 'Stay connected'}</p>
      <div class="location">📍 ${loc || 'Nairobi'}</div>
    </div>

    ${showSB === 'true' ? `
    <div class="status-banner">
      ${sbMsg || '✅ Internet is live and running'}
    </div>
    ` : ''}

    <div class="packages">
      ${pkgs.length > 0 ? pkgs.map((p: any) => `
        <div class="package-card ${p.star ? 'featured' : ''}">
          <div class="pkg-name">${p.n || 'Plan'}</div>
          <div class="pkg-specs">
            <span>⏱ ${p.d || '1 hr'}</span>
            <span>⚡ ${p.s || '10 Mbps'}</span>
          </div>
          <div class="pkg-price">Ksh ${p.p || 50}</div>
          <button class="pkg-btn">Select Plan</button>
        </div>
      `).join('') : '<p style="text-align: center; color: var(--text-dim);">No packages available</p>'}
    </div>

    <div class="footer">
      <p>Need help? <a href="tel:${phone || '+254700123456'}" class="contact-btn">📞 Call us</a></p>
      <p style="margin-top: 1rem; opacity: 0.6;">© 2025 ${name || 'WiFi Zone'}</p>
    </div>
  </div>

  <script>
    // Listen for postMessage updates from wizard
    window.addEventListener('message', (e) => {
      if (e.data.type === 'UPDATE_PALETTE') {
        const { colors } = e.data;
        document.documentElement.style.setProperty('--primary', colors.primary);
        document.documentElement.style.setProperty('--primary-dark', colors.primaryDark);
        document.documentElement.style.setProperty('--bg', colors.bgStart);
        document.documentElement.style.setProperty('--text', colors.text);
        document.documentElement.style.setProperty('--text-dim', colors.textDim);
        document.documentElement.style.setProperty('--card', colors.card);
        document.documentElement.style.setProperty('--card-border', colors.cardBorder);
        document.documentElement.style.setProperty('--accent', colors.accent);
      }
      if (e.data.type === 'UPDATE_BRAND_NAME') {
        document.querySelector('h1').textContent = e.data.name;
      }
      if (e.data.type === 'UPDATE_TYPOGRAPHY') {
        const font = e.data.font === 'Space Mono' ? "'Space Mono', monospace" :
                     e.data.font === 'Cabinet Grotesk' ? "'Cabinet Grotesk', sans-serif" :
                     e.data.font === 'Syne' ? "'Syne', sans-serif" :
                     "'Figtree', sans-serif";
        document.documentElement.style.setProperty('--font', font);
      }
    });
  </script>
</body>
</html>
  `;
}

function generateDashboardPortal(params: any, palette: any): string {
  const { name, tag, emoji, loc, phone, packages, showSB, sbMsg, font } = params;
  
  const fontFamily = font === 'Space Mono' ? "'Space Mono', monospace" :
                     font === 'Cabinet Grotesk' ? "'Cabinet Grotesk', sans-serif" :
                     font === 'Syne' ? "'Syne', sans-serif" :
                     "'Figtree', sans-serif";

  const pkgs = packages ? JSON.parse(decodeURIComponent(packages)) : [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: ${palette.primary};
      --bg: ${palette.bgStart};
      --text: ${palette.text};
      --text-dim: ${palette.textDim};
      --card: ${palette.card};
      --card-border: ${palette.cardBorder};
      --accent: ${palette.accent};
      --font: ${fontFamily};
    }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
    }
    .sidebar {
      width: 260px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: #fff;
      padding: 2rem 1.5rem;
      display: none;
    }
    .main {
      flex: 1;
      padding: 2rem;
      max-width: 390px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 1.8rem;
      font-weight: 900;
      margin-bottom: 0.3rem;
    }
    .header p {
      color: var(--text-dim);
      font-size: 0.9rem;
    }
    .packages {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .pkg-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.5rem;
      transition: all 0.3s;
    }
    .pkg-card:hover {
      border-color: var(--primary);
      transform: translateY(-4px);
    }
    .pkg-name {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    .pkg-price {
      font-size: 1.6rem;
      font-weight: 900;
      color: var(--primary);
      margin-bottom: 0.8rem;
    }
    .pkg-btn {
      width: 100%;
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 0.8rem;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font);
    }
  </style>
</head>
<body>
  <div class="main">
    <div class="header">
      <h1>${emoji || '📡'} ${name || 'WiFi'}</h1>
      <p>${tag || 'Fast internet'} • ${loc || 'Nairobi'}</p>
    </div>

    <div class="packages">
      ${pkgs.length > 0 ? pkgs.map((p: any) => `
        <div class="pkg-card">
          <div class="pkg-name">${p.n || 'Plan'}</div>
          <div class="pkg-price">Ksh ${p.p || 50}</div>
          <button class="pkg-btn">Buy Now</button>
        </div>
      `).join('') : '<p>No packages</p>'}
    </div>
  </div>
</body>
</html>
  `;
}

function generateStoriesPortal(params: any, palette: any): string {
  const { name, tag, emoji, loc, phone, packages, showSB, sbMsg, font } = params;
  
  const fontFamily = font === 'Space Mono' ? "'Space Mono', monospace" :
                     font === 'Cabinet Grotesk' ? "'Cabinet Grotesk', sans-serif" :
                     font === 'Syne' ? "'Syne', sans-serif" :
                     "'Figtree', sans-serif";

  const pkgs = packages ? JSON.parse(decodeURIComponent(packages)) : [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - Stories</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --primary: ${palette.primary};
      --bg: ${palette.bgStart};
      --text: ${palette.text};
      --text-dim: ${palette.textDim};
      --card: ${palette.card};
      --card-border: ${palette.cardBorder};
      --font: ${fontFamily};
    }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }
    .container {
      max-width: 390px;
      margin: 0 auto;
      padding: 1.5rem;
    }
    .title {
      font-size: 2rem;
      font-weight: 900;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-dim);
      margin-bottom: 2rem;
    }
    .cards-scroll {
      display: flex;
      gap: 1rem;
      overflow-x: auto;
      padding-bottom: 1rem;
      scroll-behavior: smooth;
    }
    .cards-scroll::-webkit-scrollbar {
      height: 6px;
    }
    .cards-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .cards-scroll::-webkit-scrollbar-thumb {
      background: var(--primary);
      border-radius: 99px;
    }
    .story-card {
      flex-shrink: 0;
      width: 320px;
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      transition: all 0.3s;
    }
    .story-card:hover {
      border-color: var(--primary);
      transform: translateY(-6px);
    }
    .story-emoji {
      font-size: 2.5rem;
      margin-bottom: 0.8rem;
    }
    .story-name {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 0.3rem;
    }
    .story-price {
      font-size: 1.4rem;
      font-weight: 900;
      color: var(--primary);
      margin-bottom: 1rem;
    }
    .story-btn {
      width: 100%;
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 0.8rem;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 class="title">${emoji || '📡'}</h1>
    <p class="subtitle">${tag || 'Stay online'}</p>

    <div class="cards-scroll">
      ${pkgs.length > 0 ? pkgs.map((p: any) => `
        <div class="story-card">
          <div class="story-emoji">⚡</div>
          <div class="story-name">${p.n || 'Plan'}</div>
          <div class="story-price">Ksh ${p.p || 50}</div>
          <button class="story-btn">Select</button>
        </div>
      `).join('') : '<p>No packages</p>'}
    </div>
  </div>
</body>
</html>
  `;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { template: string } }
) {
  try {
    const { template } = params;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const paletteIdx = parseInt(searchParams.get('palette') || '0');
    const palette = PALETTES[paletteIdx] || PALETTES[0];

    const portalParams = {
      name: searchParams.get('name'),
      tag: searchParams.get('tag'),
      emoji: searchParams.get('emoji'),
      loc: searchParams.get('loc'),
      phone: searchParams.get('phone'),
      font: searchParams.get('font'),
      packages: searchParams.get('packages'),
      showSB: searchParams.get('showSB'),
      sbMsg: searchParams.get('sbMsg'),
      shape: searchParams.get('shape'),
      size: searchParams.get('size'),
    };

    let html = '';

    switch (template) {
      case 'spotlight':
        html = generateSpotlightPortal(portalParams, palette);
        break;
      case 'dashboard':
        html = generateDashboardPortal(portalParams, palette);
        break;
      case 'stories':
        html = generateStoriesPortal(portalParams, palette);
        break;
      default:
        return NextResponse.json({ error: 'Unknown template' }, { status: 404 });
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Portal preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}