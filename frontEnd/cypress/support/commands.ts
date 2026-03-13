/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): Chainable<void>;
    loginAsAdmin(): Chainable<void>;
    loginAsPro(): Chainable<void>;
    loginAsVisitor(): Chainable<void>;
    logout(): Chainable<void>;
    apiLogin(email: string, password: string): Chainable<void>;
    getByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
    shouldBeOnPage(path: string): Chainable<void>;
    checkPageLoaded(): Chainable<void>;
    fillMultiLangField(fieldPrefix: string, values: Record<string, string>): Chainable<void>;
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth');
  cy.get('input[name="email"], input[type="email"]').first().clear().type(email);
  cy.get('input[name="mot_de_passe"], input[name="password"], input[type="password"]').first().clear().type(password);
  cy.get('button[type="submit"]').first().click();
  cy.url().should('not.include', '/auth', { timeout: 15000 });
});

Cypress.Commands.add('loginAsAdmin', () => {
  cy.login(Cypress.env('adminEmail'), Cypress.env('adminPassword'));
});

Cypress.Commands.add('loginAsPro', () => {
  cy.login(Cypress.env('proEmail'), Cypress.env('proPassword'));
});

Cypress.Commands.add('loginAsVisitor', () => {
  cy.login(Cypress.env('visitorEmail'), Cypress.env('visitorPassword'));
});

Cypress.Commands.add('logout', () => {
  cy.request({ method: 'POST', url: `${Cypress.env('apiUrl')}/users/logout`, failOnStatusCode: false });
  cy.clearCookies();
  cy.clearLocalStorage();
});

Cypress.Commands.add('apiLogin', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/users/login`,
    body: { email, mot_de_passe: password },
  }).then((resp) => {
    expect(resp.status).to.eq(200);
  });
});

Cypress.Commands.add('getByTestId', (testId: string) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('shouldBeOnPage', (path: string) => {
  cy.url().should('include', path);
});

Cypress.Commands.add('checkPageLoaded', () => {
  cy.get('.animate-spin', { timeout: 15000 }).should('not.exist');
});

Cypress.Commands.add('fillMultiLangField', (fieldPrefix: string, values: Record<string, string>) => {
  Object.entries(values).forEach(([lang, value]) => {
    cy.get(`[name="${fieldPrefix}.${lang}"], [name="${fieldPrefix}_${lang}"]`)
      .first()
      .clear()
      .type(value);
  });
});
