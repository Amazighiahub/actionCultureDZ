import './commands';

Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver') || err.message.includes('Script error')) {
    return false;
  }
});

beforeEach(() => {
  cy.intercept('GET', '**/api/stats/public').as('publicStats');
  cy.intercept('GET', '**/api/languages').as('languages');
});
