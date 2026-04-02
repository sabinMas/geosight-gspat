import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(2);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("landing keeps one dominant start flow across responsive widths", async ({ page }) => {
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /see any place clearly/i })).toBeVisible();
    await expect(page.getByText(/why geosight feels different/i)).toHaveCount(0);
    await expect(page.getByText(/pick a lens above to get started/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /explore this place/i })).toHaveCount(0);
    await page.getByRole("button", { name: /trail scout/i }).click();
    await expect(page.getByRole("button", { name: /explore this place/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("explore defaults to the minimal shell and hides advanced board surfaces", async ({ page }) => {
  await page.goto("/explore");

  await expect(
    page.getByRole("heading", { name: /pick a place and see what's there/i }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /pro workspace/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /ask geosight/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^board$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^library$/i })).toBeVisible();
  await expect(page.getByText("Saved layouts")).toHaveCount(0);
  await expect(page.getByText("Supporting view", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("globe view controls surface the map style entry point without leaving the explore shell", async ({
  page,
}) => {
  await page.goto("/explore");

  const mapStyleButton = page.getByRole("button", { name: "Map Style M", exact: true });

  await expect(mapStyleButton).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /pick a place and see what's there/i }),
  ).toBeVisible();
});

test("capability-aware analysis exposes grounded scientific actions for the active place", async ({
  page,
}) => {
  await page.goto("/explore?demo=wa-residential");

  await expect(page.getByText("AI analysis")).toBeVisible({ timeout: 30_000 });
  const capabilityButton = page
    .getByRole("button", {
      name: /interpret|explain|summarize/i,
    })
    .first();
  await expect(capabilityButton).toBeVisible({ timeout: 30_000 });
  await expect(capabilityButton).toBeEnabled({ timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: /source confidence|hazard stack|climate trends/i }),
  ).toHaveCount(3);
});

test("geo-usability returns deterministic findings from ui context", async ({ request }) => {
  const response = await request.post("/api/agents/geo-usability", {
    data: {
      message: "Audit this UI",
      context: {
        uiContext: {
          currentRoute: "/explore",
          viewportClass: "mobile",
          activeProfile: "residential",
          visiblePrimaryCardId: "chat",
          visibleWorkspaceCardIds: ["source-awareness", "compare"],
          visibleControlCount: 16,
          visibleTextBlockCount: 12,
          shellMode: "minimal",
          locationSelected: false,
          geodataLoading: false,
          geodataLoaded: true,
          reportOpen: true,
          demoOpen: false,
        },
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("Severity");
  expect(body).toMatch(/Reveal Policy/i);
});
