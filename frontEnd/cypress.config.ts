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
    // Surcharger en CI via: CYPRESS_adminPassword=<mdp> npx cypress run
    env: {
      apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:3001/api',
      adminEmail: process.env.CYPRESS_ADMIN_EMAIL || 'admin@actionculture.dz',
      adminPassword: process.env.CYPRESS_ADMIN_PASSWORD || 'admin123',
      proEmail: process.env.CYPRESS_PRO_EMAIL || 'm.benali@test.dz',
      proPassword: process.env.CYPRESS_PRO_PASSWORD || 'password123',
      visitorEmail: process.env.CYPRESS_VISITOR_EMAIL || 'f.saidi@test.com',
      visitorPassword: process.env.CYPRESS_VISITOR_PASSWORD || 'password123',
    },
  },
});
