/**
 * Brouillons / contenus non publiés : invisibles pour le public,
 * visibles par l'auteur et la modération.
 */
const request = require('supertest');
const express = require('express');

jest.mock('../../utils/redisClient', () => ({
  getRedisClient: jest.fn().mockResolvedValue(null),
  getClient: jest.fn().mockReturnValue(null),
  isReady: jest.fn().mockReturnValue(false)
}));

const mockOeuvreService = { findWithFullDetails: jest.fn() };
const mockEvenementService = { findWithFullDetails: jest.fn() };

jest.mock('../../services/serviceContainer', () => ({
  get oeuvreService() { return mockOeuvreService; },
  get evenementService() { return mockEvenementService; },
  _initialized: true
}));

const oeuvreController = require('../../controllers/oeuvreController');
const evenementController = require('../../controllers/evenementController');

const dto = (raw) => ({
  _raw: raw,
  toDetailJSON: () => raw,
  toJSON: () => raw
});

// Simule optionalAuth : l'utilisateur est passé par l'en-tête de test x-user
const buildApp = () => {
  const app = express();
  app.use((req, res, next) => {
    req.t = (k) => k;
    req.lang = 'fr';
    if (req.headers['x-user']) req.user = JSON.parse(req.headers['x-user']);
    next();
  });
  app.get('/oeuvres/:id', (req, res) => oeuvreController.getById(req, res));
  app.get('/evenements/:id', (req, res) => evenementController.getById(req, res));
  return app;
};

const OWNER = JSON.stringify({ id_user: 7 });
const OTHER = JSON.stringify({ id_user: 8 });
const MODO = JSON.stringify({ id_user: 2, isModerateur: true });

describe('Œuvre non publiée', () => {
  beforeEach(() => mockOeuvreService.findWithFullDetails.mockResolvedValue(
    dto({ id_oeuvre: 1, statut: 'brouillon', saisi_par: 7, titre: { fr: 'x' } })
  ));

  it('anonyme : 404', async () => {
    await request(buildApp()).get('/oeuvres/1').expect(404);
  });
  it('autre utilisateur : 404', async () => {
    await request(buildApp()).get('/oeuvres/1').set('x-user', OTHER).expect(404);
  });
  it('auteur : 200', async () => {
    await request(buildApp()).get('/oeuvres/1').set('x-user', OWNER).expect(200);
  });
  it('modérateur : 200', async () => {
    await request(buildApp()).get('/oeuvres/1').set('x-user', MODO).expect(200);
  });
  it('œuvre publiée : 200 pour tous', async () => {
    mockOeuvreService.findWithFullDetails.mockResolvedValue(dto({ id_oeuvre: 1, statut: 'publie', saisi_par: 7 }));
    await request(buildApp()).get('/oeuvres/1').expect(200);
  });
});

describe('Événement brouillon', () => {
  beforeEach(() => mockEvenementService.findWithFullDetails.mockResolvedValue(
    dto({ id_evenement: 3, statut: 'brouillon', id_user: 7 })
  ));

  it('anonyme : 404', async () => {
    await request(buildApp()).get('/evenements/3').expect(404);
  });
  it('organisateur : 200', async () => {
    await request(buildApp()).get('/evenements/3').set('x-user', OWNER).expect(200);
  });
  it('événement annulé reste visible (information des inscrits)', async () => {
    mockEvenementService.findWithFullDetails.mockResolvedValue(dto({ id_evenement: 3, statut: 'annule', id_user: 7 }));
    await request(buildApp()).get('/evenements/3').expect(200);
  });
});
