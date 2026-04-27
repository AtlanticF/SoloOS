# Design System: SoloOS

## 1. Visual Theme & Atmosphere

SoloOS feels like a command center, not a dashboard. The aesthetic is **developer-dense and deliberately dark** — inspired by the typographic clarity of Claude and the information density of Cursor. Every pixel earns its place by serving data.

The overall mood is: **Focused. Sovereign. Operational.** Dark zinc surfaces absorb ambient noise. Colored accents fire only when something meaningful has happened. Motion is purposeful — a sheet slides in to tell you something; it doesn't animate to entertain you.

This is a local-first tool with no cloud, no noise, and no decorative chrome. The UI communicates system state, not personality.

## 2. Color Palette & Roles

**Surfaces** — layered depth through darkness alone, no shadows needed:
- Void (`#0a0a0a`) — page background; the deepest layer
- Card (`#111111`) — primary content containers, panels, and sidebars
- Raised (`#18181b`) — inputs, hover states, and secondary surfaces
- Border (`#1e1e22`) — all dividers and card outlines; barely visible, just enough

**Text hierarchy** — five levels, each lighter than the last:
- Primary (`#e4e4e7`) — headlines, active labels, and values that matter
- Secondary (`#a1a1aa`) — body copy, event content, and descriptions
- Muted (`#71717a`) — supporting metadata and secondary labels
- Dim (`#52525b`) — section headers in uppercase, faint supporting text
- Ghost (`#3f3f46`) — timestamps, IDs, and everything that should recede

**Five Pillar Accents** — each pillar owns one color used consistently across badges, chart axes, card borders, and progress bars:
- Input · Emerald (`#10b981`) — knowledge intake, research, learning
- Output · Indigo (`#6366f1`) — commits, deliverables, shipped work
- Audience · Amber (`#f59e0b`) — growth, user acquisition, meetings
- Financial · Red (`#ef4444`) — revenue events and cash flow
- Energy · Violet (`#8b5cf6`) — personal state, anomalous signals

**Pillar badge backgrounds** use the accent color at 12% opacity — vivid enough to identify at a glance, subtle enough not to compete with content.

**Semantic accents:**
- Success / positive delta: Emerald (`#10b981`)
- Warning / review pending: Amber (`#f59e0b`)
- Destructive / disconnect: Red (`#ef4444`)
- Local status indicator: Emerald (`#10b981`) — the single green dot that means "all systems up"

## 3. Typography Rules

Two typefaces only. No exceptions, no mixing of roles.

**Inter** — all UI copy: navigation labels, card headings, body text, button labels, section headers. Weights: 400 (body), 500 (medium emphasis), 600 (headings, labels), 700 (display values). Letter-spacing: tight on headings (−0.5px on display, −0.3px on headings), slightly open on uppercase section labels (+0.08em).

**JetBrains Mono** — all data values: metric numbers, timestamps, IDs, impact scores, confidence percentages, and anything that changes over time. Weights: 400 (timestamps, meta) and 700 (primary metrics). Letter-spacing tight (−0.5px) on large metric values.

**Scale:**
- Display metric: Mono 20px / 700 — the number on a Pulse card
- Heading: Inter 14px / 600 — card titles, page titles
- Section label: Inter 11px / 600 / uppercase / +0.08em tracking — "BALANCE", "RECENT EVENTS"
- Body: Inter 13px / 400 — event content, descriptions
- Meta / timestamp: Mono 10px / 400 — dates, IDs, classifiers

The rule: if it's a label, it's Inter. If it's a reading, it's Mono.

## 4. Component Stylings

**Sidebar** — Fixed 48px-wide strip on the far left. Icon-only; no labels. Active route gets a slightly raised zinc surface (`#18181b`) behind its icon and full-brightness white text. Inactive icons are dim zinc (`#52525b`) and brighten on hover. A 6px indigo square logo mark sits at the top. Settings icon anchors the bottom. No tooltips on desktop — the icons are universally understood in this context.

**Topbar** — 40px fixed strip spanning the full content width. Page title sits left in Inter 14px / 600. Status pills float right: a "Review pending" pill appears in amber when this week's retrospective is incomplete; a "Local" pill with a green dot confirms the database connection. Both pills use a filled rounded-full shape with a matching low-opacity border — they look like hardware indicators, not UI badges.

