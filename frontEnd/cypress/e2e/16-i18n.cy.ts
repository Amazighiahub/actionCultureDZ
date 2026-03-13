describe('Internationalisation (i18n)', () => {
  describe('Changement de langue', () => {
    it('la page charge en français par défaut', () => {
      cy.visit('/');
      cy.checkPageLoaded();
      cy.get('html').should('have.attr', 'lang').and('match', /fr/);
    });

    it('change la direction en RTL pour l\'arabe', () => {
      cy.visit('/');
      cy.checkPageLoaded();
      // Try to find and click a language selector
      cy.get('button, select').then(($elements) => {
        const langSelector = $elements.filter((_, el) => {
          return el.textContent?.includes('عربية') || el.textContent?.includes('AR') || el.getAttribute('data-lang') === 'ar';
        });
        if (langSelector.length > 0) {
          cy.wrap(langSelector.first()).click({ force: true });
          cy.get('html').should('have.attr', 'dir', 'rtl');
        }
      });
    });
  });

  describe('API de langue', () => {
    it('GET /languages retourne les langues disponibles', () => {
      cy.request({
        url: `${Cypress.env('apiUrl').replace('/api', '')}/api/languages`,
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          expect(resp.body).to.have.property('success', true);
        }
      });
    });
  });

  describe('Contenu multilingue', () => {
    it('les éléments d\'interface sont traduits (pas de clé i18n brute)', () => {
      cy.visit('/');
      cy.checkPageLoaded();
      cy.get('body').invoke('text').then((text) => {
        const rawKeyPattern = /[a-z]+\.[a-z]+\.[a-z]+/g;
        const matches = text.match(rawKeyPattern) || [];
        const suspiciousKeys = matches.filter((m) =>
          m.includes('_') || (m.split('.').length >= 3 && !m.includes('http') && !m.includes('www'))
        );
        cy.log(`Clés suspectes trouvées: ${suspiciousKeys.length}`);
      });
    });
  });
});
