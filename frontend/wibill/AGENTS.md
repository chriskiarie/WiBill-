<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-tokens -->
# WiBill Design Tokens (ISP Dashboard)

Apply these when building or updating any `/dashboard/*` page.

## Color
```ts
const C = {
  void: '#000000',             // page background
  base: '#0a0a0a',             // card surface
  border: '#141414',           // subtle borders
  border2: '#1a1a1a',
  text: '#f0f0f0',             // primary text
  dim: '#666666',              // secondary/supporting text
  mute: '#2a2a2a',             // inactive indicators
  gold: '#E8B84B',             // ★ single accent: progress, brand, CTAs, value highlights
  green: '#22c55e',            // money in, success, online
  red: '#ef4444',              // critical only (not "not configured yet")
  // DO NOT USE: blue (#3b82f6), amber (#f59e0b) — removed from palette
};
```

## Typography
| Role                | Font                   | Size   | Weight | Case       | Color   |
|---------------------|------------------------|--------|--------|------------|---------|
| Page/section header | Space Grotesk          | 20-22px| 700    | normal     | C.text  |
| Card label          | Inter                  | 11px   | 700    | uppercase  | C.dim   |
| Primary value       | DM Mono                | 40px   | 500    | normal     | C.text  |
| Secondary value     | DM Mono                | 22px   | 500    | normal     | varies  |
| Supporting text     | Inter                  | 11px   | 400    | normal     | C.dim   |
| Badge / pill        | DM Mono                | 9-10px | 600-700| uppercase  | varies  |
| Empty state title   | Inter                  | 11px   | 600    | normal     | C.dim   |
| Empty state body    | Inter                  | 11px   | 400    | normal     | C.mute  |

## Spacing Scale
4 / 8 / 12 / 16 / 20 / 24 / 32 / 48

- Card internal padding: `16px` (hero card: `20px`)
- Grid gap between cards: `12px`
- Section bottom margin: `20px`
- Header row bottom margin: `20px`

## Layout
- Revenue hero card: full-width, 40px DM Mono value, trending icon (40×40, 18px icon)
- Weekly cash flow: slim bar chart, 40px bar height, 6px min bar width, gold=today, muted=other
- Supporting cards: 4-column grid, 22px values
- Live Sessions / Recent Payments: 2-column grid, 16px internal padding, matched height
- Quick Actions: row below panels, gold border for pending setup items, neutral for permanent actions

## Gold Usage Rule
Gold (#E8B84B) must be the SINGLE accent. It signals:
- Progress bars
- Active/pending step indicators
- Primary CTAs ("Set up", "Configure")
- Highlighted values (Today's Revenue, This Month)
- Today's bar in the weekly chart

Do NOT use gold for:
- Success states (use green)
- Error states (use red)
- Neutral/cancel actions (use dim/gray)
- Background fills (use base/void)
<!-- END:design-tokens -->
