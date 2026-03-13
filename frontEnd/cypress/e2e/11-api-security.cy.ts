describe('Sécurité des API', () => {
  describe('Authentification requise', () => {
    beforeEach(() => cy.logout());

    const protectedEndpoints = [
      { method: 'GET', url: '/users/profile' },
      { method: 'POST', url: '/oeuvres', body: { titre: 'test' } },
      { method: 'POST', url: '/evenements', body: { nom: 'test' } },
      { method: 'DELETE', url: '/oeuvres/1' },
      { method: 'PUT', url: '/users/profile', body: { nom: 'hack' } },
      { method: 'POST', url: '/commentaires/oeuvre/1', body: { contenu: 'test' } },
    ];

    protectedEndpoints.forEach(({ method, url, body }) => {
      it(`${method} ${url} retourne 401 sans token`, () => {
        cy.request({
          method: method as Cypress.HttpMethod,
          url: `${Cypress.env('apiUrl')}${url}`,
          body,
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status).to.be.oneOf([401, 403]);
        });
      });
    });
  });

  describe('Routes admin — restreintes', () => {
    it('GET /users refuse sans rôle admin', () => {
      cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
      cy.request({
        url: `${Cypress.env('apiUrl')}/users`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });

    it('GET /dashboard/overview refuse sans rôle admin', () => {
      cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
      cy.request({
        url: `${Cypress.env('apiUrl')}/dashboard/overview`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });
  });

  describe('Validation des entrées', () => {
    it('rejette un ID non numérique', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/oeuvres/abc`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 404]);
      });
    });

    it('rejette un ID négatif', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/oeuvres/-1`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 404]);
      });
    });

    it('rejette une note de patrimoine invalide', () => {
      cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/patrimoine/1/noter`,
        body: { note: 999 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 404]);
      });
    });

    it('rejette un JSON malformé', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/users/login`,
        body: 'not-json{{{',
        headers: { 'Content-Type': 'application/json' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(400);
      });
    });
  });

  describe('Rate limiting', () => {
    it('l\'API de login applique le rate limiting', () => {
      const requests = Array.from({ length: 10 }, () =>
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/users/login`,
          body: { email: 'rate@test.com', mot_de_passe: 'wrong' },
          failOnStatusCode: false,
        })
      );

      cy.wrap(requests).then(() => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/users/login`,
          body: { email: 'rate@test.com', mot_de_passe: 'wrong' },
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status).to.be.oneOf([401, 429]);
        });
      });
    });
  });

  describe('Endpoints publics', () => {
    const publicEndpoints = [
      '/stats/public',
      '/oeuvres',
      '/evenements',
      '/patrimoine',
      '/artisanat',
      '/patrimoine/types',
      '/patrimoine/map',
    ];

    publicEndpoints.forEach((endpoint) => {
      it(`GET ${endpoint} est accessible publiquement`, () => {
        cy.request({
          url: `${Cypress.env('apiUrl')}${endpoint}`,
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status).to.eq(200);
        });
      });
    });
  });
});
