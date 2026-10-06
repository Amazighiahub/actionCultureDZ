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
    // Comptes de démonstration fictifs (seed-demo-data.sql). Aucun mot de passe n'est
    // versionné : CYPRESS_DEMO_PASSWORD = la valeur de SEED_DEMO_PASSWORD utilisée au seed.
    env: {
      apiUrl: process.env.CYPRESS_API_URL || 'http://localhost:3001/api',
      adminEmail: process.env.CYPRESS_ADMIN_EMAIL || 'admin@example.invalid',
      adminPassword: process.env.CYPRESS_ADMIN_PASSWORD || process.env.CYPRESS_DEMO_PASSWORD || '',
      proEmail: process.env.CYPRESS_PRO_EMAIL || 'demo9@example.invalid',
      proPassword: process.env.CYPRESS_PRO_PASSWORD || process.env.CYPRESS_DEMO_PASSWORD || '',
      visitorEmail: process.env.CYPRESS_VISITOR_EMAIL || 'demo10@example.invalid',
      visitorPassword: process.env.CYPRESS_VISITOR_PASSWORD || process.env.CYPRESS_DEMO_PASSWORD || '',
    },
  },
});
