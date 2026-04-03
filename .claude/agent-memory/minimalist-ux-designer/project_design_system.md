---
name: GeoSight Design System
description: Token system, color palette, surface hierarchy, typography, and spacing conventions in use across GeoSight GSPAT
type: project
---

## Color Tokens (globals.css)

**Dark mode (default):**
- Background: `#07111d` (deep navy)
- Foreground: `#f4f8ff`
- Accent: `#53ddff` (cyan) — used for CTAs, active states, focus rings
- Warning: `#ffab00` (amber)
- Success: `#5be49b` (green)
- Danger: rgba(244, 104, 104, ...)

**Light mode:**
- Background: `#eef6ff`
- Accent: `#0f9fcd` (darker cyan)

**Surface hierarchy (4 levels):**
1. `--surface-panel` — gradient, for top-level containers (glass panels, main cards)
2. `--surface-soft` — rgba(14, 26, 41, 0.72) — nested inner sections
3. `--surface-raised` — rgba(10, 22, 36, 0.9) — chips, badges, secondary surfaces
4. `--surface-overlay` — rgba(6, 14, 24, 0.64) — overlay gradient masks

**Known token bypass bug:** `LocationSignalCard` and `TrendSignalCard` both use `border-neutral-200 dark:border-neutral-700` instead of `border-[color:var(--border-soft)]`. This is a copy-paste error across two components.

## Typography

- Font: DM Sans (`var(--font-dm-sans)`)
- Eyebrow: 11px, 600 weight, 0.22em tracking, uppercase, `--muted-foreground` color — defined as `.eyebrow` in globals.css
- Three eyebrow style variants exist: `.eyebrow` class, `text-xs uppercase tracking-widest` inline (LandingPage), `text-xs uppercase tracking-[0.18em]` inline — should be consolidated to `.eyebrow` only
- Scale in use: 9px (profile tagline — too small), 10px, 11px, xs (12px), sm (14px), base (16px), xl (20px), 2xl (24px), 3xl (30px), 4xl (36px), 5xl (48px), 6xl (60px)
- 9px text in `ProfileSelector` sidebar cards is below legibility minimum — flagged P2

## Radius System

- `--radius-container: 1rem`
- `--radius-control: 0.75rem`
- `--radius-card: 1.5rem`
- `--radius-chip: 1rem`
- `--radius-pill: 999px`

In practice, components use ad-hoc `rounded-[1.25rem]`, `rounded-[1.35rem]`, `rounded-[1.5rem]`, `rounded-2xl` inline, bypassing the token system. Should eventually align to the defined radius tokens.

## Shadow System

- `--shadow-panel`: 0 28px 70px rgba(3, 8, 16, 0.42) — primary card panels
- `--shadow-soft`: 0 12px 28px rgba(3, 8, 16, 0.24) — chips, nested surfaces

## Active State Pattern

Active/selected state on cards uses 4 simultaneous signals: tinted border + tinted background + glow box-shadow + check badge. This is visually overloaded. The design convention should reduce to: tinted border + check badge only (background tint and glow shadow should be removed from active states).

## Component Classes

- `.glass-panel` — surface-panel background + border-soft border + shadow-panel + backdrop-blur(22px)
- `.surface-shell` — same as glass-panel (redundant, could be consolidated)
- `.eyebrow` — label style (see Typography above)
- `.metric-chip` — bordered pill chip
- `.scrollbar-thin` — thin webkit scrollbar styling
- `.step2-appear` — pulse-border animation for landing page step 2 reveal

## Why: Recorded after full audit of 11 primary UI files on 2026-04-03.
## How to apply: Reference these tokens when proposing copy/class changes. Flag any inline hex values or Tailwind neutral-* border classes as token bypasses.
