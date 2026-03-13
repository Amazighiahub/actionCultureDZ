describe('CRUD Événements', () => {
  before(() => cy.loginAsPro());

  describe('Liste et détail', () => {
    it('affiche la liste des événements', () => {
      cy.visit('/evenements');
      cy.checkPageLoaded();
      cy.get('body').should('not.be.empty');
    });

    it('filtre les événements à venir via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/evenements/upcoming`).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('success', true);
      });
    });

    it('affiche les détails d\'un événement', () => {
      cy.visit('/evenements');
      cy.checkPageLoaded();
      cy.get('a[href*="/evenements/"]').first().click({ force: true });
      cy.url().should('match', /\/evenements\/\d+/);
      cy.checkPageLoaded();
    });
  });

  describe('Création d\'un événement', () => {
    it('accède au formulaire de création', () => {
      cy.loginAsPro();
      cy.visit('/ajouter-evenement');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
    });

    it('affiche les champs requis', () => {
      cy.loginAsPro();
      cy.visit('/ajouter-evenement');
      cy.checkPageLoaded();
      cy.get('input, textarea, select').should('have.length.gte', 3);
    });

    it('valide les champs obligatoires', () => {
      cy.loginAsPro();
      cy.visit('/ajouter-evenement');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-evenement');
    });
  });

  describe('Inscription à un événement', () => {
    it('l\'API d\'inscription exige l\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/evenements/1/register`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403, 404]);
      });
    });
  });

  describe('Mes événements (dashboard pro)', () => {
    it('affiche la liste des événements du professionnel', () => {
      cy.loginAsPro();
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.contains(/événements|evenements/i).click({ force: true });
      cy.checkPageLoaded();
    });
  });
});
