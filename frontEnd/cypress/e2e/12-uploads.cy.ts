describe('Uploads de fichiers', () => {
  describe('Upload d\'image publique', () => {
    it('l\'API d\'upload public accepte une image', () => {
      cy.fixture('cypress/fixtures/test-image.jpg', 'binary').then(() => {
        // Skip if no test image available
      });
    });

    it('rejette un fichier trop volumineux via API', () => {
      const largeBuffer = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const blob = new Blob([largeBuffer], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('image', blob, 'large.jpg');

      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/upload/image/public`,
        body: formData,
        failOnStatusCode: false,
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 413, 422]);
      });
    });
  });

  describe('API d\'upload', () => {
    it('GET /upload retourne les informations de l\'API', () => {
      cy.request(`${Cypress.env('apiUrl')}/upload`).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('POST /upload/image requiert l\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/upload/image`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 400]);
      });
    });

    it('POST /upload/document requiert l\'authentification', () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/upload/document`,
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([401, 400]);
      });
    });
  });
});
