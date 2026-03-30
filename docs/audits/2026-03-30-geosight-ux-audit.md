# GeoSight — Full UX/UI Usability & Functionality Audit

**Audited by:** Senior UX/UI (Apple / Buster.AI / Tableau / Microsoft background)  
**Date:** March 30, 2026  
**Live URL:** https://geosight-gspat.vercel.app/  
**GitHub Repo:** https://github.com/sabinMas/geosight-gspat  

***

## Severity Legend

| Symbol | Level | Description |
|--------|-------|-------------|
| 🔴 | **P0 — Critical** | Blocks core functionality |
| 🟠 | **P1 — High** | Significant UX degradation |
| 🟡 | **P2 — Medium** | Friction, confusion, or polish gap |
| 🟢 | **P3 — Low** | Nice-to-have improvements |

***

## Section 1 — Critical Broken Items (P0)

***

### 🔴 #1 — The Globe / Map Renders Completely Blank

**Location:** `/explore` page — the main GLOBE VIEW area  
**What happens:** The CesiumGlobe component renders as a completely empty dark panel. No 3D globe, no satellite view, no terrain — nothing. This is the single most important feature of the entire product and it is invisible.

**Root Cause (confirmed via GitHub):**  
In `CesiumGlobe.tsx`:
```ts
Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN ?? "";
```
The Cesium Ion token is either not set in the Vercel environment, is expired, or is defaulting to `""` — which causes Cesium to silently fail to load any imagery.

