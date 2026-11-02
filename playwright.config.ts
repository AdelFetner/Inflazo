import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  use: { baseURL: BASE_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    env: { NEXT_PUBLIC_SITE_URL: BASE_URL },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
