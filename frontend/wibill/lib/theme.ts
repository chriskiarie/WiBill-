// Central theme accent system for the ISP dashboard.
// The classic `gold` uses the same ledger as before, but the accent is
// fully themeable via the Topbar avatar picker and persists in localStorage
// under `wb_accent`.

export interface Accent {
  id: string
  color: string
}

export const ACCENTS: Accent[] = [
  { id: 'gold', color: '#E8B84B' },
  { id: 'green', color: '#22c55e' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'purple', color: '#a855f7' },
  { id: 'orange', color: '#f59e0b' },
]

export function isValidHex(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color)
}

// Mix a #rrggbb hex toward white by factor f (0..1).
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const cr = Math.round(r + (255 - r) * f)
  const cg = Math.round(g + (255 - g) * f)
  const cb = Math.round(b + (255 - b) * f)
  return '#' + ((1 << 24) + (cr << 16) + (cg << 8) + cb).toString(16).slice(1)
}

// Apply the accent color to CSS custom properties on <html>. Also persists it
// so it survives reloads and logins/logouts (auth is cleared, theme is not).
export function applyAccent(color: string) {
  if (!isValidHex(color)) return
  const root = document.documentElement
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  root.style.setProperty('--theme-gold', color)
  root.style.setProperty('--gold', color)
  // Derived tokens so borders, soft fills and gradient ends follow the accent.
  root.style.setProperty('--theme-gold-bright', shade(color, 0.25))
  root.style.setProperty('--theme-gold-soft', `rgba(${r},${g},${b},0.07)`)
  root.style.setProperty('--theme-gold-border', `rgba(${r},${g},${b},0.22)`)
  // Sidebar active state + brand gradient.
  root.style.setProperty('--sidebar-active-bg', `rgba(${r},${g},${b},0.06)`)
  root.style.setProperty('--brand-gradient', `linear-gradient(135deg, ${color} 0%, #22c55e 100%)`)
  localStorage.setItem('wb_accent', color)
}

// Static, self-contained copy of applyAccent for use inside an inline
// <script> in the root layout in order to apply the saved accent before first
// paint (no flash of the default gold on any route, including /login).
export const ACCENT_INLINE_SCRIPT = `(function(){
  try {
    var a = localStorage.getItem('wb_accent');
    if (!a || !/^#[0-9a-fA-F]{6}$/.test(a)) return;
    var st = document.documentElement.style;
    var r = parseInt(a.slice(1,3),16), g = parseInt(a.slice(3,5),16), b = parseInt(a.slice(5,7),16);
    function shade(hex,f){var n=parseInt(hex.slice(1),16);var R=(n>>16)&255,G=(n>>8)&255,B=n&255;return '#'+((1<<24)+(Math.round(R+(255-R)*f)<<16)+(Math.round(G+(255-G)*f)<<8)+Math.round(B+(255-B)*f)).toString(16).slice(1);}
    st.setProperty('--theme-gold', a);
    st.setProperty('--gold', a);
    st.setProperty('--theme-gold-bright', shade(a, 0.25));
    st.setProperty('--theme-gold-soft', 'rgba('+r+','+g+','+b+',0.07)');
    st.setProperty('--theme-gold-border', 'rgba('+r+','+g+','+b+',0.22)');
    st.setProperty('--sidebar-active-bg', 'rgba('+r+','+g+','+b+',0.06)');
    st.setProperty('--brand-gradient', 'linear-gradient(135deg, '+a+' 0%, #22c55e 100%)');
  } catch(e) {}
})();`