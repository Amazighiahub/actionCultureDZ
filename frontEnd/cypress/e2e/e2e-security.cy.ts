/**
 * E2E Parcours 5 — Sécurité : contrôle d'accès et protection des routes
 *
 * Vérifie qu'un utilisateur normal ne peut pas accéder aux pages admin,
 * ne peut pas modifier les ressources d'un autre utilisateur,
 * et qu'un token expiré/invalide redirige vers login.
 * Chaque test est indépendant (setup propre).
 */

describe('Parcours Sécurité — Contrôle d\'accès', () => {
  beforeEach(() => {
    cy.logout();
  });

  it('un visiteur normal ne peut pas accéder à /admin/dashboard', () => {
    // 1. Se connecter en tant que visiteur (rôle non-admin)
    cy.loginAsVisitor();

    // 2. Tenter d'accéder au dashboard admin
    cy.visit('/admin/dashboard', { failOnStatusCode: false });

    // 3. Vérifier la redirection : soit vers /auth, soit vers la page d'accueil,
    //    soit un message d'erreur 403
    cy.url({ timeout: 15000 }).then((url) => {
      const isBlocked =
        url.includes('/auth') ||
        url === Cypress.config('baseUrl') + '/' ||
        !url.includes('/admin/dashboard');

      expect(isBlocked).to.be.true;
    });

    // 4. Vérifier via API que le rôle visiteur est bien bloqué
    cy.request({
      url: `${Cypress.env('apiUrl')}/dashboard/overview`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 403]);
    });
  });

  it('un visiteur ne peut pas modifier l\'événement d\'un autre utilisateur via API', () => {
    // 1. Se connecter en tant que visiteur
    cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));

    // 2. Tenter de modifier un événement existant (ID 1) via PUT
    cy.request({
      method: 'PUT',
      url: `${Cypress.env('apiUrl')}/evenements/1`,
      body: {
        nom_evenement: { fr: 'Hacké!' },
        description: { fr: 'Tentative de modification non autorisée' },
      },
      failOnStatusCode: false,
    }).then((resp) => {
      // Le serveur doit retourner 401, 403 ou 404 (pas 200)
      expect(resp.status).to.be.oneOf([401, 403, 404]);
    });

    // 3. Tenter de supprimer un événement via DELETE
    cy.request({
      method: 'DELETE',
      url: `${Cypress.env('apiUrl')}/evenements/1`,
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 403, 404]);
    });

    // 4. Tenter de modifier une œuvre d'un autre utilisateur
    cy.request({
      method: 'PUT',
      url: `${Cypress.env('apiUrl')}/oeuvres/1`,
      body: { titre: { fr: 'Hacké!' } },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.be.oneOf([401, 403, 404]);
    });
  });

  it('un token expiré ou invalide redirige vers la page de connexion', () => {
    // 1. Simuler un token expiré/invalide en injectant un faux cookie/localStorage
    cy.clearCookies();
    cy.clearLocalStorage();

    // Injecter un faux token
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'fake-expired-token-12345');
      win.localStorage.setItem('accessToken', 'fake-expired-token-12345');
    });

    // 2. Tenter d'accéder à une route protégée
    cy.visit('/dashboard-user', { failOnStatusCode: false });

    // 3. Le frontend doit détecter le token invalide et rediriger vers /auth
    cy.url({ timeout: 15000 }).should('include', '/auth');

    // 4. Vérifier que le token fake a bien été nettoyé ou que l'UI affiche le login
    cy.get('input[name="email"], input[type="email"]').should('be.visible');
  });

  it('les routes protégées API rejettent les requêtes sans authentification', () => {
    // Vérifier que les endpoints critiques nécessitent un token
    const protectedEndpoints = [
      { method: 'GET' as const, url: '/users/profile' },
      { method: 'POST' as const, url: '/evenements', body: { nom_evenement: { fr: 'test' } } },
      { method: 'POST' as const, url: '/oeuvres', body: { titre: { fr: 'test' } } },
      { method: 'PUT' as const, url: '/users/profile', body: { nom: 'hack' } },
      { method: 'DELETE' as const, url: '/oeuvres/999' },
    ];

    protectedEndpoints.forEach(({ method, url, body }) => {
      cy.request({
        method,
        url: `${Cypress.env('apiUrl')}${url}`,
        body,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });
  });

  it('les routes admin API rejettent les requêtes d\'un utilisateur non-admin', () => {
    // 1. Se connecter en tant que visiteur
    cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));

    // 2. Tenter d'accéder aux endpoints admin
    const adminEndpoints = [
      { method: 'GET' as const, url: '/users' },
      { method: 'GET' as const, url: '/dashboard/overview' },
      { method: 'GET' as const, url: '/evenements/admin/all' },
    ];

    adminEndpoints.forEach(({ method, url }) => {
      cy.request({
        method,
        url: `${Cypress.env('apiUrl')}${url}`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });
  });
});