**Pillar Badges** — Small pill-shaped labels: 1.5px horizontal / 0.5px vertical padding, Mono or Inter 10–11px bold, all caps. Background is the pillar's accent color at 12% opacity; text is the full accent color. Used in event rows, timeline entries, NodeSheet headers, and section headings.

**Cards / Containers** — Uniform dark background (`#111`), 1px border at `#1e1e22`, subtly rounded corners (8px radius). No shadows. Padding is developer-dense: 16px on most cards. Project cards in the bento grid show a 3px accent border on the top edge (the project's primary pillar color) when active. Dormant projects use a gray border to signal reduced energy.

**Pulse Cards** — A subtype of Card used on the Cockpit. Label in Inter 11px / 600 / uppercase / dim zinc. Value in Mono 20px / 700 / primary white. Delta line in Inter 12px / 400 in Emerald (positive) or Muted zinc (neutral). When in alert state (Energy pillar is low), the entire card border glows in Violet at 40% opacity and the label, value, and delta all shift to Violet.

**Event Timeline Rows** — 32px height, full-width clickable buttons. Left: pillar badge (3-letter abbreviation). Center: content label truncated with ellipsis, muted zinc. Right: Mono timestamp in ghost zinc. A 1px border at `#18181b` separates rows. Hover shows a subtle zinc-900 background wash.

**NodeSheet** — shadcn Sheet sliding from the right at 400px width. Background is Card level (`#0d0d0d`), left border `#1e1e22`. The sheet does not dim the entire page — it overlays Explorer so context is preserved. 180ms ease-out slide animation. Internal sections are separated by hairline Separators at `#1e1e22`. The sheet closes on Escape or click-outside.

**Buttons** — Default: filled zinc-800 background, zinc-100 text, no border. Outline variant: transparent background, 1px border, matching text. For pillar-specific confirm actions, the outline border color is the pillar accent at 20% opacity and the text is the full pillar accent. For destructive disconnect actions, Red (`#ef4444`) border and text.

**Tabs** — shadcn Tabs with a zinc-900 (`#18181b`) list background. Active tab gets a zinc-700 background slab. Labels are Inter 13px / 500. No underline style — the slab makes the active state clear.

**ReviewGate** — A full-screen replacement for the Cockpit. Centered, maximum 512px wide, vertically centered. A lock emoji in an amber-tinted circular container anchors the top. Heading and description in Inter. Textarea is Raised surface, 1px border, 120px fixed height, no resize handle. The submit button is disabled and visually muted until the textarea reaches 20 characters — it becomes primary at that threshold.

## 5. Layout Principles

**Shell structure:** The app is a fixed full-screen layout — no scrolling at the page level. Sidebar (48px) + main column (remaining width). Main column: Topbar (40px fixed) + scrollable content area below.

**Content area:** Fills the remaining space with 20px padding on all sides. No max-width constraint — content expands to fill wide screens, supporting developer multi-monitor setups.

**Information density:** The system targets developer density, not consumer spaciousness. Card padding is 16px. Row height is 32px. Gaps between cards are 8–12px. The goal is to show as much signal as possible in one eye movement per card.

**Bento grid (Explorer Projects):** Auto-fill grid with 220px minimum column width. Cards flow naturally and are equal height. One larger card (2-column span) can anchor a featured project — not used in V1 but the grid structure supports it.

**Radar + Pulse layout (Cockpit):** Two-column grid: 220px fixed for the radar panel, remaining width for the pulse cards. The radar panel is self-contained with its own padding. Pulse cards stack in a 3-column equal-width grid inside the remaining column.

**Spacing scale:** 4px base unit. Common values: 4, 8, 12, 16, 20, 24, 32, 40, 48px. Micro gaps (4–8px) for inline elements. Card padding (16–20px). Section gaps (24–32px).

**Motion policy:** Two animations only. Sheet slide-in: 180ms ease-out. Numeric value changes: 300ms transition on width (progress bars). No decorative motion. Animation means state changed — not decoration.

**Keyboard:** The entire app is navigable by keyboard. `Esc` closes any Sheet or modal. `Tab` moves through interactive elements in DOM order. Navigation between routes is handled by the sidebar NavLink elements.
