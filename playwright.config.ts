import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 60_000,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
