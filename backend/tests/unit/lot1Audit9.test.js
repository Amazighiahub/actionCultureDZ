/**
 * Audit V9, lot 1 : mot de passe oublié (Gmail avec point), effacement de fichier par la photo de
 * profil, erreurs gardées en cache, service retiré à chaque modification, suppression d'un compte.
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../controllers/emailVerificationController', () => ({
  requestPasswordReset: jest.fn((req, res) => res.json({ email: req.body.email })),
  requestEmailChange: jest.fn((req, res) => res.json({ newEmail: req.body.newEmail })),
}));
jest.mock('../../middlewares/rateLimitMiddleware', () => {
  const passe = (req, res, next) => next();
  return new Proxy({}, {
    get: (_, cle) => (cle === 'endpointLimiters'
      ? new Proxy({}, { get: () => passe })
      : passe),
  });
});
jest.mock('../../services/cloudinaryService', () => ({
  isCloudinaryUrl: jest.fn(() => true),
  extractPublicId: jest.fn(() => 'dossier/fichier'),
  deleteAsset: jest.fn(async () => true),
  getResourceType: jest.fn(() => 'image'),
}));
const mockCancel = jest.fn(async () => true);
jest.mock('../../services/serviceContainer', () => ({ evenementService: { cancel: mockCancel } }));

const cloudinary = require('../../services/cloudinaryService');
const controller = require('../../controllers/emailVerificationController');
const { publicHttpCache } = require('../../middlewares/cacheMiddleware');
const UploadService = require('../../services/upload/uploadService');
const { isReferencedElsewhere } = require('../../services/user/userFileCleanup');
const { annulerEvenementsAVenir } = require('../../services/user/evenementsAVenir');

beforeEach(() => jest.clearAllMocks());

describe('mot de passe oublié', () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.t = k => k; next(); });
  app.use(require('../../routes/emailVerificationRoutes')({}, new Proxy({}, { get: () => (req, res, next) => next() })));

  it('garde les points d’une adresse Gmail', async () => {
    const res = await request(app).post('/request-password-reset').send({ email: ' Prenom.Nom@gmail.com ' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('prenom.nom@gmail.com');
    expect(controller.requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('refuse toujours une adresse invalide', async () => {
    const res = await request(app).post('/request-password-reset').send({ email: 'pas-une-adresse' });
    expect(res.status).toBe(400);
    expect(controller.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe('cache navigateur des listes publiques', () => {
  const app = express();
  app.get('/ok', publicHttpCache(180), (req, res) => res.json({ ok: true }));
  app.get('/absent', publicHttpCache(180), (req, res) => res.status(404).json({ ok: false }));
  app.get('/panne', publicHttpCache(180), (req, res) => res.status(500).send('panne'));

  it('garde une réponse normale', async () => {
    const res = await request(app).get('/ok');
    expect(res.headers['cache-control']).toContain('max-age=180');
  });

  it.each(['/absent', '/panne'])('ne garde pas l’erreur de %s', async (url) => {
    const res = await request(app).get(url);
    expect(res.headers['cache-control']).toBe('no-store');
  });
});

describe('ancienne photo de profil', () => {
  const VICTIME = 'https://res.cloudinary.com/demo/image/upload/affiche.jpg';
  const NOUVELLE = { path: 'https://res.cloudinary.com/demo/image/upload/nouvelle.jpg', mimetype: 'image/jpeg', size: 10, filename: 'n', originalname: 'n.jpg' };

  const service = ({ medias = [], evenements = 0, utilisateurs = 0 }) => {
    const svc = Object.create(UploadService.prototype);
    svc.baseUrl = '';
    const compter = n => ({ count: jest.fn(async () => n) });
    svc.models = {
      User: {
        findByPk: jest.fn(async () => ({ photo_url: VICTIME, update: jest.fn() })),
        unscoped: () => compter(utilisateurs),
      },
      Media: { findAll: jest.fn(async () => medias), create: jest.fn(async () => ({})) },
      Evenement: compter(evenements),
    };
    return svc;
  };

  it('n’efface pas le fichier d’un autre compte', async () => {
    await service({ medias: [{ metadata: { uploadedBy: 99 } }] }).updateProfilePhoto(7, NOUVELLE);
    expect(cloudinary.deleteAsset).not.toHaveBeenCalled();
  });

  it('n’efface pas un fichier inconnu (image de lieu, ancienne affiche…)', async () => {
    await service({ medias: [] }).updateProfilePhoto(7, NOUVELLE);
    expect(cloudinary.deleteAsset).not.toHaveBeenCalled();
  });

  it('n’efface pas sa propre image si un événement l’utilise', async () => {
    await service({ medias: [{ metadata: { uploadedBy: 7 } }], evenements: 1 }).updateProfilePhoto(7, NOUVELLE);
    expect(cloudinary.deleteAsset).not.toHaveBeenCalled();
  });

  it('efface sa propre ancienne photo inutilisée', async () => {
    await service({ medias: [{ metadata: { uploadedBy: 7 } }] }).updateProfilePhoto(7, NOUVELLE);
    expect(cloudinary.deleteAsset).toHaveBeenCalledWith('dossier/fichier', 'image');
  });

  it('compte aussi l’image d’un événement et le logo d’une organisation', async () => {
    const zero = { count: jest.fn(async () => 0) };
    expect(await isReferencedElsewhere({ Evenement: { count: jest.fn(async () => 1) } }, VICTIME)).toBe(true);
    expect(await isReferencedElsewhere({ Organisation: { count: jest.fn(async () => 1) } }, VICTIME)).toBe(true);
    expect(await isReferencedElsewhere({ Evenement: zero, Organisation: zero }, VICTIME)).toBe(false);
  });
});

describe('service modifié par son propriétaire', () => {
  const ServiceService = require('../../services/service/serviceService');
  const EXISTANT = {
    id: 43, id_user: 7, statut: 'valide',
    nom: { fr: 'Gîte', ar: '' }, description: { fr: 'Texte' }, adresse: { fr: 'Rue' },
    telephone: '0550000000', email: null, site_web: null, photo_url: null,
    id_lieu: 5, type_service: 'hebergement', latitude: '36.70000000', longitude: null, horaires: { lundi: '9h' },
  };
  const modifier = async (donnees) => {
    const repository = { findById: jest.fn(async () => EXISTANT), findWithFullDetails: jest.fn(async () => EXISTANT), update: jest.fn(async () => [1]) };
    const service = new ServiceService(repository, {});
    await service.update(43, donnees, 7);
    return repository.update.mock.calls[0][1];
  };
  const FORMULAIRE = {
    nom: { fr: 'Gîte' }, description: { fr: 'Texte' }, type_service: 'hebergement', id_lieu: 5,
    latitude: 36.7, longitude: null, adresse: { fr: 'Rue' }, telephone: '0550000000', email: '', site_web: '',
  };

  it('reste publié si seul l’horaire change', async () => {
    const maj = await modifier({ ...FORMULAIRE, horaires: { lundi: '10h' } });
    expect(maj.statut).toBeUndefined();
  });

  it('repasse en modération si le nom change', async () => {
    const maj = await modifier({ ...FORMULAIRE, nom: { fr: 'Autre nom' } });
    expect(maj.statut).toBe('en_attente');
  });

  it('repasse en modération si le service est déplacé', async () => {
    const maj = await modifier({ ...FORMULAIRE, latitude: 35.1 });
    expect(maj.statut).toBe('en_attente');
  });
});

describe('suppression d’un compte par l’administration', () => {
  it('annule ses événements à venir pour prévenir les inscrits', async () => {
    const models = { Evenement: { findAll: jest.fn(async () => [{ id_evenement: 3 }, { id_evenement: 4 }]) } };
    await annulerEvenementsAVenir(models, 12, 8);
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockCancel).toHaveBeenCalledWith(3, 8, expect.any(String), { isAdmin: true });
  });

  it('n’annule rien s’il n’y en a pas', async () => {
    await annulerEvenementsAVenir({ Evenement: { findAll: jest.fn(async () => []) } }, 12, 8);
    expect(mockCancel).not.toHaveBeenCalled();
  });
});
