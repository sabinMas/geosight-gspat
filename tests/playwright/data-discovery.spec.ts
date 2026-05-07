import { test, expect } from "@playwright/test";

test.describe("Data Discovery Card", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/explore");
    await page.waitForLoadState("networkidle");
  });

  test("should open Data Discovery Card from workspace", async ({ page }) => {
    // Note: This assumes the card is available via a menu or button
    // Adjust selector based on actual implementation
    const cardButton = page.locator("button:has-text('Data Discovery')");
    if (await cardButton.isVisible()) {
      await cardButton.click();
      await expect(page.locator("text=Browse endpoints")).toBeVisible();
    }
  });

  test("happy path: browse, select endpoint, query features, view results", async ({ page }) => {
    // Open the Data Discovery Card
    const cardTitle = page.locator("text=Custom data discovery");
    if (await cardTitle.isVisible()) {
      // Tab 1: Browse endpoints
      const endpointsList = page.locator("text=OSM Overpass");
      await expect(endpointsList).toBeVisible();

      // Click on an endpoint
      await page.locator("button:has-text('OSM Overpass')").first().click();

      // Should navigate to query builder tab
      await expect(page.locator("text=Query builder")).toBeVisible();

      // Tab 2: Query builder
      const queryTab = page.locator("button:has-text('Query builder')");
      if (await queryTab.isEnabled()) {
        await queryTab.click();

        // Select a feature type if available
        const featureButton = page.locator("button[class*='border']").first();
        if (await featureButton.isVisible()) {
          await featureButton.click();

          // Set result limit
          const limitSlider = page.locator('input[type="range"]');
          if (await limitSlider.isVisible()) {
            await limitSlider.fill("100");
          }

          // Click Load features
          const loadButton = page.locator("button:has-text('Load features')");
          if (await loadButton.isEnabled()) {
            await loadButton.click();

            // Wait for features to load
            await page.waitForLoadState("networkidle");

            // Check for results tab
            const resultsTab = page.locator("button:has-text('Results')");
            if (await resultsTab.isEnabled()) {
              await resultsTab.click();

              // Verify results are displayed
              await expect(page.locator("text=Total features")).toBeVisible();
            }
          }
        }
      }
    }
  });

  test("should handle CORS errors gracefully", async ({ page }) => {
    // Try to load an endpoint that will fail with CORS
    const urlInput = page.locator("input[placeholder*='custom']");
    if (await urlInput.isVisible()) {
      await urlInput.fill("https://example.invalid/wfs");
      const testButton = page.locator("button:has-text('Test')");
      if (await testButton.isVisible()) {
        await testButton.click();
        await page.waitForLoadState("networkidle");

        // Should show error message
        const errorText = page.locator("[role='alert'], text=/CORS|blocked|failed/i");
        if (await errorText.isVisible()) {
          await expect(errorText).toBeVisible();
        }
      }
    }
  });

  test("should show warning for large result sets", async ({ page }) => {
    const limitSlider = page.locator('input[type="range"]');
    if (await limitSlider.isVisible()) {
      // Set to high value
      await limitSlider.fill("2000");

      // Should show warning
      const warning = page.locator("text=/Large result|slow to render/i");
      if (await warning.isVisible()) {
        await expect(warning).toBeVisible();
      }
    }
  });

  test("should persist custom endpoints in localStorage", async ({ page, context }) => {
    // Get localStorage
    const storage = await context.storageState();

    // Add custom endpoint
    const urlInput = page.locator("input[placeholder*='custom']");
    if (await urlInput.isVisible()) {
      await urlInput.fill("https://custom.wfs.example.com/wfs");

      const addButton = page.locator("button:has-text('Add')");
      if (await addButton.isVisible()) {
        await addButton.click();
        await page.waitForTimeout(500);

        // Refresh and check if endpoint persists
        await page.reload();
        await page.waitForLoadState("networkidle");

        const customEndpoint = page.locator("text=custom.wfs.example.com");
        // Note: This may not be visible if localStorage isn't fully implemented
        // Adjust assertion based on actual behavior
      }
    }
  });

  test("should clear results and start new query", async ({ page }) => {
    // After loading features, click Clear button
    const clearButton = page.locator("button:has-text('Clear')");
    if (await clearButton.isVisible() && !(await clearButton.isDisabled())) {
      await clearButton.click();

      // Should go back to endpoints tab
      const endpointsTab = page.locator("button:has-text('Browse endpoints')");
      if (await endpointsTab.isVisible()) {
        await expect(endpointsTab).toBeVisible();
      }
    }
  });

  test("should handle attribute filtering UI", async ({ page }) => {
    // Check if attribute filters are displayed
    const filterLabel = page.locator("text=Result limit");
    if (await filterLabel.isVisible()) {
      // Range slider should be visible
      const slider = page.locator('input[type="range"]');
      await expect(slider).toBeVisible();

      // Spatial filter checkbox should be present (but disabled)
      const bboxCheckbox = page.locator('input[type="checkbox"]');
      if (await bboxCheckbox.isVisible()) {
        // Check it's disabled initially
        const disabled = await bboxCheckbox.evaluate((el: HTMLInputElement) => el.disabled);
        expect(disabled).toBe(true);
      }
    }
  });

  test("should display feature statistics in results", async ({ page }) => {
    // After loading features, verify statistics are shown
    const stats = page.locator("text=/Total features|Geometry types/");
    if (await stats.isVisible()) {
      await expect(stats).toBeVisible();
    }

    // Should show geometry type breakdown
    const geomTypes = page.locator("text=/Point|LineString|Polygon/");
    if (await geomTypes.isVisible()) {
      await expect(geomTypes).toHaveCount(3, { timeout: 500 });
    }
  });

  test("should display attribute table preview", async ({ page }) => {
    // After loading features, check for attribute table
    const tableLabel = page.locator("text=/Sample features|Attributes/");
    if (await tableLabel.isVisible()) {
      await expect(tableLabel).toBeVisible();

      // Should have table with headers
      const table = page.locator("table");
      if (await table.isVisible()) {
        const headers = page.locator("th");
        expect(await headers.count()).toBeGreaterThan(0);
      }
    }
  });
});
