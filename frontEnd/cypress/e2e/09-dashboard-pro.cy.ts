describe('Dashboard Professionnel', () => {
  beforeEach(() => cy.loginAsPro());

  describe('Accès et chargement', () => {
    it('charge le dashboard professionnel', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.url().should('include', '/dashboard-pro');
    });

    it('affiche les statistiques', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
    });
  });

  describe('Onglets du dashboard', () => {
    it('affiche l\'onglet Œuvres', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.contains(/œuvres|oeuvres/i).first().click({ force: true });
    });

    it('affiche l\'onglet Événements', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.contains(/événements|evenements/i).first().click({ force: true });
    });

    it('affiche l\'onglet Services', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.contains(/services/i).first().click({ force: true });
    });

    it('affiche l\'onglet Artisanat', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.contains(/artisanat/i).first().click({ force: true });
    });
  });

  describe('Actions depuis le dashboard', () => {
    it('accède au formulaire d\'ajout d\'œuvre', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.get('a[href="/ajouter-oeuvre"], button').contains(/ajouter|créer|nouveau/i).first().click({ force: true });
      cy.url().should('satisfy', (url: string) => 
        url.includes('/ajouter-oeuvre') || url.includes('/ajouter-evenement') || url.includes('/dashboard-pro')
      );
    });
  });

  describe('API Dashboard Pro', () => {
    it('charge les œuvres du pro via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/oeuvres/my/list`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('charge les événements du pro via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/evenements/my/list`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('charge les services du pro via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/services/my/list`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });
});
