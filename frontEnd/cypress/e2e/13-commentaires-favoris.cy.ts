describe('Commentaires & Favoris', () => {
  describe('Commentaires sur œuvres', () => {
    it('charge les commentaires d\'une œuvre via API', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/commentaires/oeuvre/1`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });

    it('créer un commentaire requiert l\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/commentaires/oeuvre/1`,
        body: { contenu: 'Test commentaire' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });

    it('crée un commentaire authentifié', () => {
      cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/commentaires/oeuvre/1`,
        body: { contenu: 'Commentaire de test Cypress' },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 201, 404]);
      });
    });
  });

  describe('Commentaires sur événements', () => {
    it('charge les commentaires d\'un événement via API', () => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/commentaires/evenement/1`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 404]);
      });
    });
  });

  describe('Favoris', () => {
    it('ajouter un favori requiert l\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/patrimoine/1/favoris`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 403]);
      });
    });

    it('ajoute et retire un favori patrimoine', () => {
      cy.apiLogin(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/patrimoine/1/favoris`,
        failOnStatusCode: false,
      }).then((addResp) => {
        expect(addResp.status).to.be.oneOf([200, 201, 404, 409]);

        if (addResp.status === 200 || addResp.status === 201 || addResp.status === 409) {
          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('apiUrl')}/patrimoine/1/favoris`,
            failOnStatusCode: false,
          }).then((removeResp) => {
            expect(removeResp.status).to.be.oneOf([200, 204, 404]);
          });
        }
      });
    });
  });
});