**How to Fix:**
1. Go to [cesium.com/ion](https://cesium.com/ion) → create or retrieve your access token.
2. In your Vercel project → **Settings → Environment Variables** → add:
   ```
   NEXT_PUBLIC_CESIUM_ION_TOKEN=your_real_token
   ```
3. Redeploy. Additionally, add an explicit error state in `CesiumGlobe.tsx` when the token is missing:
```tsx
if (!process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN) {
  return (
    <div className="...">
      Globe unavailable: Cesium token not configured.
    </div>
  );
}
```

***

### 🔴 #2 — "BOARD" Tab in Explore Header Does Nothing

**Location:** `/explore` — top navigation bar — "BOARD" pill/tab  
**What happens:** Clicking "BOARD" produces zero response. No navigation, no state change, no panel — a complete dead click.

**Root Cause (confirmed via GitHub):**  
In `ExploreWorkspace.tsx`, the `WorkspaceViewToggle` is rendered conditionally:
```tsx
{data.shellMode === "board" ? (<WorkspaceViewToggle ... />) : null}
```
In the default "workspace" shell mode, the toggle never renders. However, the tab-like "BOARD" nav label at the top is a separate element with no click handler.

**How to Fix:**  
Either remove the dead `BOARD` text from the top navigation if it is not a real tab, or wire it to:
```tsx
onClick={() => data.setShellMode("board")}
```
The current mismatch between the visual nav affordance and the missing handler creates a broken expectation.

***

### 🔴 #3 — "GUIDED" Tab Does Nothing

**Location:** `/explore?...&entrySource=landing` — top navigation  
**What happens:** A "GUIDED" pill label appears next to "EXPLORE WORKSPACE" but clicking it has zero effect.

**How to Fix:**  
Either implement the handler or remove the visual affordance. If "GUIDED" is meant to be a mode indicator (not clickable), style it as a `<span>` badge — not a button-like pill element.

***

### 🔴 #4 — "LIBRARY" Button Does Nothing

**Location:** `/explore` top right — "Library" button with grid icon  
**What happens:** Clicking "Library" produces no response.

**Root Cause:**  
Same conditional rendering issue as #2 — `WorkspaceViewToggle` only renders when `shellMode === "board"`. In default shell mode, the Library button in the header has no handler.

**How to Fix:**  
Wire the Library button to `data.openLibrary()` or `data.openAdvancedBoard()` regardless of shell mode, or hide the button until it is functional.

***

### 🔴 #5 — "Generate Report" Is Silently Disabled With No Feedback

**Location:** `/explore` — "Generate report" button (top right header)  
**What happens:** Clicking the button does absolutely nothing. There is a `title={reportDisabledReason}` tooltip in the code, but tooltips do not show on first click — users simply click and nothing happens. No toast, no snackbar, no inline message.

**Root Cause:**
```tsx
disabled={!data.geodata || data.loading || data.reportLoading}
```
Since no location is selected on initial load, `data.geodata` is `null` and the button silently ignores clicks.

**How to Fix:**  
Replace the invisible disabled state with an active button that shows an inline error or toast:
```tsx
onClick={() => {
  if (!data.geodata) {
    toast("Select a location first to generate a report.");
    return;
  }
  primeAgent("geo-scribe", reportPrompt);
  void data.generateReport();
}}
```
> Never use a disabled button for a state that can be explained — explain it.

***

## Section 2 — High Severity Issues (P1)

***

### 🟠 #6 — "GEOSIGHT" Logo Doesn't Navigate Home

**Location:** `/explore` — the "GEOSIGHT" badge in the sidebar top-left  
**What happens:** Clicking the GEOSIGHT logo/wordmark does nothing. Every web convention says the logo navigates to the homepage.

**How to Fix:**
```tsx
<Link href="/"><span className="...">GEOSIGHT</span></Link>
```

***

### 🟠 #7 — Demo Modal: Site Cards (Site A, B, C) Are Not Clickable

**Location:** Competition demo modal (`/explore?...missionRun=competition-columbia`)  
**What happens:** The three comparison site cards (Site A 87/100, Site B 72/100, Site C 65/100) look exactly like interactive cards but clicking any of them produces zero response. Users will absolutely try to click these to focus the globe on that site.

**Root Cause:**  
`handleFocusDemoSite(siteId)` exists in `ExploreWorkspace.tsx` but is not wired to the individual site card rows inside `CoolingDemoOverlay`.

**How to Fix:**  
Wire `onClick={() => onFocusSite(site.id)}` to each site card row in the `CoolingDemoOverlay` component.

***

### 🟠 #8 — "Load Showcase" Button Gives No Feedback

**Location:** Competition demo modal — "Load showcase" primary button  
**What happens:** Clicking "Load showcase" shows a click animation but the UI doesn't change — no loading state, no confirmation, no visible navigation effect.

**Root Cause:**  
`handleLoadShowcase()` calls `state.openDemoOverlay()` and `state.setPendingDemoLoad(true)`, but without the globe rendering (P0 issue #1), any globe-positioning result is invisible.

**How to Fix:**  
Add a visible loading state inside the modal after click:
```tsx
{isLoadingShowcase && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Spinner /> Loading demo sites...
  </div>
)}
```

***

### 🟠 #9 — No Location Autocomplete / Suggestions in Search Bar

**Location:** `/explore` → "Find a place" search input  
**What happens:** Typing a location name shows no dropdown autocomplete suggestions. The user must type an exact address and click "Find location" — there is zero discoverability or type-ahead help.

**Root Cause:**  
`SearchBar.tsx` performs lookup only on button click, with no debounced typeahead.

**How to Fix:**  
Add a debounced geocode suggestion call (Nominatim, Mapbox, or Google Places Autocomplete) that shows a dropdown as the user types:
```tsx
const debouncedSearch = useDebouncedCallback(async (value) => {
  const suggestions = await geocodeSuggest(value);
  setSuggestions(suggestions);
}, 300);
```
This is table-stakes UX for any location-based product.

***

### 🟠 #10 — "Open Primary Competition Demo" Button Has Critical Contrast Failure in Light Mode

**Location:** Homepage — hero section CTA button  
**What happens:** In light mode, the "Open primary competition demo" button text becomes nearly invisible — the ghost/outline button has insufficient contrast against the light background.

**How to Fix:**  
Ensure the button meets a minimum **4.5:1 contrast ratio** per WCAG AA in both dark and light themes. Override the light-mode token for this specific button variant, or switch to a filled button style in light mode:
```tsx
className="border border-foreground text-foreground hover:bg-foreground/10"
```

***

## Section 3 — Medium Severity Issues (P2)

***

### 🟡 #11 — Step 2 Location Box Doesn't Clear When You Switch Lenses

**Location:** Homepage → Step 1 lens selection → Step 2 location input  
**What happens:** Selecting a lens, viewing the pre-filled location in Step 2, then switching to another lens retains the previous default location. Users may accidentally submit the wrong location.

**How to Fix:**  
Clear or update the suggested location when `activeLens` changes:
```tsx
useEffect(() => {
  setLocationInput(getDefaultLocation(activeLens));
}, [activeLens]);
```

***

### 🟡 #12 — No Strong Visual Selected State on Homepage Lens Cards

**Location:** Homepage → Step 1 lens cards  
**What happens:** After clicking a lens card, the selection state is barely visible — only a faint border highlight. The selected vs unselected state is ambiguous, especially on the Infrastructure card.

**How to Fix:**  
Add a clear `aria-selected` visual treatment — filled/tinted background, checkmark icon overlay, or a colored left-border accent when selected. Apple's HIG recommends at minimum a **3:1 contrast delta** between selected and unselected states.

***

### 🟡 #13 — "More Starting Lenses" Accordion Has Weak Affordance

**Location:** Homepage → "▶ More starting lenses" toggle  
**What happens:** The disclosure triangle `▶ / ▼` icon alone is a poor affordance with no animation or transition.

**How to Fix:**  
Add an animated chevron (CSS `rotate(90deg)` transition on expand) and consider making the entire row more visually prominent as an expandable section header.

***

### 🟡 #14 — "BOARD" Shell Mode Has No Onboarding or Explanation

**Location:** `/explore` top navigation  
**What happens:** The app has two modes — "workspace" and "board" — but there is no user-facing explanation of what board mode is, how to enter it, or what it unlocks.

**How to Fix:**  
Add a tooltip explaining board mode on hover of the BOARD label, or add an explicit CTA like "Switch to Board mode →" in the `AddViewTray` component when the user first adds multiple cards.

***

### 🟡 #15 — "Use My Location" Has No Error Handling

**Location:** Homepage → Step 2 → "Use my location" button  
**What happens:** If the browser denies geolocation permission, nothing happens — no error message, no fallback, no UI feedback.

**How to Fix:**
```tsx
navigator.geolocation.getCurrentPosition(
  (pos) => onSuccess(pos),
  (err) => setError("Location access denied. Please type your address instead.")
);
```

***

### 🟡 #16 — Homepage Feature Tags Look Interactive But Are Static

**Location:** Homepage hero — three grey pill badges  
**What happens:** "Prompt-first workspace", "Visible provenance", and "Live-source spatial reasoning" look like interactive chips but are entirely static. Users will try to click them expecting to filter or learn more.

**How to Fix:**  
Either make them genuinely interactive (e.g. scroll to a feature section on click), or redesign them as a bullet-style icon + text list that clearly signals "non-interactive." Flat grey pills are a strong interactive affordance in modern UI design.

***

### 🟡 #17 — Guided Demo Cards Don't Communicate They Navigate Away

**Location:** Homepage → "Guided Demos" section  
**What happens:** Clicking any of the three demo cards navigates to `/explore` with the demo loaded, but there is no visual indication of this (no arrow, no "Open" label, no hover tooltip).

**How to Fix:**  
Add an arrow icon or "Open demo →" label on hover to signal navigation intent:
```tsx
<div className="group ...">
  ...card content...
  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
    Open demo →
  </span>
</div>
```

***

### 🟡 #18 — "Ask GeoSight" Chat Input Has No Visible Focus Ring

**Location:** `/explore` → Ask GeoSight bottom drawer — message input  
**What happens:** The message textarea shows no visible focus ring when clicked. This fails **WCAG 2.4.7 (Focus Visible)**.

**How to Fix:**
```tsx
className="... focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
```

***

### 🟡 #19 — Agent Tabs in Chat Drawer Have No Hover State

**Location:** `/explore` → Ask GeoSight panel → GeoAnalyst / GeoGuide / GeoScribe / GeoUsability tabs  
**What happens:** The agent switcher tabs lack hover state styling — they feel static and dead until clicked.

**How to Fix:**
```tsx
className="... hover:bg-[var(--surface-soft)] transition-colors"
```

***

### 🟡 #20 — "SURFACE ONLY" Toggle Has No Explanation

**Location:** `/explore` → Globe View panel  
**What happens:** The "SURFACE ONLY" toggle label is cryptic — it is unclear what the alternative is (subsurface? terrain exaggeration?). First-time users will not understand this affordance.

**How to Fix:**  
Add a tooltip on hover:
```tsx
title="Surface only: disables subsurface datasets and terrain exaggeration for a cleaner globe view"
```

***

## Section 4 — Low Severity / Polish (P3)

***

### 🟢 #21 — Missing / Delayed Favicon and Page Title

**Location:** Browser tab  
**What happens:** The page title shows as blank on initial load before resolving to "GeoSight." The favicon may also be missing or slow.

**How to Fix:**  
Set metadata in `src/app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  title: "GeoSight — Spatial Intelligence Platform",
  description: "Ask one place a serious question.",
  icons: { icon: "/favicon.ico" },
};
```

***

### 🟢 #22 — No Custom 404 or Error Boundary at Route Level

**Location:** Any invalid URL  
**What happens:** Invalid routes fall through to a generic Next.js error. There is a `ClientErrorBoundary` for the globe only, but no global `not-found.tsx` or `error.tsx`.

**How to Fix:**  
Create:
- `src/app/not-found.tsx` — branded "Page not found" with a link back home
- User-provided audit content appears truncated in chat after this line.
