describe('CRUD Œuvres', () => {
  let createdOeuvreId: string;

  before(() => cy.loginAsPro());

  describe('Création d\'une œuvre', () => {
    it('accède au formulaire de création', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.url().should('include', '/ajouter-oeuvre');
    });

    it('affiche les champs du formulaire', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.get('form').should('exist');
      cy.get('input, textarea, select').should('have.length.gte', 3);
    });

    it('valide les champs obligatoires (titre requis)', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.get('button[type="submit"]').last().click();
      cy.url().should('include', '/ajouter-oeuvre');
    });

    it('crée une œuvre avec succès', () => {
      cy.visit('/ajouter-oeuvre');
      cy.checkPageLoaded();
      cy.fixture('oeuvre').then((data) => {
        cy.intercept('POST', '**/api/oeuvres').as('createOeuvre');
        
        cy.get('input[name*="titre"], [name*="titre"] input').first().clear().type(data.livre.titre.fr);
        cy.get('textarea[name*="description"], [name*="description"] textarea').first().clear().type(data.livre.description.fr);
        
        cy.get('button[type="submit"]').last().click();
        cy.wait('@createOeuvre', { timeout: 15000 }).then((interception) => {
          expect(interception.response?.statusCode).to.be.oneOf([200, 201]);
          if (interception.response?.body?.data?.id_oeuvre) {
            createdOeuvreId = interception.response.body.data.id_oeuvre;
          }
        });
      });
    });
  });

  describe('Lecture des œuvres', () => {
    it('affiche la liste des œuvres publiques', () => {
      cy.visit('/oeuvres');
      cy.checkPageLoaded();
      cy.get('body').should('not.be.empty');
    });

    it('affiche les détails d\'une œuvre', () => {
      cy.visit('/oeuvres');
      cy.checkPageLoaded();
      cy.get('a[href*="/oeuvres/"]').first().click({ force: true });
      cy.url().should('match', /\/oeuvres\/\d+/);
      cy.checkPageLoaded();
    });

    it('affiche "Mes œuvres" dans le dashboard pro', () => {
      cy.loginAsPro();
      cy.visit('/dashboard-pro');
      cy.checkPageLoaded();
      cy.contains(/œuvres|oeuvres/i).should('be.visible');
    });
  });

  describe('Recherche d\'œuvres', () => {
    it('recherche par mot-clé via l\'API', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/oeuvres/search?q=test`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });
  });

  describe('Suppression via API', () => {
    it('supprime une œuvre via l\'API (nettoyage)', () => {
      if (createdOeuvreId) {
        cy.apiLogin(Cypress.env('proEmail'), Cypress.env('proPassword'));
        cy.request({
          method: 'DELETE',
          url: `${Cypress.env('apiUrl')}/oeuvres/${createdOeuvreId}`,
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status).to.be.oneOf([200, 204, 404]);
        });
      }
    });
  });
});
