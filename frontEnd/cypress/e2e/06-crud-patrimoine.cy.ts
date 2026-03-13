describe('Patrimoine', () => {
  describe('Pages publiques', () => {
    it('affiche la liste du patrimoine', () => {
      cy.visit('/patrimoine');
      cy.checkPageLoaded();
      cy.get('body').should('not.be.empty');
    });

    it('charge les sites populaires via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/patrimoine/popular`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('charge les types de patrimoine via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/patrimoine/types`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('affiche les détails d\'un site patrimonial', () => {
      cy.visit('/patrimoine');
      cy.checkPageLoaded();
      cy.get('a[href*="/patrimoine/"]').first().click({ force: true });
      cy.url().should('match', /\/patrimoine\/\d+/);
      cy.checkPageLoaded();
    });

    it('charge la carte du patrimoine via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/patrimoine/map`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });

  describe('Recherche patrimoine', () => {
    it('recherche des sites via API', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/patrimoine/search?q=casbah`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });
  });

  describe('Création patrimoine (admin)', () => {
    it('accède au formulaire admin de création', () => {
      cy.loginAsAdmin();
      cy.visit('/admin/patrimoine/ajouter');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
    });

    it('affiche les champs du formulaire', () => {
      cy.loginAsAdmin();
      cy.visit('/admin/patrimoine/ajouter');
      cy.checkPageLoaded();
      cy.get('input, textarea, select').should('have.length.gte', 5);
    });
  });

  describe('Notation d\'un site', () => {
    it('l\'API de notation exige l\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/patrimoine/1/noter`,
        body: { note: 4 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403, 404]);
      });
    });

    it('valide la note entre 1 et 5', () => {
      cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/patrimoine/1/noter`,
        body: { note: 10 },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 404]);
      });
    });
  });
});
