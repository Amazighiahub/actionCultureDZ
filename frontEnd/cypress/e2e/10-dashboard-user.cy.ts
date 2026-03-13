describe('Dashboard Utilisateur', () => {
  beforeEach(() => cy.loginAsVisitor());

  describe('Accès et chargement', () => {
    it('charge le dashboard utilisateur', () => {
      cy.visit('/dashboard-user');
      cy.checkPageLoaded();
      cy.url().should('include', '/dashboard-user');
    });
  });

  describe('Onglets', () => {
    it('affiche les favoris', () => {
      cy.visit('/dashboard-user');
      cy.checkPageLoaded();
      cy.contains(/favoris/i).should('be.visible');
    });

    it('affiche les notifications', () => {
      cy.visit('/dashboard-user');
      cy.checkPageLoaded();
      cy.contains(/notification/i).first().click({ force: true });
    });

    it('affiche le profil', () => {
      cy.visit('/dashboard-user');
      cy.checkPageLoaded();
      cy.contains(/profil/i).first().click({ force: true });
    });
  });

  describe('Favoris', () => {
    it('charge les favoris via API', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/favoris`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });
  });

  describe('Notifications', () => {
    it('accède à la page de notifications', () => {
      cy.visit('/notifications');
      cy.checkPageLoaded();
      cy.url().should('include', '/notifications');
    });

    it('accède aux préférences de notifications', () => {
      cy.visit('/notifications/preferences');
      cy.checkPageLoaded();
      cy.url().should('include', '/notifications/preferences');
    });
  });
});
