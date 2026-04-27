/**
 * record-demo.mjs
 *
 * Records an MP4 walkthrough of the GeoSight Home Buyer demo using Playwright.
 *
 * Usage:
 *   node scripts/record-demo.mjs
 *   node scripts/record-demo.mjs --url http://localhost:3000   (local dev)
 *   node scripts/record-demo.mjs --demo data-center           (other scenario)
 *
 * Output: recordings/geosight-demo-<scenario>-<timestamp>.mp4
 *
 * Requirements:
 *   npx playwright install chromium   (one-time setup)
 */

import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const urlFlag  = args.indexOf("--url");
const demoFlag = args.indexOf("--demo");

const BASE_URL    = urlFlag  !== -1 ? args[urlFlag  + 1] : "https://geosight-gspat.vercel.app";
const DEMO_ID     = demoFlag !== -1 ? args[demoFlag + 1] : "home-buyer";

// ── Demo catalogue ────────────────────────────────────────────────────────────
// Mirrors demo-scenarios.ts — profile/lens/coords/mode for each scenario.

const DEMOS = {
  "home-buyer": {
    label:     "Home Buyer — Boulder, CO",
    url:       "/explore?profile=home-buying&lat=40.015&lng=-105.2705&entrySource=landing&mode=pro&demo=home-buyer",
    stepCount: 6,
    stepMs:    [5000, 5500, 5500, 6000, 6000, 5500],
  },
  "data-center": {
    label:     "Data Center — Phoenix, AZ",
    url:       "/explore?profile=infrastructure&lat=33.4484&lng=-112.074&entrySource=landing&mode=pro&demo=data-center",
    stepCount: 5,
    stepMs:    [5000, 6000, 6000, 6000, 5500],
  },
  "trail-scout": {
    label:     "Trail Scout — Yosemite Valley, CA",
    url:       "/explore?lens=trail-scout&lat=37.8651&lng=-119.5383&entrySource=landing&mode=explorer&demo=trail-scout",
    stepCount: 5,
    stepMs:    [5000, 5500, 6000, 5500, 6000],
  },
  "energy-solar": {
    label:     "Solar Site — Phoenix, AZ",
    url:       "/explore?lens=energy-solar&lat=33.4484&lng=-112.074&entrySource=landing&mode=explorer&demo=energy-solar",
    stepCount: 5,
    stepMs:    [5000, 6500, 6500, 6000, 6000],
  },
};

const demo = DEMOS[DEMO_ID];
if (!demo) {
  console.error(`Unknown demo: ${DEMO_ID}. Valid: ${Object.keys(DEMOS).join(", ")}`);
  process.exit(1);
}

// ── Timing helpers ────────────────────────────────────────────────────────────

// Total ms the demo steps will auto-advance (with a 15 % buffer for slow API)
const DEMO_TOTAL_MS   = demo.stepMs.reduce((a, b) => a + b, 0);
const DATA_WAIT_MS    = 20_000;   // max time to wait for geodata to load
const STEP_BUFFER_MS  = 4_000;    // extra buffer after all steps before closing

// ── Output dir ────────────────────────────────────────────────────────────────

const recordingsDir = join(__dirname, "..", "recordings");
mkdirSync(recordingsDir, { recursive: true });

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🎬  Recording: ${demo.label}`);
console.log(`    Base URL : ${BASE_URL}`);
console.log(`    Steps    : ${demo.stepCount} (${(DEMO_TOTAL_MS / 1000).toFixed(1)}s auto-advance)`);
console.log(`    Output   : recordings/\n`);

const browser = await chromium.launch({
  headless: false,           // visible browser — looks better on screen capture tools too
  args: ["--start-maximized"],
});

const context = await browser.newContext({
  viewport:    { width: 1440, height: 900 },
  recordVideo: {
    dir:  recordingsDir,
    size: { width: 1440, height: 900 },
  },
  // Fresh context — no localStorage, no cookies, no "Restore previous session?" banner.
  storageState: undefined,
});

const page = await context.newPage();

// ── Step 1: Landing page ──────────────────────────────────────────────────────

console.log("→ Landing page…");
await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(2_500);   // let the hero render fully

// ── Step 2: Navigate directly to the demo URL ─────────────────────────────────
// Skipping the demo picker click — goes straight to the explore page with the
// demoScenarioId param set, which triggers DemoRunner automatically on mount.

console.log("→ Navigating to explore + demo…");
await page.goto(`${BASE_URL}${demo.url}`, { waitUntil: "domcontentloaded" });

// ── Step 3: Dismiss "Restore previous session?" if it appears ────────────────

try {
  const dismissBtn = page.getByRole("button", { name: /dismiss/i });
  await dismissBtn.waitFor({ timeout: 4_000 });
  await dismissBtn.click();
  console.log("   (dismissed session restore banner)");
} catch {
  // Not present — fresh context, expected.
}

// ── Step 4: Wait for the DemoRunner to mount and stop showing the spinner ─────
// The DemoRunner shows "Loading analysis data…" until geodata is ready.

console.log("→ Waiting for demo data to load…");
await page.waitForSelector(
  'p.text-sm.font-semibold',        // step title paragraph inside DemoRunner body
  { timeout: DATA_WAIT_MS },
);
console.log("   data ready — demo is running");

// ── Step 5: Let the demo auto-advance through all steps ───────────────────────

const totalWait = DEMO_TOTAL_MS + STEP_BUFFER_MS;
console.log(`→ Letting demo run for ${(totalWait / 1000).toFixed(0)}s…`);

// Log step changes while we wait (nice progress indicator in the console).
let lastTitle = "";
const interval = setInterval(async () => {
  try {
    const title = await page.locator('p.text-sm.font-semibold').first().innerText();
    if (title !== lastTitle) {
      lastTitle = title;
      console.log(`   step: "${title}"`);
    }
  } catch { /* page may be mid-transition */ }
}, 1_000);

await page.waitForTimeout(totalWait);
clearInterval(interval);

// ── Step 6: Final pause before closing ───────────────────────────────────────

console.log("→ Outro pause…");
await page.waitForTimeout(2_000);

// ── Save video ────────────────────────────────────────────────────────────────
// Grab the path before closing — context.close() finalises the file.

import { renameSync } from "fs";

const video = page.video();
await context.close();
await browser.close();

const rawPath    = await video?.path();
const timestamp  = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const finalName  = `geosight-demo-${DEMO_ID}-${timestamp}.mp4`;
const finalPath  = join(recordingsDir, finalName);

if (rawPath) {
  renameSync(rawPath, finalPath);
  console.log(`\n✅  Done. Video saved to:\n   ${finalPath}\n`);
} else {
  console.log(`\n✅  Done. Video saved to: recordings/ (check for .webm file)\n`);
}
