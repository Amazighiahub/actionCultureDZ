describe('Redirections & Protections de routes', () => {
  describe('Routes protégées — redirection vers /auth si non connecté', () => {
    beforeEach(() => cy.logout());

    const protectedRoutes = [
      '/dashboard',
      '/dashboard-user',
      '/dashboard-pro',
      '/admin/dashboard',
      '/notifications',
      '/ajouter-oeuvre',
      '/ajouter-evenement',
      '/ajouter-artisanat',
    ];

    protectedRoutes.forEach((route) => {
      it(`redirige ${route} vers /auth`, () => {
        cy.visit(route);
        cy.url().should('include', '/auth');
      });
    });
  });

  describe('Redirection par rôle depuis /dashboard', () => {
    it('redirige un visiteur vers /dashboard-user', () => {
      cy.loginAsVisitor();
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard-user');
    });

    it('redirige un professionnel vers /dashboard-pro', () => {
      cy.loginAsPro();
      cy.visit('/dashboard');
      cy.url().should('include', '/dashboard-pro');
    });

    it('redirige un admin vers /admin/dashboard', () => {
      cy.loginAsAdmin();
      cy.visit('/dashboard');
      cy.url().should('include', '/admin/dashboard');
    });
  });

  describe('Accès admin — restreint aux administrateurs', () => {
    it('redirige un visiteur qui tente d\'accéder à /admin/dashboard', () => {
      cy.loginAsVisitor();
      cy.visit('/admin/dashboard');
      cy.url().should('not.include', '/admin/dashboard');
    });

    it('redirige un professionnel qui tente d\'accéder à /admin/dashboard', () => {
      cy.loginAsPro();
      cy.visit('/admin/dashboard');
      cy.url().should('not.include', '/admin/dashboard');
    });

    it('permet à l\'admin d\'accéder à /admin/dashboard', () => {
      cy.loginAsAdmin();
      cy.visit('/admin/dashboard');
      cy.url().should('include', '/admin/dashboard');
      cy.checkPageLoaded();
    });
  });

  describe('Routes admin — redirections internes', () => {
    beforeEach(() => cy.loginAsAdmin());

    it('/admin/users redirige vers /admin/dashboard?tab=users', () => {
      cy.visit('/admin/users');
      cy.url().should('include', '/admin/dashboard');
    });

    it('/admin/metadata redirige vers /admin/dashboard?tab=overview', () => {
      cy.visit('/admin/metadata');
      cy.url().should('include', '/admin/dashboard');
    });
  });
});
