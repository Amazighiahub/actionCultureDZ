/// <reference types="cypress" />

/**
 * Suite E2E : Tests exhaustifs de tous les formulaires
 * Couvre : Auth, ResetPassword, Oeuvre, Evenement, Service, ServicePro,
 * Patrimoine, PatrimoinePro, Artisanat, Organisation, Programme,
 * GestionArtisanat, Notifications, Commentaires, EventRegistration, Admin
 */

describe('Formulaires - Couverture exhaustive', () => {
  describe('1. Auth (Login + Register visiteur/pro)', () => {
    beforeEach(() => {
      cy.logout();
      cy.visit('/auth');
    });

    it('formulaire login : affichage des champs', () => {
      cy.get('input[type="email"], input[name="email"]').should('be.visible');
      cy.get('input[type="password"], input[name="mot_de_passe"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('formulaire login : validation email vide', () => {
      cy.get('input[type="password"]').first().type('Password123!');
      cy.get('button[type="submit"]').first().click();
      cy.url().should('include', '/auth');
    });

    it('formulaire inscription visiteur : affichage et validation', () => {
      cy.contains(/inscription|s'inscrire|créer un compte/i).click();
      cy.get('form').should('exist');
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/auth');
    });
  });

  describe('2. Mot de passe oublié', () => {
    it('formulaire forgot-password : affichage et soumission', () => {
      cy.visit('/forgot-password');
      cy.get('input[type="email"], input[name="email"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
      cy.intercept('POST', '**/email-verification/request-password-reset').as('reset');
      cy.get('input[type="email"], input[name="email"]').type('test@example.com');
      cy.get('button[type="submit"]').click();
      cy.wait('@reset', { timeout: 10000 });
    });
  });

  describe('3. Réinitialisation mot de passe (ResetPassword)', () => {
    it('formulaire reset-password : affichage des champs', () => {
      cy.visit('/reset-password/test-token-demo');
      cy.get('input[type="password"]').should('have.length.gte', 2);
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('formulaire reset-password : validation mot de passe faible', () => {
      cy.visit('/reset-password/test-token-demo');
      cy.get('input[type="password"]').first().type('weak');
      cy.get('input[name="confirmPassword"], input[type="password"]').last().type('weak');
      cy.get('button[type="submit"]').click();
      cy.get('body').should('satisfy', ($body) => {
        const text = $body.text();
        return text.includes('12') || text.includes('caractère') || text.includes('required') || $body.find('[role="alert"]').length > 0;
      });
    });
  });

  describe('4. Formulaire Ajouter Œuvre', () => {
    before(() => cy.loginAsPro());

    it('accède et affiche les champs', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 5);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-oeuvre');
    });

    it('remplit et soumet (succès ou erreur serveur)', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.fixture('oeuvre').then((data) => {
        cy.intercept('POST', '**/api/oeuvres').as('create');
        cy.get('input[name*="titre"], [name*="titre"] input').first().clear().type(data.livre.titre.fr);
        cy.get('textarea[name*="description"], [name*="description"] textarea').first().clear().type(data.livre.description.fr);
        cy.get('button[type="submit"]').last().click();
        cy.wait('@create', { timeout: 15000 }).then((xhr) => {
          expect(xhr.response?.statusCode).to.be.oneOf([200, 201, 400, 422]);
        });
      });
    });
  });

  describe('5. Formulaire Ajouter Événement', () => {
    before(() => cy.loginAsPro());

    it('accède et affiche les champs', () => {
      cy.visit('/ajouter-evenement');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 5);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/ajouter-evenement');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-evenement');
    });
  });

  describe('6. Formulaire Service (catalogue patrimoine)', () => {
    before(() => cy.loginAsPro());

    it('accède au formulaire ajouter-service', () => {
      cy.visit('/ajouter-service');
      cy.checkPageLoaded();
      cy.get('form, [role="form"]').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 3);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/ajouter-service');
      cy.checkPageLoaded();
      cy.get('form button[type="submit"]').first().click({ force: true });
      cy.url().should('include', '/ajouter-service');
    });
  });

  describe('7. Formulaire Service Pro (ajouter-mon-service)', () => {
    before(() => cy.loginAsPro());

    it('accède au formulaire', () => {
      cy.visit('/ajouter-mon-service');
      cy.checkPageLoaded();
      cy.get('form, [role="form"]').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 5);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/ajouter-mon-service');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-mon-service');
    });
  });

  describe('8. Formulaire Patrimoine Pro', () => {
    before(() => cy.loginAsPro());

    it('accède au formulaire ajouter-patrimoine', () => {
      cy.visit('/ajouter-patrimoine');
      cy.checkPageLoaded();
      cy.get('form, [role="form"]').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 5);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/ajouter-patrimoine');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-patrimoine');
    });
  });

  describe('9. Formulaire Artisanat', () => {
    before(() => cy.loginAsPro());

    it('accède et affiche les champs', () => {
      cy.visit('/ajouter-artisanat');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 3);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/ajouter-artisanat');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-artisanat');
    });
  });

  describe('10. Formulaire Organisation', () => {
    before(() => cy.loginAsPro());

    it('accède au formulaire ajouter-organisation', () => {
      cy.visit('/ajouter-organisation');
      cy.checkPageLoaded();
      cy.get('form, [role="form"]').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 3);
    });

    it('valide les champs obligatoires (nom multilingue)', () => {
      cy.visit('/ajouter-organisation');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-organisation');
    });
  });

  describe('11. Formulaire Programme', () => {
    before(() => cy.loginAsPro());

    it('accède à la page programme/creer (avec eventId en query)', () => {
      cy.request(`${Cypress.env('apiUrl')}/evenements/upcoming`).then((resp) => {
        const eventId = resp.body?.data?.[0]?.id_evenement || resp.body?.[0]?.id_evenement || 1;
        cy.visit(`/programme/creer?eventId=${eventId}`);
        cy.checkPageLoaded();
        cy.get('form, [role="form"]').should('exist');
      });
    });

    it('formulaire programme : validation si champs vides', () => {
      cy.request(`${Cypress.env('apiUrl')}/evenements/upcoming`).then((resp) => {
        const eventId = resp.body?.data?.[0]?.id_evenement || resp.body?.[0]?.id_evenement || 1;
        cy.visit(`/programme/creer?eventId=${eventId}`);
        cy.checkPageLoaded();
        cy.get('form button[type="submit"], button[type="submit"]').first().click({ force: true });
        cy.url().should('include', '/programme/creer');
      });
    });
  });

  describe('12. Gestion Artisanat', () => {
    before(() => cy.loginAsPro());

    it('accède à gestion-artisanat', () => {
      cy.visit('/gestion-artisanat');
      cy.checkPageLoaded();
      cy.get('body').should('not.be.empty');
    });
  });

  describe('13. Patrimoine Admin', () => {
    before(() => cy.loginAsAdmin());

    it('formulaire admin/patrimoine/ajouter', () => {
      cy.visit('/admin/patrimoine/ajouter');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 5);
    });

    it('valide les champs obligatoires', () => {
      cy.visit('/admin/patrimoine/ajouter');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/admin/patrimoine/ajouter');
    });
  });

  describe('14. Préférences notifications', () => {
    before(() => cy.loginAsVisitor());

    it('accède aux préférences notifications', () => {
      cy.visit('/notifications/preferences');
      cy.checkPageLoaded();
      cy.get('body').should('not.be.empty');
      cy.get('input[type="checkbox"], button').should('exist');
    });
  });

  describe('15. Commentaires (œuvre)', () => {
    before(() => cy.loginAsVisitor());

    it('affiche le formulaire commentaire sur une œuvre', () => {
      cy.visit('/oeuvres');
      cy.checkPageLoaded();
      cy.get('a[href*="/oeuvres/"]').first().click({ force: true });
      cy.url().should('match', /\/oeuvres\/\d+/);
      cy.checkPageLoaded();
      cy.get('textarea, input[type="text"]').filter(':visible').should('exist');
    });
  });

  describe('16. Inscription événement (EventRegistration)', () => {
    before(() => cy.loginAsVisitor());

    it('affiche le bloc inscription sur un événement', () => {
      cy.visit('/evenements');
      cy.checkPageLoaded();
      cy.get('a[href*="/evenements/"]').first().click({ force: true });
      cy.url().should('match', /\/evenements\/\d+/);
      cy.checkPageLoaded();
      cy.get('body').should('contain.text', /inscri|register|s'inscrire|participer/i);
    });
  });

  describe('17. Formulaires édition (modifier-*)', () => {
    before(() => cy.loginAsPro());

    it('modifier-oeuvre : accès formulaire si ID existant', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/oeuvres?limit=1`,
        failOnStatusCode: false,
      }).then((resp) => {
        const id = resp.body?.data?.[0]?.id_oeuvre || resp.body?.[0]?.id_oeuvre;
        if (id) {
          cy.visit(`/modifier-oeuvre/${id}`);
          cy.checkPageLoaded();
          cy.get('form').should('exist');
        }
      });
    });

    it('modifier-evenement : accès formulaire si ID existant', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/evenements?limit=1`,
        failOnStatusCode: false,
      }).then((resp) => {
        const id = resp.body?.data?.[0]?.id_evenement || resp.body?.[0]?.id_evenement;
        if (id) {
          cy.visit(`/modifier-evenement/${id}`);
          cy.checkPageLoaded();
          cy.get('form').should('exist');
        }
      });
    });

    it('modifier-artisanat : accès formulaire si ID existant', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/artisanat?limit=1`,
        failOnStatusCode: false,
      }).then((resp) => {
        const id = resp.body?.data?.[0]?.id_artisanat || resp.body?.[0]?.id_artisanat;
        if (id) {
          cy.visit(`/modifier-artisanat/${id}`);
          cy.checkPageLoaded();
          cy.get('form').should('exist');
        }
      });
    });
  });

  describe('18. Admin : modal notifications', () => {
    before(() => cy.loginAsAdmin());

    it('dashboard admin : accès au panneau notifications', () => {
      cy.visit('/admin/dashboard');
      cy.checkPageLoaded();
      cy.contains(/notifications?|notification/i).click({ force: true });
      cy.get('body').should('not.be.empty');
    });
  });
});
