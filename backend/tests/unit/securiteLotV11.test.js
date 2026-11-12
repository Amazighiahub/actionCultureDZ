/**
 * Lot sécurité de l'audit V11 : rôles comparés sans accent (B7), propriétaire comparé en nombre (B8),
 * erreurs 5xx imprévues masquées en production (texte prévu d'une AppError gardé).
 */
jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));
const { aUnDesRoles, normaliserRole, estRole } = require('../../constants/roles');
const AppError = require('../../utils/appError');

describe('rôles (B7)', () => {
  it('« Moderateur » et « Modérateur » sont le même rôle, dans les deux sens', () => {
    expect(aUnDesRoles(['Moderateur'], ['Modérateur', 'Administrateur'])).toBe(true);
    expect(aUnDesRoles(['Modérateur'], ['Admin', 'Moderateur'])).toBe(true);
    expect(estRole('MODÉRATEUR', 'moderateur')).toBe(true);
    expect(normaliserRole(' Modérateur ')).toBe('moderateur');
  });

  it('noms courts de route acceptés ; rien d’autre ne passe', () => {
    expect(aUnDesRoles(['Administrateur'], ['Admin'])).toBe(true);
    expect(aUnDesRoles(['Professionnel'], ['Pro'])).toBe(true);
    // Comme avant : un rôle nommé exactement « Admin » en base passe une route « Admin »
    expect(aUnDesRoles(['Admin'], ['Admin'])).toBe(true);
    expect(aUnDesRoles(['User'], ['Admin', 'Moderateur'])).toBe(false);
    expect(aUnDesRoles(['Contributeur'], ['Modérateur', 'Administrateur'])).toBe(false);
    expect(aUnDesRoles(undefined, ['Admin'])).toBe(false);
  });

  it('requireRole : un modérateur enregistré « Moderateur » passe une route « Modérateur »', () => {
    jest.isolateModules(() => {
      const creer = require('../../middlewares/authMiddleware');
      const mw = (typeof creer === 'function' ? creer({}) : creer).requireRole(['Modérateur', 'Administrateur']);
      const next = jest.fn();
      const res = { status: jest.fn(() => res), json: jest.fn() };
      mw({ user: { id_user: 3, isAdmin: false }, userRoles: ['Moderateur'], t: (k) => k }, res, next);
      expect(next).toHaveBeenCalled();

      const refus = jest.fn();
      const res2 = { status: jest.fn(() => res2), json: refus };
      mw({ user: { id_user: 4, isAdmin: false }, userRoles: ['User'], t: (k) => k }, res2, jest.fn());
      expect(res2.status).toHaveBeenCalledWith(403);
      // Refus lisible sous « error » (B23), et encore sous « message »
      expect(refus.mock.calls[0][0]).toMatchObject({ success: false, error: 'auth.roleRequired', message: 'auth.roleRequired' });
    });
  });
});

describe('propriétaire comparé en nombre (B8)', () => {
  it('parcours : l’auteur passe avec un identifiant en texte, un autre compte est refusé', async () => {
    jest.resetModules();
    const ParcoursService = require('../../services/parcours/parcoursService');
    const s = Object.create(ParcoursService.prototype);
    const parcours = { id_createur: 12, update: jest.fn() };
    s.repository = { findById: jest.fn().mockResolvedValue(parcours), update: jest.fn().mockResolvedValue(parcours), findByPk: jest.fn().mockResolvedValue(parcours) };
    s.models = {};
    const appeler = (userId) => s.update(1, { nom: 'x' }, userId, false);
    if (typeof s.update !== 'function') return;
    await expect(appeler(13)).rejects.toMatchObject({ statusCode: 403 });
    const ok = await appeler('12').then(() => true, (e) => e.statusCode !== 403);
    expect(ok).toBe(true);
  });
});

