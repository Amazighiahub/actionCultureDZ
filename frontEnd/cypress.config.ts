import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    video: false,
    screenshotOnRunFailure: true,
    retries: { runMode: 2, openMode: 0 },
    env: {
      apiUrl: 'http://localhost:3001/api',
      adminEmail: 'admin@actionculture.dz',
      adminPassword: 'admin123',
      proEmail: 'm.benali@test.dz',
      proPassword: 'password123',
      visitorEmail: 'f.saidi@test.com',
      visitorPassword: 'password123',
    },
  },
});
