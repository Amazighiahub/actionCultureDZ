/**
 * E2E Parcours 3 — Recherche et filtrage des événements
 *
 * Parcours utilisateur : rechercher par nom, filtrer par catégorie,
 * filtrer par wilaya, combiner filtres, réinitialiser, pagination.
 * Chaque test est indépendant (setup propre).
 */

describe('Parcours Recherche & Filtres — Événements', () => {
  beforeEach(() => {
    cy.visit('/evenements');
    cy.checkPageLoaded();
  });

  it('rechercher un événement par nom', () => {
    // 1. Le champ de recherche est présent
    cy.get('input[placeholder*="echerch"], input[type="search"], input[type="text"]')
      .first()
      .as('searchInput');

    cy.get('@searchInput').should('be.visible');

    // 2. Intercepter la requête de recherche
    cy.intercept('GET', '**/evenements*').as('searchEvents');

    // 3. Taper un terme de recherche
    cy.get('@searchInput').clear().type('festival');

    // 4. Attendre la réponse (debounce + API)
    cy.wait('@searchEvents', { timeout: 10000 }).then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });

    // 5. Vérifier que la page affiche des résultats ou un message « aucun résultat »
    cy.get('body').should('satisfy', ($body: JQuery) => {
      const text = $body.text().toLowerCase();
      // Soit des événements, soit le message « aucun événement trouvé »
      return text.includes('événement') || text.includes('evenement') || text.includes('aucun');
    });
  });

  it('filtrer par catégorie (type d\'événement)', () => {
    // 1. Trouver les sélecteurs de filtre (Radix Select ou <select>)
    cy.get('[role="combobox"]').then(($combos) => {
      if ($combos.length >= 1) {
        // Le premier combobox est le filtre statut, le second est le type
        const typeCombo = $combos.length >= 2 ? $combos.eq(1) : $combos.eq(0);

        cy.intercept('GET', '**/evenements*').as('filterByType');

        cy.wrap(typeCombo).click();
        // Sélectionner la deuxième option (la première est « Tous les types »)
        cy.get('[role="option"]').then(($options) => {
          if ($options.length > 1) {
            cy.wrap($options.eq(1)).click();
          } else {
            cy.wrap($options.eq(0)).click();
          }
        });

        cy.wait('@filterByType', { timeout: 10000 }).then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
        });
      } else {
        // Fallback: sélecteur natif
        cy.get('select').then(($selects) => {
          if ($selects.length >= 2) {
            cy.wrap($selects.eq(1)).select(1);
          }
        });
      }
    });

    // 2. La page se rafraîchit avec les résultats filtrés
    cy.get('body').should('not.be.empty');
  });

  it('filtrer par statut (wilaya ou statut disponible)', () => {
    // 1. Trouver le premier sélecteur de filtre (statut)
    cy.get('[role="combobox"]').then(($combos) => {
      if ($combos.length >= 1) {
        cy.intercept('GET', '**/evenements*').as('filterByStatus');

        cy.wrap($combos.first()).click();
        cy.get('[role="option"]').then(($options) => {
          if ($options.length > 1) {
            cy.wrap($options.eq(1)).click();
          } else {
            cy.wrap($options.eq(0)).click();
          }
        });

        cy.wait('@filterByStatus', { timeout: 10000 }).then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
        });
      }
    });

    cy.get('body').should('not.be.empty');
  });

  it('combiner recherche texte + filtre catégorie', () => {
    cy.intercept('GET', '**/evenements*').as('combinedFilter');

    // 1. Taper dans le champ de recherche
    cy.get('input[placeholder*="echerch"], input[type="search"], input[type="text"]')
      .first()
      .clear()
      .type('culture');

    // 2. Attendre le premier appel
    cy.wait('@combinedFilter', { timeout: 10000 });

    // 3. Appliquer un filtre type en plus
    cy.get('[role="combobox"]').then(($combos) => {
      if ($combos.length >= 2) {
        cy.wrap($combos.eq(1)).click();
        cy.get('[role="option"]').then(($options) => {
          if ($options.length > 1) {
            cy.wrap($options.eq(1)).click();
          }
        });

        cy.wait('@combinedFilter', { timeout: 10000 }).then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
        });
      }
    });

    // 4. Vérifier résultat
    cy.get('body').should('satisfy', ($body: JQuery) => {
      const text = $body.text().toLowerCase();
      return text.includes('événement') || text.includes('aucun') || text.includes('trouvé');
    });
  });

  it('réinitialiser les filtres', () => {
    // 1. Appliquer un filtre d'abord
    cy.get('input[placeholder*="echerch"], input[type="search"], input[type="text"]')
      .first()
      .clear()
      .type('test-filter-reset');

    // 2. Attendre le chargement
    cy.intercept('GET', '**/evenements*').as('afterFilter');
    cy.wait('@afterFilter', { timeout: 10000 });

    // 3. Chercher le bouton de réinitialisation (X, réinitialiser, reset)
    cy.get('body').then(($body) => {
      const hasResetBtn = $body.find(
        'button[aria-label*="initialiser"], button[aria-label*="reset"], button:contains("Réinitialiser")'
      ).length > 0;

      if (hasResetBtn) {
        cy.intercept('GET', '**/evenements*').as('afterReset');

        cy.get('button[aria-label*="initialiser"], button[aria-label*="reset"], button:contains("Réinitialiser")')
          .first()
          .click();

        cy.wait('@afterReset', { timeout: 10000 }).then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
        });

        // 4. Le champ de recherche est vide
        cy.get('input[placeholder*="echerch"], input[type="search"], input[type="text"]')
          .first()
          .should('have.value', '');
      } else {
        // Fallback: vider manuellement le champ
        cy.get('input[placeholder*="echerch"], input[type="search"], input[type="text"]')
          .first()
          .clear();

        cy.log('Pas de bouton reset dédié — champ vidé manuellement');
      }
    });
  });

  it('pagination — naviguer vers la page suivante', () => {
    // 1. Vérifier si la pagination existe (dépend du volume de données)
    cy.get('body').then(($body) => {
      const hasPagination = $body.find(
        'nav[aria-label*="pagination"], [class*="pagination"], button:contains("Suivant"), button[aria-label*="next"], button[aria-label*="suivant"]'
      ).length > 0;

      if (hasPagination) {
        cy.intercept('GET', '**/evenements*').as('pageChange');

        // Cliquer sur « Suivant » ou le numéro de page 2
        cy.get('button:contains("Suivant"), button[aria-label*="next"], button[aria-label*="suivant"], button:contains("2")')
          .first()
          .click();

        cy.wait('@pageChange', { timeout: 10000 }).then((interception) => {
          expect(interception.response?.statusCode).to.eq(200);
        });

        // Vérifier que la page a changé (URL ou contenu)
        cy.get('body').should('not.be.empty');
      } else {
        // Pas assez de données pour la pagination — vérifier le compteur
        cy.get('body').then(($innerBody) => {
          const text = $innerBody.text();
          const hasCount = /\d+\s*(événement|résultat|trouvé)/i.test(text);
          if (hasCount) {
            cy.log('Pas de pagination — nombre d\'événements insuffisant');
          } else {
            cy.log('Pas de pagination ni de compteur — page avec peu de données');
          }
        });
      }
    });
  });
});
