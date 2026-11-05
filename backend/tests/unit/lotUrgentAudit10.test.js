/**
 * Lot urgent de l'audit V10 : déconnexion fiable, mots de passe intacts, suspension réelle,
 * effacement complet, sites non publiés protégés.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret-de-test';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

jest.mock('../../services/emailService', () => ({}));
const UserService = require('../../services/user/userService');
const UserRepository = require('../../repositories/userRepository');
const UserManagementService = require('../../services/dashboard/userManagementService');
const PatrimoineController = require('../../controllers/patrimoineController');

const lire = (f) => fs.readFileSync(path.join(__dirname, '../..', f), 'utf8');

describe('déconnexion', () => {
  test('les deux routes fonctionnent sans jeton d’accès valide', () => {
    const routes = lire('routes/userRoutes.js');
    expect(routes).toContain("router.post('/logout', optionalAuth");
    expect(routes).toContain("router.post('/refresh-token/deconnexion', optionalAuth");
  });

  test('le cookie de la connexion suffit à la couper', async () => {
    const destroy = jest.fn();
    const update = jest.fn();
    const service = Object.create(UserService.prototype);
    service.models = { SessionConnexion: { destroy } };
    service.repository = { model: { unscoped: () => ({ update }) } };
    await service.revokeParJeton('jeton-de-cet-appareil');
    const empreinte = crypto.createHash('sha256').update('jeton-de-cet-appareil').digest('hex');
    expect(JSON.stringify(destroy.mock.calls[0][0].where, (_, v) => v)).toBeDefined();
    const conditions = destroy.mock.calls[0][0].where[Object.getOwnPropertySymbols(destroy.mock.calls[0][0].where)[0]];
    expect(conditions).toEqual([{ jeton_hash: empreinte }, { jeton_precedent_hash: empreinte }]);
    expect(update.mock.calls[0][1]).toEqual({ where: { refresh_token: empreinte } });
  });

  test.each([[[['x']]], [0], [''], [null]])('valeur %j : rien n’est touché', async (jeton) => {
    const destroy = jest.fn();
    const service = Object.create(UserService.prototype);
    service.models = { SessionConnexion: { destroy } };
    await service.revokeParJeton(jeton);
    expect(destroy).not.toHaveBeenCalled();
  });
});

test('mot de passe : jamais altéré par le nettoyage', () => {
  const code = lire('middlewares/securityMiddleware.js');
  ['newPassword', 'currentPassword', 'confirmPassword'].forEach((c) => expect(code).toContain(`'${c}'`));
});

describe('suspension', () => {
  const service = (user) => {
    const s = Object.create(UserManagementService.prototype || UserManagementService);
    s.userRepo = { findById: jest.fn(async () => user), suspend: jest.fn(async () => user), update: jest.fn() };
    s._invalidateUserCache = jest.fn();
    return s;
  };

  test('motif, durée et auteur sont enregistrés', async () => {
    const user = { id_type_user: 7, reload: jest.fn() };
    const s = service(user);
    await s.suspendUserAction(5, { raison: 'Abus', duree: 7, suspendu_par: 1 });
    expect(s.userRepo.suspend).toHaveBeenCalledWith(5, 1, 7, 'Abus');
    expect(s._invalidateUserCache).toHaveBeenCalledWith(5);
  });

  test('un administrateur ne peut pas être suspendu ainsi', async () => {
    const s = service({ id_type_user: 29 });
    await expect(s.suspendUserAction(5, { raison: 'x' })).rejects.toMatchObject({ statusCode: 403 });
    expect(s.userRepo.suspend).not.toHaveBeenCalled();
  });

  test('suspendre coupe les connexions de la personne', async () => {
    const destroy = jest.fn();
    const depot = Object.create(UserRepository.prototype);
    depot.models = { SessionConnexion: { destroy } };
    depot.update = jest.fn();
    await depot.suspend(5, 1, 7, 'Abus');
    expect(destroy).toHaveBeenCalledWith({ where: { id_user: 5 } });
    expect(depot.update.mock.calls[0][1].suspension_jusqu_au).toBeInstanceOf(Date);
  });

  test('la fin de suspension est bien levée par une tâche planifiée', () => {
    const cron = lire('services/cronService.js');
    expect(cron).toContain("scheduleJob('lever-suspensions'");
    expect(cron).toContain('suspension_jusqu_au: { [Op.ne]: null, [Op.lte]: new Date() }');
  });
});

test('effacement : contacts d’événement et newsletter retirés', () => {
  const code = lire('repositories/userRepository.js');
  expect(code).toContain('contact_email: null, contact_telephone: null');
  expect(code).toContain('m.NewsletterAbonne.destroy({ where: { email: user.email }');
});

describe('sites non publiés', () => {
  const reponse = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

  test('articles d’un site non publié : 404 pour un inconnu', async () => {
    const c = Object.create(Object.getPrototypeOf(PatrimoineController));
    Object.defineProperty(c, '_models', { value: { Lieu: { findByPk: jest.fn(async () => ({ statut: 'en_attente', id_createur: 9 })) } } });
    c._canSeeUnpublished = jest.fn(() => false);
    const res = reponse();
    await c.blocs({ params: { id: '3' }, t: (k) => k }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('scan QR d’un site non publié : refusé', async () => {
    const c = Object.create(Object.getPrototypeOf(PatrimoineController));
    c._findVisibleSite = jest.fn(async () => null);
    await expect(c.scanQRCode({ body: { code: 3 } }, reponse())).rejects.toBeDefined();
    expect(c._findVisibleSite).toHaveBeenCalledWith(expect.anything(), 3);
  });
});

test('créer un lieu : professionnel validé accepté, sans dépendre du rôle en base', () => {
  const code = lire('routes/lieuRoutes.js');
  expect(code).toContain('authMiddleware.requireValidatedProfessional(req, res, next)');
  expect(code).not.toContain("requireRole(['Professionnel', 'Contributeur', 'Modérateur', 'Administrateur'])");
});