describe('erreurs 5xx en production', () => {
  const ancien = process.env.NODE_ENV;
  afterAll(() => { process.env.NODE_ENV = ancien; jest.resetModules(); });

  it('une 503 imprévue est masquée ; le texte prévu d’une AppError reste', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const BaseController = require('../../controllers/baseController');
    const AppErr = require('../../utils/appError');
    const c = new BaseController();
    const reponse = () => { const res = { req: { method: 'GET', originalUrl: '/x' } }; res.status = jest.fn(() => res); res.json = jest.fn(() => res); return res; };

    let res = reponse();
    c._handleError(res, Object.assign(new Error('connect ECONNREFUSED 10.0.0.3:3306'), { statusCode: 503, code: 'ECONNREFUSED' }));
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Erreur serveur', code: 'INTERNAL_ERROR' });

    res = reponse();
    c._handleError(res, new AppErr('La recherche d’adresse est momentanément indisponible.', 503, 'GEOCODAGE_INDISPONIBLE'));
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'La recherche d’adresse est momentanément indisponible.', code: 'GEOCODAGE_INDISPONIBLE' });
    expect(AppError).toBeDefined();
  });
});

describe('AppError 500 emballée par un service (relecture du lot)', () => {
  const ancien = process.env.NODE_ENV;
  afterAll(() => { process.env.NODE_ENV = ancien; jest.resetModules(); });

  it('production : texte brut masqué, par le contrôleur comme par le gestionnaire commun', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const BaseController = require('../../controllers/baseController');
    const errorMiddleware = require('../../middlewares/errorMiddleware');
    const AppErr = require('../../utils/appError');
    const emballee = () => AppErr.fromError(new Error("Unknown column 'Evenement.xxx' in 'field list'"));
    const reponse = () => { const res = { req: { method: 'GET', originalUrl: '/x' } }; res.status = jest.fn(() => res); res.json = jest.fn(() => res); return res; };

    let res = reponse();
    new BaseController()._handleError(res, emballee());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Erreur serveur', code: 'INTERNAL_ERROR' });

    res = reponse();
    errorMiddleware.errorHandler(emballee(), res.req, res, jest.fn());
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Erreur serveur', code: 'INTERNAL_ERROR' });

    // Refus prévu (4xx) : son texte reste
    res = reponse();
    errorMiddleware.errorHandler(AppErr.badRequest('Date invalide'), res.req, res, jest.fn());
    expect(res.json.mock.calls[0][0]).toMatchObject({ error: 'Date invalide' });
  });
});

describe('œuvres : propriétaire comparé en nombre ; favoris de patrimoine en type « lieu »', () => {
  it('modifier son œuvre avec un identifiant en texte : pas de refus « propriétaire »', async () => {
    jest.resetModules();
    const OeuvreService = require('../../services/oeuvre/oeuvreService');
    const s = Object.create(OeuvreService.prototype);
    s.repository = { findById: jest.fn().mockResolvedValue({ id_oeuvre: 1, saisi_par: 12, statut: 'brouillon' }) };
    await expect(s.submitForValidation(1, 13)).rejects.toMatchObject({ statusCode: 403 });
    // L'auteur (« 12 » en texte) passe le contrôle de propriétaire : l'erreur éventuelle vient d'ailleurs
    const resultat = await s.submitForValidation(1, '12').then(() => 'ok', (e) => e.statusCode);
    expect(resultat).not.toBe(403);
  });

  it('ajouter un site patrimonial en favori enregistre le type « lieu » (seul accepté par la base)', async () => {
    jest.resetModules();
    const PatrimoineService = require('../../services/patrimoine/patrimoineService');
    const s = Object.create(PatrimoineService.prototype);
    const findOrCreate = jest.fn().mockResolvedValue([{}, true]);
    s.models = { Favori: { findOrCreate, destroy: jest.fn().mockResolvedValue(1) } };
    await s.ajouterFavoris(5, 9);
    expect(findOrCreate.mock.calls[0][0].where).toMatchObject({ type_entite: 'lieu', id_entite: 5 });
  });
});
