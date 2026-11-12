/**
 * Langues et types de patrimoine : une seule liste chacun (audit V11 COD-B2, B4, B10).
 * - Code langue inconnu sur une route de traduction : 400 (avant, il retombait sur « fr » et
 *   PATCH …/translation/xyz écrasait le texte français).
 * - Type de patrimoine faux en modification : 400 (avant, erreur MySQL → 500).
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../middlewares/cacheMiddleware', () => new Proxy({}, { get: () => () => (req, res, next) => next() }));
jest.mock('../../middlewares/rateLimitMiddleware', () => new Proxy({}, { get: () => (req, res, next) => next() }));
jest.mock('../../controllers/patrimoineController', () => ({
  // Chaque méthode répond avec son nom : on voit si la route a atteint le contrôleur
  wrap: (nom) => (req, res) => res.json({ success: true, methode: nom }),
}));
const mockOeuvreService = { updateTranslation: jest.fn() };
jest.mock('../../services/serviceContainer', () => ({
  get oeuvreService() { return mockOeuvreService; },
  _initialized: true,
}));

const langues = require('../../constants/langues');
const { validateLanguage, setLanguageCookie, normalizeLanguage, SUPPORTED_LANGUAGES } = require('../../middlewares/language');
const { TYPES_PATRIMOINE, LANGUES_AUDIO } = require('../../constants/patrimoineTypes');

const passer = (mw, req) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, cookie() {} };
  const next = jest.fn();
  mw(req, res, next);
  return { res, next };
};

describe('validateLanguage (audit V11 COD-B2)', () => {
  it.each([['fr', 'fr'], ['tz-ltn', 'tz-ltn'], ['tz-tfng', 'tz-tfng'], ['kab', 'tz-ltn'], ['AR-dz', 'ar']])(
    '%s est accepté et devient %s', (code, attendu) => {
      const req = { params: { lang: code } };
      const { next } = passer(validateLanguage, req);
      expect(next).toHaveBeenCalled();
      expect(req.targetLanguage).toBe(attendu);
      expect(req.params.lang).toBe(attendu);
    });

  it.each(['xyz', 'tmz', '', 'zz-zz'])('« %s » est refusé (400), sans retomber sur le français', (code) => {
    const req = { params: { lang: code } };
    const { res, next } = passer(validateLanguage, req);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect(req.targetLanguage).toBeUndefined();
  });

  it('la détection de langue garde le français par défaut pour un code inconnu', () => {
    expect(normalizeLanguage('xyz')).toBe('fr');
    expect(normalizeLanguage(undefined)).toBe('fr');
  });

  it('setLanguageCookie refuse aussi un code inconnu', () => {
    expect(passer(setLanguageCookie, { body: { lang: 'xyz' } }).res.statusCode).toBe(400);
    expect(passer(setLanguageCookie, { body: { lang: 'ar' } }).next).toHaveBeenCalled();
  });
});

describe('une seule liste de langues (audit V11 COD-B4)', () => {
  it('les modules exposent la même liste', () => {
    expect(SUPPORTED_LANGUAGES).toBe(langues.SUPPORTED_LANGUAGES);
    expect(require('../../utils/multiLangSearchBuilder').SUPPORTED_LANGUAGES).toBe(langues.SUPPORTED_LANGUAGES);
    expect(LANGUES_AUDIO).toBe(langues.SUPPORTED_LANGUAGES);
    expect(langues.SUPPORTED_LANGUAGES).toEqual(['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng']);
  });

  it('cheminJson cite les codes à tiret', () => {
    expect(langues.cheminJson('tz-ltn')).toBe('"tz-ltn"');
    expect(langues.cheminJson('fr')).toBe('fr');
  });
});

describe('traduction d\'une œuvre : code langue vérifié par la route', () => {
  const application = () => {
    const auth = new Proxy({}, { get: (_c, nom) => (nom === 'requireRole' ? () => (req, res, next) => next() : (req, res, next) => next()) });
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.t = (k) => k; req.lang = 'fr'; next(); });
    app.use('/oeuvres', require('../../routes/oeuvreRoutes')({}, auth));
    return app;
  };

  it('code inconnu (ou ancien « tmz ») : 400, rien n\'est écrit', async () => {
    for (const code of ['xyz', 'tmz']) {
      const rep = await request(application()).patch(`/oeuvres/3/translation/${code}`).send({ titre: 'x' });
      expect([code, rep.status]).toEqual([code, 400]);
    }
    expect(mockOeuvreService.updateTranslation).not.toHaveBeenCalled();
  });

  it('tamazight latin : la traduction est écrite sous « tz-ltn »', async () => {
    mockOeuvreService.updateTranslation.mockResolvedValue({ id_oeuvre: 3, titre: { fr: 'a' } });
    await request(application()).patch('/oeuvres/3/translation/kab').send({ titre: 'x' });
    expect(mockOeuvreService.updateTranslation).toHaveBeenCalledWith(3, 'tz-ltn', { titre: 'x' });
  });
});

describe('types de patrimoine (audit V11 COD-B10)', () => {
  const application = () => {
    const passe = (req, res, next) => { req.user = { id_user: 75, isAdmin: true }; next(); };
    const auth = new Proxy({}, { get: (_c, nom) => (nom === 'requireRole' ? () => passe : passe) });
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.t = (k) => k; next(); });
    app.use('/patrimoine', require('../../routes/patrimoineRoutes')({}, auth));
    return app;
  };

  it('le modèle Lieu utilise la liste commune, dans l\'ordre de l\'ENUM', () => {
    const { Sequelize } = require('sequelize');
    const Lieu = require('../../models/places/lieu')(new Sequelize({ dialect: 'mysql', logging: false }));
    expect(Lieu.rawAttributes.typePatrimoine.values).toEqual([...TYPES_PATRIMOINE]);
  });

  it('création ou modification avec un type faux : 400', async () => {
    const app = application();
    const creation = await request(app).post('/patrimoine').send({ nom: { fr: 'Site' }, typePatrimoine: 'chateau' });
    expect(creation.status).toBe(400);
    const modification = await request(app).put('/patrimoine/4').send({ typePatrimoine: 'chateau' });
    expect(modification.status).toBe(400);
  });

  it('modification avec un type connu ou sans type : atteint le contrôleur', async () => {
    const app = application();
    for (const corps of [{ typePatrimoine: 'palais_forteresse' }, { typePatrimoine: '' }, { nom: { fr: 'Site' } }]) {
      const rep = await request(app).put('/patrimoine/4').send(corps);
      expect([corps, rep.status, rep.body.methode]).toEqual([corps, 200, 'update']);
    }
  });
});
