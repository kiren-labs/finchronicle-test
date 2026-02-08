import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined, // Parallel execution in CI
  reporter: 'html',
  timeout: 60000, // 60s per test (default is 30s)
  expect: {
    timeout: 10000, // 10s for assertions (default is 5s)
  },

  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Performance optimizations
    actionTimeout: 15000, // Reasonable timeout for actions
    navigationTimeout: 30000,
    // Disable service workers in tests to prevent interference
    serviceWorkers: 'block',
    // Set desktop viewport to ensure tabs are visible (not mobile bottom nav)
    viewport: { width: 1280, height: 720 },
  },

  projects: process.env.CI ? [
    // CI: Only test on Chromium for speed
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ] : [
    // Local: Test on desktop browsers only (mobile has different navigation)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
    // Mobile tests disabled - tests use #list-tab which is hidden in mobile layout
    // Mobile devices use bottom navigation bar instead
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  webServer: {
    command: 'cd ../finance-tracker && python3 -m http.server 8000',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
