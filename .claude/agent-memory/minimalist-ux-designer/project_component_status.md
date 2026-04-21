---
name: GeoSight Component Design Status
description: Per-component design decisions, audit findings, and current state after 2026-04-13 minimalist redesign pass
type: project
---

## LandingPage.tsx — REDESIGNED 2026-04-13

- DONE: h1 removed entirely — globe bg communicates product
- DONE: STEP 1 / STEP 2 wizard replaced with single centered glass card
- DONE: Lens selection moved into pill chips inside the card
- DONE: First lens auto-selected by default
- DONE: "Use my location" moved inside input as right-side icon button
- DONE: Pro section (ProductPreviewSection, CapabilityShowcase) removed from landing view
- DONE: Lens renames — "Land Quick-Check" → "Site Analysis", "General Explore" → "Explore"
- DONE: Single CTA "Analyze this place" replaces the 2-button row
- Remaining: ProductPreviewSection and CapabilityShowcase still exist as components — could be surfaced on a /pro route

## WorkspaceToolRail.tsx — REDESIGNED 2026-04-13

- DONE: Expanded card with section headers ("WORKBENCH", "SHELL", "SPATIAL TOOLS", "CAPTURE & EXPORT") replaced with icon-only rail
- DONE: Icons are 40×40px rounded-full buttons — meet 44px touch target with generous hit area
- DONE: Hover tooltips via absolute-positioned pill (left-full, whitespace-nowrap)
- DONE: Section dividers are thin 6px h-px lines (not labeled headers)
- DONE: Capture mode figure inputs still render inline below the rail when captureMode is active
- DONE: Button import removed — now uses only raw button elements

## ExploreWorkspace.tsx — MULTIPLE CHANGES 2026-04-13

**Left panel:**
- DONE: Was w-80 (320px). Now w-14 (56px) icon-only rail
- DONE: Sidebar (profiles + quick regions) removed from desktop — accessible only via mobile overlay
- DONE: AddViewTray removed from desktop layout (import removed)
- DONE: Init error shown as a compact strip at rail top
- Remaining: Desktop users cannot access profile/region switching without command palette (Ctrl+K)

**Topbar:**
- DONE: "Tools" label removed — Command icon only with title tooltip
- DONE: Brand link text is more muted (muted-foreground) at xl
- DONE: Topbar h-[52px] retained; padding reduced to px-3/px-4

**Globe controls:**
- DONE: Three labeled Buttons (Rotate/Drive/Location) replaced with unified pill cluster
- DONE: Position: bottom-12 right-4 (above coord readout)
- DONE: 44×44px touch targets (h-11 w-11) with dividers
- DONE: Active state uses --accent-soft / --accent-foreground tokens
- DONE: Uses cn() for conditional class merging — no raw strings

**Right panel (Evidence Tray):**
- DONE: Was static aside consuming 380px width always
- DONE: Now position: fixed, slides in/out with translateX transition
- DONE: Pull-handle tab appears on right edge when panel is closed
- DONE: Mobile: inline below globe (unchanged)
- DONE: Panel sits below topbar via xl:inset-y-[52px]

**Bottom bar:**
- DONE: Height reduced from xl:h-[64px] to xl:h-[56px]
- DONE: "Generate report" → "Report"
- DONE: AI bar wrapper changed from flex-1 to shrink-0 centered
- DONE: Padding reduced px-3 py-2

## PersistentAiBar.tsx — REDESIGNED 2026-04-13

- DONE: Was always-visible full-width input + Send button
- DONE: Now collapsed pill: "Ask GeoSight about this place" + Sparkles icon + "/" badge
- DONE: Expands on click to show input + Ask button
- DONE: Collapses on outside click (pointerdown listener) or Escape
- DONE: "/" shortcut still works — expands + focuses
- DONE: Sparkles icon replaces MessageSquareText

## Sidebar.tsx — UNCHANGED (still used in mobile overlay only)

- P2: Subtitle line repeats card titles — remove
- P2: Coordinate display in quick-region buttons is noise — remove or tooltip-only
- P3: Card-in-aside nesting adds a surface level

## Previously audited components (2026-04-03)

See original audit findings below. P1 items below are still open:

### ActiveLocationCard.tsx
- P1: Evidence count pills use raw Tailwind color classes (emerald-300/30, cyan-300/30, amber-300/30)
- P1: "In-context provenance" section duplicates header badges row

### AnalysisOverviewBanner.tsx
- P1: Proxy warning uses raw Unicode ⚠ symbol — should use Lucide AlertTriangle + warning-soft surface
- P2: Two action buttons at identical weight — one should be primary, one ghost

### AnalysisTrendsPanel.tsx
- P1: EVIDENCE_CLS uses raw Tailwind color classes — violates token system

### ProfileSelector.tsx
- P1: text-[9px] tagline in sidebar carousel is below legibility minimum — remove or raise to text-xs

## UX Audit Fixes — 2026-04-13 (second pass)

### CesiumGlobe.tsx
- DONE FIX 1: Initial fly-to minimum altitude raised to 50,000m on first load (was 2,500m) so terrain context is immediately visible when arriving from landing. Subsequent user-driven clicks retain 2,500m floor.

### ExploreWorkspace.tsx
- DONE FIX 2: Desktop right panel now has user-controlled collapse via `rightPanelCollapsed` state. A ChevronDown arrow button is anchored to the panel's left edge. Pull-handle tab also appears when user collapses. Panel auto-re-expands when new content arrives.
- DONE FIX 3: Auto-confirm "Use place" when entrySource === "landing" and locationReady becomes true. Single-fires via `autoConfirmedRef`. Removes the manual confirmation step for landing→explore flows.
- DONE FIX 8 partial: Removed `overflow-hidden` from left icon rail aside — it was clipping the tooltip `absolute` positioned elements that extend rightward beyond the 56px rail width.

### AnalysisOverviewBanner.tsx
- DONE FIX 4: Partial coverage badge now has `cursor-help` and a `title` tooltip explaining coverage gaps.
- DONE FIX 5: "Why score" button now renders in `--accent` color with `hover:bg-[var(--accent-soft)]` for visual prominence — was indistinguishable from ghost text.

### StatePanel.tsx
- DONE FIX 4: `StateBadge` now accepts optional `title` prop and adds `cursor-help` when provided.

### AnalysisPanel.tsx (Results/)
- DONE FIX 6: Narrative section is now collapsible (default collapsed). Shows 120-char preview with ChevronDown toggle. Data metric cards remain always visible below. `useState(false)` for narrativeExpanded.
- DONE FIX 7: "AOI store" label renamed to "Your area". Description changed from developer jargon to "Draw on the map to analyze a custom zone."

### LandingPage.tsx
- DONE FIX 9: Lens chip buttons now have `title={lens.whyItMatters}` for native browser tooltip on hover. Uses the existing `whyItMatters` field from ExplorerLens type — no data model changes needed.

## How to apply
P1 items are usability/token violations to fix next session. P2 are high-impact improvements. When working on any of these components, check this list first.
