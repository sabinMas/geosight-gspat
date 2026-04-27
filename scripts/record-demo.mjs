/**
 * record-demo.mjs
 *
 * Records a 2560×1440 MP4 walkthrough of a GeoSight demo scenario.
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
import { mkdirSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── CLI args ──────────────────────────────────────────────────────────────────

const args   = process.argv.slice(2);
const urlArg = args.indexOf("--url");
const demArg = args.indexOf("--demo");

const BASE_URL = urlArg !== -1 ? args[urlArg + 1] : "https://geosight.earth";
const DEMO_ID  = demArg !== -1 ? args[demArg + 1] : "home-buyer";

// ── Resolution — 27-inch monitor ─────────────────────────────────────────────

const WIDTH  = 2560;
const HEIGHT = 1440;

// ── Demo catalogue ────────────────────────────────────────────────────────────

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

const DEMO_TOTAL_MS  = demo.stepMs.reduce((a, b) => a + b, 0);
const DATA_WAIT_MS   = 60_000;   // geodata + Cesium can take a while on cold starts
const STEP_BUFFER_MS = 4_000;

// ── Output dir ────────────────────────────────────────────────────────────────

const recordingsDir = join(__dirname, "..", "recordings");
mkdirSync(recordingsDir, { recursive: true });

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\n🎬  Recording: ${demo.label}`);
console.log(`    Base URL  : ${BASE_URL}`);
console.log(`    Resolution: ${WIDTH}×${HEIGHT}`);
console.log(`    Steps     : ${demo.stepCount} (${(DEMO_TOTAL_MS / 1000).toFixed(1)}s auto-advance)`);
console.log(`    Output    : recordings/\n`);

const browser = await chromium.launch({
  headless: false,
  args: [
    `--window-size=${WIDTH},${HEIGHT}`,
    "--window-position=0,0",
    "--disable-infobars",
    "--no-default-browser-check",
  ],
});

const context = await browser.newContext({
  viewport:    { width: WIDTH, height: HEIGHT },
  recordVideo: { dir: recordingsDir, size: { width: WIDTH, height: HEIGHT } },
  // Fresh context — prevents "Restore previous session?" banner.
  storageState: undefined,
});

const page = await context.newPage();

// ── Landing page ──────────────────────────────────────────────────────────────

console.log("→ Landing page…");
await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(2_500);

// ── Navigate to explore + demo ────────────────────────────────────────────────

console.log("→ Navigating to explore + demo…");
await page.goto(`${BASE_URL}${demo.url}`, {
  waitUntil: "domcontentloaded",
  timeout: 30_000,
});

// ── Dismiss session restore banner if present ─────────────────────────────────

try {
  await page.getByRole("button", { name: /dismiss/i }).waitFor({ timeout: 4_000 });
  await page.getByRole("button", { name: /dismiss/i }).click();
  console.log("   (dismissed session restore banner)");
} catch { /* not present on fresh context */ }

// ── Wait for DemoRunner dialog to appear ──────────────────────────────────────
// The dialog mounts immediately but shows a spinner until geodata is ready.

console.log("→ Waiting for demo dialog…");
await page.waitForSelector('[role="dialog"][aria-label*="demo"]', { timeout: 60_000 });

// ── Wait for data to finish loading ──────────────────────────────────────────
// The footer (containing the Next button) only renders once waitingForData=false.
// This is the most reliable signal that the demo is actually running.

console.log("→ Waiting for geodata to load (up to 60s)…");
await page.waitForSelector('[role="dialog"][aria-label*="demo"] button', { timeout: DATA_WAIT_MS });
console.log("   data ready — demo is running");

// ── Let the demo auto-advance through all steps ───────────────────────────────

const totalWait = DEMO_TOTAL_MS + STEP_BUFFER_MS;
console.log(`→ Letting demo run for ${(totalWait / 1000).toFixed(0)}s…`);

let lastTitle = "";
const ticker = setInterval(async () => {
  try {
    const el = page.locator('[role="dialog"][aria-label*="demo"] p').first();
    const title = await el.innerText({ timeout: 500 });
    if (title && title !== lastTitle) {
      lastTitle = title;
      console.log(`   step: "${title}"`);
    }
  } catch { /* mid-transition */ }
}, 1_000);

await page.waitForTimeout(totalWait);
clearInterval(ticker);

// ── Outro pause ───────────────────────────────────────────────────────────────

console.log("→ Outro pause…");
await page.waitForTimeout(2_000);

// ── Save video ────────────────────────────────────────────────────────────────

const video = page.video();
await context.close();
await browser.close();

const rawPath   = await video?.path();
const stamp     = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const finalPath = join(recordingsDir, `geosight-demo-${DEMO_ID}-${stamp}.mp4`);

if (rawPath) {
  renameSync(rawPath, finalPath);
  console.log(`\n✅  Done.\n   ${finalPath}\n`);
} else {
  console.log(`\n✅  Done. Check recordings/ for a .webm file.\n`);
}
