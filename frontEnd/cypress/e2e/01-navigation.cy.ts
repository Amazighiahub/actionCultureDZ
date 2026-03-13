describe('Navigation & Pages publiques', () => {
  describe('Page d\'accueil', () => {
    beforeEach(() => cy.visit('/'));

    it('charge la page d\'accueil correctement', () => {
      cy.checkPageLoaded();
      cy.get('body').should('be.visible');
      cy.title().should('not.be.empty');
    });

    it('affiche le header avec les liens de navigation', () => {
      cy.get('header, nav').should('be.visible');
      cy.contains('a', /patrimoine/i).should('be.visible');
      cy.contains('a', /événements|evenements/i).should('be.visible');
      cy.contains('a', /œuvres|oeuvres/i).should('be.visible');
    });

    it('affiche le footer', () => {
      cy.get('footer').should('exist');
    });
  });

  describe('Pages publiques', () => {
    const publicPages = [
      { path: '/patrimoine', name: 'Patrimoine' },
      { path: '/evenements', name: 'Événements' },
      { path: '/oeuvres', name: 'Œuvres' },
      { path: '/artisanat', name: 'Artisanat' },
      { path: '/a-propos', name: 'À propos' },
      { path: '/auth', name: 'Authentification' },
    ];

    publicPages.forEach(({ path, name }) => {
      it(`charge la page ${name} (${path})`, () => {
        cy.visit(path);
        cy.checkPageLoaded();
        cy.url().should('include', path);
        cy.get('body').should('be.visible');
      });
    });
  });

  describe('Redirections SEO (PascalCase → lowercase)', () => {
    const redirects = [
      { from: '/Patrimoine', to: '/patrimoine' },
      { from: '/Evenements', to: '/evenements' },
      { from: '/Oeuvres', to: '/oeuvres' },
      { from: '/Artisanat', to: '/artisanat' },
      { from: '/Auth', to: '/auth' },
    ];

    redirects.forEach(({ from, to }) => {
      it(`redirige ${from} vers ${to}`, () => {
        cy.visit(from);
        cy.url().should('include', to);
      });
    });
  });

  describe('Redirections d\'alias', () => {
    it('redirige /profile vers /dashboard-user après connexion', () => {
      cy.loginAsVisitor();
      cy.visit('/profile');
      cy.url().should('include', '/dashboard-user');
    });

    it('redirige /mes-favoris vers /dashboard-user', () => {
      cy.loginAsVisitor();
      cy.visit('/mes-favoris');
      cy.url().should('include', '/dashboard-user');
    });
  });

  describe('Page 404', () => {
    it('affiche la page 404 pour une route inexistante', () => {
      cy.visit('/une-page-qui-nexiste-pas', { failOnStatusCode: false });
      cy.checkPageLoaded();
      cy.get('body').should('contain.text', '404').or('contain.text', 'introuvable').or('contain.text', 'not found');
    });
  });

  describe('Navigation entre pages', () => {
    it('navigue via les liens du header', () => {
      cy.visit('/');
      cy.contains('a', /patrimoine/i).click();
      cy.url().should('include', '/patrimoine');
      cy.go('back');
      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('les liens de navigation ne sont pas cassés', () => {
      cy.visit('/');
      cy.get('header a[href], nav a[href]').each(($link) => {
        const href = $link.attr('href');
        if (href && href.startsWith('/') && !href.includes('logout')) {
          cy.request({ url: Cypress.config().baseUrl + href, failOnStatusCode: false }).its('status').should('be.lt', 500);
        }
      });
    });
  });

  describe('Chargement des pages de détail', () => {
    it('charge une page de détail patrimoine', () => {
      cy.visit('/patrimoine');
      cy.checkPageLoaded();
      cy.get('a[href*="/patrimoine/"]').first().click({ force: true });
      cy.url().should('match', /\/patrimoine\/\d+/);
      cy.checkPageLoaded();
    });

    it('charge une page de détail événement', () => {
      cy.visit('/evenements');
      cy.checkPageLoaded();
      cy.get('a[href*="/evenements/"]').first().click({ force: true });
      cy.url().should('match', /\/evenements\/\d+/);
      cy.checkPageLoaded();
    });

    it('charge une page de détail œuvre', () => {
      cy.visit('/oeuvres');
      cy.checkPageLoaded();
      cy.get('a[href*="/oeuvres/"]').first().click({ force: true });
      cy.url().should('match', /\/oeuvres\/\d+/);
      cy.checkPageLoaded();
    });
  });
});
