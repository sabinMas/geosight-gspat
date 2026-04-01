import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("capability interpretation surfaces execution trust and source grounding", async ({
  page,
}) => {
  await page.goto("/explore?profile=home-buying&location=45.7000,-121.8000&label=Columbia demo");

  await expect(page.getByRole("heading", { name: /update the active place/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("AI analysis")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Latest interpretation")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Interpretation status")).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText(/deterministic synthesis|fallback synthesis|grounded in the current geosight context/i),
  ).toBeVisible({ timeout: 45_000 });
});

test("geoscribe report surfaces report trust before export actions", async ({ page }) => {
  await page.goto("/explore?profile=home-buying&location=45.7000,-121.8000&label=Columbia demo");

  const reportButton = page.getByRole("button", { name: /generate report/i });
  await expect(page.getByRole("heading", { name: /update the active place/i })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Latest interpretation")).toBeVisible({ timeout: 45_000 });
  await expect(reportButton).toBeVisible({ timeout: 45_000 });
  await expect(reportButton).toBeEnabled({ timeout: 45_000 });
  let reportDrawerOpened = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await reportButton.click();
    reportDrawerOpened = await page
      .getByText(/generating a structured report from the live geosight context/i)
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (reportDrawerOpened) {
      break;
    }
    await page.waitForTimeout(2_000);
  }

  expect(reportDrawerOpened).toBeTruthy();
  await expect(page.getByText("Report trust")).toBeVisible({ timeout: 45_000 });
  await expect(
    page
      .getByText(/grounded fallback writer|current geosight context|screening and briefing depth/i)
      .first(),
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole("button", { name: /copy to clipboard/i })).toBeVisible();
});
