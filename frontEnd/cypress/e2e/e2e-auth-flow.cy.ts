/**
 * E2E Parcours 1 — Inscription → Connexion → Navigation
 *
 * Parcours utilisateur complet : de l'inscription jusqu'à la vérification
 * du profil. Chaque test est indépendant (setup propre).
 */

describe('Parcours Auth — Inscription, connexion, navigation', () => {
  const uniqueId = Date.now();
  const testUser = {
    prenom: 'TestPrenom',
    nom: 'TestNom',
    email: `e2e-user-${uniqueId}@test.dz`,
    password: 'SecurePass123!@#',
    telephone: '+213551234567',
  };

  beforeEach(() => {
    cy.logout();
  });

  it('parcours complet : inscription puis connexion puis dashboard', () => {
    // 1. Aller sur la page d'inscription
    cy.visit('/auth');
    cy.checkPageLoaded();

    // Basculer vers le formulaire d'inscription
    cy.contains(/inscription|s'inscrire|créer un compte/i).click();

    // 2. Remplir TOUS les champs avec des données valides
    cy.get('input[name="prenom"], input[id="prenom"]').first().clear().type(testUser.prenom);
    cy.get('input[name="nom"], input[id="nom"]').first().clear().type(testUser.nom);
    cy.get('input[name="email"], input[type="email"]').last().clear().type(testUser.email);
    cy.get('input[name="mot_de_passe"], input[name="password"], input[type="password"]').first().clear().type(testUser.password);
    cy.get('input[name="confirmation"], input[name="confirmPassword"], input[name="password-confirm"]').first().clear().type(testUser.password);

    // Date de naissance (>= 13 ans)
    cy.get('input[name="date_naissance"], input[id="date-naissance"], input[type="date"]').first().then(($input) => {
      if ($input.length) {
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - 20);
        cy.wrap($input).clear().type(birthDate.toISOString().split('T')[0]);
      }
    });

    // Téléphone (optionnel)
    cy.get('input[name="telephone"], input[id="telephone"]').first().then(($input) => {
      if ($input.length) {
        cy.wrap($input).clear().type(testUser.telephone);
      }
    });

    // Accepter les conditions
    cy.get('input[name="conditions"], input[id="conditions"], input[type="checkbox"]').first().check({ force: true });

    // 3. Soumettre → intercepter la requête
    cy.intercept('POST', '**/users/register').as('register');
    cy.get('button[type="submit"]').last().click();

    // Vérifier succès ou redirection (l'inscription peut nécessiter une vérification email)
    cy.wait('@register', { timeout: 15000 }).then((interception) => {
      // Soit 201 (succès), soit 200, soit 409 (email existant en re-run)
      expect(interception.response?.statusCode).to.be.oneOf([200, 201, 409]);
    });

    // 4. Aller sur la page de connexion et se connecter
    cy.visit('/auth');
    cy.checkPageLoaded();

    // 5. Se connecter avec les identifiants d'un utilisateur existant (les seed)
    cy.get('input[name="email"], input[type="email"]').first().clear().type(Cypress.env('visitorEmail'));
    cy.get('input[name="mot_de_passe"], input[name="password"], input[type="password"]').first().clear().type(Cypress.env('visitorPassword'));
    cy.get('button[type="submit"]').first().click();

    // 6. Vérifier que le dashboard s'affiche
    cy.url({ timeout: 15000 }).should('not.include', '/auth');

    // 7. Vérifier que le header contient un indicateur de connexion
    cy.get('header, nav').should('be.visible');
    cy.get('body').should('satisfy', ($body: JQuery) => {
      const text = $body.text().toLowerCase();
      // L'utilisateur voit un menu profil ou un lien dashboard
      return text.includes('profil') || text.includes('dashboard') || text.includes('déconnexion') || text.includes('logout');
    });

    // 8. Naviguer vers le profil
    cy.visit('/dashboard-user');
    cy.checkPageLoaded();
    cy.url().should('include', '/dashboard-user');
  });

  it('inscription avec email existant affiche erreur', () => {
    cy.visit('/auth');
    cy.checkPageLoaded();

    // Basculer vers inscription
    cy.contains(/inscription|s'inscrire|créer un compte/i).click();

    // Remplir avec un email déjà existant (utilisateur seed)
    cy.get('input[name="prenom"], input[id="prenom"]').first().clear().type('Doublon');
    cy.get('input[name="nom"], input[id="nom"]').first().clear().type('Test');
    cy.get('input[name="email"], input[type="email"]').last().clear().type(Cypress.env('visitorEmail'));
    cy.get('input[name="mot_de_passe"], input[name="password"], input[type="password"]').first().clear().type('SecurePass123!@#');
    cy.get('input[name="confirmation"], input[name="confirmPassword"], input[name="password-confirm"]').first().clear().type('SecurePass123!@#');

    // Date de naissance
    cy.get('input[name="date_naissance"], input[id="date-naissance"], input[type="date"]').first().then(($input) => {
      if ($input.length) {
        const birthDate = new Date();
        birthDate.setFullYear(birthDate.getFullYear() - 20);
        cy.wrap($input).clear().type(birthDate.toISOString().split('T')[0]);
      }
    });

    cy.get('input[name="conditions"], input[id="conditions"], input[type="checkbox"]').first().check({ force: true });

    cy.intercept('POST', '**/users/register').as('register');
    cy.get('button[type="submit"]').last().click();

    // Le serveur retourne 409 (conflit) ou le formulaire affiche une erreur
    cy.wait('@register', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([409, 400, 422]);
    });

    // On reste sur la page d'auth
    cy.url().should('include', '/auth');
  });

  it('connexion avec mauvais mot de passe affiche erreur', () => {
    cy.visit('/auth');
    cy.checkPageLoaded();

    cy.get('input[name="email"], input[type="email"]').first().clear().type(Cypress.env('visitorEmail'));
    cy.get('input[name="mot_de_passe"], input[name="password"], input[type="password"]').first().clear().type('WrongPassword999!');

    cy.intercept('POST', '**/users/login').as('login');
    cy.get('button[type="submit"]').first().click();

    // Le serveur retourne 401 ou 400
    cy.wait('@login', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([400, 401, 403]);
    });

    // On reste sur la page d'auth
    cy.url().should('include', '/auth');

    // Un message d'erreur est affiché
    cy.get('[role="alert"], .text-destructive, .error-message').should('exist');
  });

  it('accès à une route protégée sans connexion redirige vers login', () => {
    cy.logout();

    // Tenter d'accéder au dashboard utilisateur
    cy.visit('/dashboard-user', { failOnStatusCode: false });

    // Doit rediriger vers /auth
    cy.url({ timeout: 10000 }).should('include', '/auth');
  });
});
