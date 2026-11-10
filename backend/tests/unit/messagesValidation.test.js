/**
 * Messages de validation des routes : traduits dans la langue de la personne (audit V11 FRM-5).
 * Garde-fou : plus de texte français écrit en dur dans withMessage, et chaque clé existe en fr, ar, en.
 */
const fs = require('fs');
const path = require('path');
const { msg } = require('../../utils/messageValidation');
const { createT } = require('../../helpers/messages');

const dossierRoutes = path.join(__dirname, '../../routes');
const routes = fs.readdirSync(dossierRoutes).filter((f) => f.endsWith('.js'))
  .map((f) => ({ nom: f, source: fs.readFileSync(path.join(dossierRoutes, f), 'utf8') }));
const langues = Object.fromEntries(['fr', 'ar', 'en'].map((l) => [l, require(`../../i18n/messages/${l}.json`)]));
const lire = (objet, cle) => cle.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), objet);

describe('messages de validation traduits', () => {
  it('choisit la langue de la requête, le français sinon', () => {
    const message = msg('validation.messageContact');
    expect(message('x', { req: { t: createT('ar') } })).toBe('اكتب رسالة من 10 إلى 2000 حرف');
    expect(message('x', { req: { t: createT('en') } })).toBe('Write a message of 10 to 2,000 characters');
    expect(message('x', {})).toBe('Écrivez un message de 10 à 2 000 caractères');
    // Tamazight : pas encore traduit, le français est donné
    expect(message('x', { req: { t: createT('tz-ltn') } })).toBe('Écrivez un message de 10 à 2 000 caractères');
  });

  it('aucune route n’écrit de texte en dur dans withMessage', () => {
    const enDur = routes.flatMap(({ nom, source }) =>
      [...source.matchAll(/withMessage\('([^']*)'\)/g)].map((m) => `${nom} : ${m[1]}`));
    expect(enDur).toEqual([]);
  });

  it('chaque clé utilisée existe en français, en arabe et en anglais', () => {
    const cles = new Set(routes.flatMap(({ source }) => [...source.matchAll(/msg\('([^']+)'\)/g)].map((m) => m[1])));
    expect(cles.size).toBeGreaterThan(50);
    const manquantes = [];
    for (const cle of cles) {
      for (const [l, d] of Object.entries(langues)) if (typeof lire(d, cle) !== 'string') manquantes.push(`${l} : ${cle}`);
    }
    expect(manquantes).toEqual([]);
  });
});
