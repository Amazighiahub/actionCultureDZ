describe('Dashboard Administrateur', () => {
  beforeEach(() => cy.loginAsAdmin());

  describe('Accès et chargement', () => {
    it('charge le dashboard admin', () => {
      cy.visit('/admin/dashboard');
      cy.checkPageLoaded();
      cy.url().should('include', '/admin/dashboard');
    });

    it('affiche les statistiques de l\'overview', () => {
      cy.visit('/admin/dashboard');
      cy.checkPageLoaded();
      cy.get('body').should('contain.text', /utilisateur|user/i);
    });
  });

  describe('Navigation par onglets', () => {
    const tabs = ['users', 'oeuvres', 'evenements', 'patrimoine', 'services', 'moderation'];

    tabs.forEach((tab) => {
      it(`charge l'onglet ${tab}`, () => {
        cy.visit(`/admin/dashboard?tab=${tab}`);
        cy.checkPageLoaded();
        cy.url().should('include', `tab=${tab}`);
      });
    });
  });

  describe('Gestion des utilisateurs', () => {
    it('affiche la liste des utilisateurs', () => {
      cy.visit('/admin/dashboard?tab=users');
      cy.checkPageLoaded();
    });

    it('charge les utilisateurs en attente via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/users/pending`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('charge les statistiques utilisateurs via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/users/stats`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });

  describe('Gestion des œuvres', () => {
    it('affiche les œuvres en attente via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/oeuvres/admin/pending`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });

  describe('Statistiques du dashboard', () => {
    it('charge l\'overview via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/dashboard/overview`).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('success', true);
      });
    });
  });
});
