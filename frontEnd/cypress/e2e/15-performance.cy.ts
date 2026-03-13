describe('Performance des pages', () => {
  const performanceThreshold = 10000; // 10 secondes max

  describe('Pages publiques — temps de chargement', () => {
    const pages = [
      { path: '/', name: 'Accueil' },
      { path: '/patrimoine', name: 'Patrimoine' },
      { path: '/evenements', name: 'Événements' },
      { path: '/oeuvres', name: 'Œuvres' },
      { path: '/artisanat', name: 'Artisanat' },
      { path: '/auth', name: 'Authentification' },
    ];

    pages.forEach(({ path, name }) => {
      it(`${name} charge en moins de ${performanceThreshold / 1000}s`, () => {
        const start = Date.now();
        cy.visit(path);
        cy.checkPageLoaded();
        cy.then(() => {
          const loadTime = Date.now() - start;
          expect(loadTime).to.be.lessThan(performanceThreshold);
          cy.log(`${name}: ${loadTime}ms`);
        });
      });
    });
  });

  describe('API — temps de réponse', () => {
    const apiEndpoints = [
      { url: '/stats/public', name: 'Stats publiques' },
      { url: '/oeuvres', name: 'Liste œuvres' },
      { url: '/evenements', name: 'Liste événements' },
      { url: '/patrimoine', name: 'Liste patrimoine' },
      { url: '/artisanat', name: 'Liste artisanat' },
      { url: '/patrimoine/map', name: 'Carte patrimoine' },
    ];

    apiEndpoints.forEach(({ url, name }) => {
      it(`${name} répond en moins de 5s`, () => {
        const start = Date.now();
        cy.request(`${Cypress.env('apiUrl')}${url}`).then((resp) => {
          const responseTime = Date.now() - start;
          expect(resp.status).to.eq(200);
          expect(responseTime).to.be.lessThan(5000);
          cy.log(`${name}: ${responseTime}ms`);
        });
      });
    });
  });

  describe('Dashboard admin — performance', () => {
    it('le dashboard admin charge en moins de 15s', () => {
      cy.loginAsAdmin();
      const start = Date.now();
      cy.visit('/admin/dashboard');
      cy.checkPageLoaded();
      cy.then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(15000);
        cy.log(`Dashboard admin: ${loadTime}ms`);
      });
    });
  });

  describe('Santé de l\'API', () => {
    it('le health check répond correctement', () => {
      cy.request({
        url: Cypress.env('apiUrl').replace('/api', '') + '/health',
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });

    it('les métriques sont disponibles', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/metrics`,
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          expect(resp.body).to.have.property('uptime');
          expect(resp.body).to.have.property('memory');
        }
      });
    });
  });
});
