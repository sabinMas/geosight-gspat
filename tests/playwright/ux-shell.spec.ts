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
    await expect(page.getByRole("heading", { name: /ask one place/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /open geosight/i })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }
});

test("explore defaults to the minimal shell and hides advanced board surfaces", async ({ page }) => {
  await page.goto("/explore");

  await expect(page.getByText("Explore workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: /open advanced board/i })).toBeVisible();
  await expect(page.getByText("Saved layouts")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /supporting view/i })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});

test("advanced board and library remain opt-in", async ({ page }) => {
  await page.goto("/explore");
  await page.getByRole("button", { name: /open advanced board/i }).click();

  await expect(page.getByText("Open one supporting view at a time")).toBeVisible();
  await page.getByRole("button", { name: /customize views/i }).click();
  await expect(page.getByRole("heading", { name: /choose what stays visible/i })).toBeVisible();
});

test("judge mode opens the richer board path", async ({ page }) => {
  await page.goto(
    "/explore?profile=data-center&demo=pnw-cooling&entrySource=demo&judge=1&missionRun=competition-columbia",
  );

  await expect(page.getByText(/judge-ready spatial reasoning flow/i)).toBeVisible();
  await expect(page.getByText("Open one supporting view at a time")).toBeVisible();
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
          judgeMode: false,
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
  expect(body).toContain("Reveal policy");
});
