describe('CRUD Artisanat', () => {
  describe('Pages publiques', () => {
    it('affiche la liste des artisanats', () => {
      cy.visit('/artisanat');
      cy.checkPageLoaded();
    });

    it('charge les statistiques via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/artisanat/statistics`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('affiche les détails d\'un artisanat', () => {
      cy.visit('/artisanat');
      cy.checkPageLoaded();
      cy.get('a[href*="/artisanat/"]').first().click({ force: true });
      cy.url().should('match', /\/artisanat\/\d+/);
      cy.checkPageLoaded();
    });
  });

  describe('Création d\'un artisanat (pro)', () => {
    it('accède au formulaire de création', () => {
      cy.loginAsPro();
      cy.visit('/ajouter-artisanat');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
    });

    it('valide les champs obligatoires', () => {
      cy.loginAsPro();
      cy.visit('/ajouter-artisanat');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-artisanat');
    });
  });

  describe('Recherche artisanat', () => {
    it('recherche via API', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/artisanat/search?q=poterie`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });
  });
});
