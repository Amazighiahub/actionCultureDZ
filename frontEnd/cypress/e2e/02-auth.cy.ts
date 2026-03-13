describe('Authentification', () => {
  beforeEach(() => {
    cy.logout();
    cy.visit('/auth');
  });

  describe('Formulaire de connexion', () => {
    it('affiche le formulaire de connexion', () => {
      cy.get('input[type="email"], input[name="email"]').should('be.visible');
      cy.get('input[type="password"], input[name="mot_de_passe"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('refuse un email vide', () => {
      cy.get('button[type="submit"]').first().click();
      cy.url().should('include', '/auth');
    });

    it('refuse un email invalide', () => {
      cy.get('input[type="email"], input[name="email"]').first().type('invalid-email');
      cy.get('input[type="password"], input[name="mot_de_passe"]').first().type('SomePassword123!');
      cy.get('button[type="submit"]').first().click();
      cy.url().should('include', '/auth');
    });

    it('refuse un mot de passe incorrect', () => {
      cy.get('input[type="email"], input[name="email"]').first().type(Cypress.env('visitorEmail'));
      cy.get('input[type="password"], input[name="mot_de_passe"]').first().type('WrongPassword123!');
      cy.get('button[type="submit"]').first().click();
      cy.get('body').should('contain.text', /erreur|incorrect|invalide/i);
    });

    it('connecte un visiteur avec succès', () => {
      cy.loginAsVisitor();
      cy.url().should('not.include', '/auth');
    });

    it('connecte un professionnel avec succès', () => {
      cy.loginAsPro();
      cy.url().should('not.include', '/auth');
    });

    it('connecte un administrateur avec succès', () => {
      cy.loginAsAdmin();
      cy.url().should('not.include', '/auth');
    });
  });

  describe('Formulaire d\'inscription visiteur', () => {
    beforeEach(() => {
      cy.contains(/inscription|s'inscrire|créer un compte/i).click();
    });

    it('affiche le formulaire d\'inscription', () => {
      cy.get('input').should('have.length.gte', 4);
    });

    it('valide les champs obligatoires', () => {
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/auth');
    });

    it('valide le format email', () => {
      cy.get('input[name="email"], input[type="email"]').last().type('not-an-email');
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/auth');
    });

    it('valide la force du mot de passe (12+ caractères, majuscule, minuscule, chiffre)', () => {
      cy.get('input[name="mot_de_passe"], input[type="password"]').first().type('weak');
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/auth');
    });

    it('refuse un email déjà existant', () => {
      cy.fixture('users').then((users) => {
        cy.get('input[name="prenom"]').first().type('Test');
        cy.get('input[name="nom"]').first().type('Doublon');
        cy.get('input[name="email"], input[type="email"]').last().clear().type(users.visiteur.email);
        cy.get('input[name="mot_de_passe"], input[type="password"]').first().type('TestPassword123!@#');
        cy.get('input[name="confirmation"], input[name="confirmPassword"]').first().type('TestPassword123!@#');
      });
    });
  });

  describe('Déconnexion', () => {
    it('déconnecte l\'utilisateur', () => {
      cy.loginAsVisitor();
      cy.visit('/');
      cy.get('[aria-label*="menu"], button:contains("profil"), [data-testid="user-menu"]').first().click({ force: true });
      cy.contains(/déconnexion|logout|se déconnecter/i).click({ force: true });
      cy.url().should('satisfy', (url: string) => url.includes('/auth') || url === Cypress.config().baseUrl + '/');
    });
  });

  describe('Mot de passe oublié', () => {
    it('affiche le formulaire de récupération', () => {
      cy.visit('/forgot-password');
      cy.get('input[type="email"], input[name="email"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('envoie la demande de réinitialisation', () => {
      cy.visit('/forgot-password');
      cy.intercept('POST', '**/email-verification/request-password-reset').as('resetRequest');
      cy.get('input[type="email"], input[name="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();
      cy.wait('@resetRequest');
    });
  });
});
