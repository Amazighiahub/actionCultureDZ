describe('Tests multi-rôles', () => {
  describe('Visiteur — permissions', () => {
    beforeEach(() => cy.loginAsVisitor());

    it('peut accéder aux pages publiques', () => {
      cy.visit('/patrimoine');
      cy.checkPageLoaded();
      cy.visit('/evenements');
      cy.checkPageLoaded();
      cy.visit('/oeuvres');
      cy.checkPageLoaded();
    });

    it('peut accéder au dashboard utilisateur', () => {
      cy.visit('/dashboard-user');
      cy.checkPageLoaded();
      cy.url().should('include', '/dashboard-user');
    });

    it('ne peut PAS accéder au dashboard pro', () => {
      cy.visit('/dashboard-pro');
      cy.url().should('not.include', '/dashboard-pro');
    });

    it('ne peut PAS accéder au dashboard admin', () => {
      cy.visit('/admin/dashboard');
      cy.url().should('not.include', '/admin/dashboard');
    });

    it('ne peut PAS créer d\'œuvre', () => {
      cy.visit('/ajouter-oeuvre');
      cy.url().should('not.include', '/ajouter-oeuvre');
    });

    it('ne peut PAS créer d\'événement', () => {
      cy.visit('/ajouter-evenement');
      cy.url().should('not.include', '/ajouter-evenement');
    });
  });

  describe('Professionnel — permissions', () => {
    beforeEach(() => cy.loginAsPro());

    it('peut accéder au dashboard pro', () => {
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.url().should('include', '/dashboard-pro');
    });

    it('peut accéder au formulaire de création d\'œuvre', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.url().should('include', '/ajouter-oeuvre');
    });

    it('peut accéder au formulaire de création d\'événement', () => {
      cy.visit('/ajouter-evenement');
      cy.checkPageLoaded();
      cy.url().should('include', '/ajouter-evenement');
    });

    it('peut accéder au formulaire de création d\'artisanat', () => {
      cy.visit('/ajouter-artisanat');
      cy.checkPageLoaded();
      cy.url().should('include', '/ajouter-artisanat');
    });

    it('ne peut PAS accéder au dashboard admin', () => {
      cy.visit('/admin/dashboard');
      cy.url().should('not.include', '/admin/dashboard');
    });

    it('ne peut PAS créer de patrimoine admin', () => {
      cy.visit('/admin/patrimoine/ajouter');
      cy.url().should('not.include', '/admin/patrimoine');
    });
  });

  describe('Administrateur — permissions', () => {
    beforeEach(() => cy.loginAsAdmin());

    it('peut accéder au dashboard admin', () => {
      cy.visit('/admin/dashboard');
      cy.checkPageLoaded();
      cy.url().should('include', '/admin/dashboard');
    });

    it('peut accéder à tous les onglets admin', () => {
      const tabs = ['overview', 'users', 'oeuvres', 'evenements', 'patrimoine', 'services', 'moderation'];
      tabs.forEach((tab) => {
        cy.visit(`/admin/dashboard?tab=${tab}`);
        cy.checkPageLoaded();
      });
    });

    it('peut accéder au formulaire de création patrimoine admin', () => {
      cy.visit('/admin/patrimoine/ajouter');
      cy.checkPageLoaded();
      cy.url().should('include', '/admin/patrimoine/ajouter');
    });

    it('peut gérer les utilisateurs via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/users`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('peut voir les œuvres en attente via API', () => {
      cy.request(`${Cypress.env('apiUrl')}/oeuvres/admin/pending`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });
});
