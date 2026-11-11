/**
 * Journal d'audit et configuration des droits : ouverts aux administrateurs (audit V11 COD-B1, choix de la
 * responsable). Avant, ces routes demandaient un rôle « Super Admin » qui n'existe pas : fermées à tous.
 */
const express = require('express');
const request = require('supertest');

let mockUtilisateur = null;
jest.mock('../../middlewares/authMiddleware', () => () => {
  const actuel = () => mockUtilisateur;
  return new Proxy({}, {
    get: (_cible, nom) => {
      if (nom === 'authenticate') return (req, res, next) => { req.user = actuel(); return req.user ? next() : res.status(401).json({}); };
      if (nom === 'requireAdmin') return (req, res, next) => (req.user?.isAdmin ? next() : res.status(403).json({ success: false }));
      if (nom === 'requireRole') return () => (req, res) => res.status(403).json({ success: false, role: true });
      return (req, res, next) => next();
    },
  });
});
jest.mock('../../middlewares/cacheMiddleware', () => ({ conditionalCache: () => (req, res, next) => next(), invalidateCache: () => (req, res, next) => next() }));
jest.mock('../../middlewares/auditMiddleware', () => ({ logAction: () => (req, res, next) => next() }));
jest.mock('../../controllers/dashboardController', () => {
  // Chaque méthode répond avec son nom : on voit quelle fonction la route a atteinte
  const methode = (nom) => (req, res) => res.json({ success: true, methode: nom });
  return new Proxy({}, { get: (c, n) => (typeof n === 'string' ? methode(n) : undefined) });
});
jest.mock('../../middlewares/rateLimitMiddleware', () => new Proxy({}, { get: () => (req, res, next) => next() }));

const application = () => {
  const app = express();
  app.use((req, res, next) => { req.t = (k) => k; next(); });
  app.use('/dashboard', require('../../routes/dashboardRoutes')({}));
  return app;
};

describe('journal d\'audit ouvert aux administrateurs (audit V11 COD-B1)', () => {
  it('administrateur : accès au journal, au journal d\'un compte et à la configuration des droits', async () => {
    mockUtilisateur = { id_user: 75, isAdmin: true };
    const app = application();
    expect((await request(app).get('/dashboard/audit/logs')).status).toBe(200);
    expect((await request(app).get('/dashboard/audit/user/12')).status).toBe(200);
    expect((await request(app).get('/dashboard/config/permissions')).status).toBe(200);
  });

  it('professionnel ou visiteur : toujours refusé', async () => {
    mockUtilisateur = { id_user: 3, isAdmin: false };
    const app = application();
    for (const adresse of ['/dashboard/audit/logs', '/dashboard/audit/user/12', '/dashboard/config/permissions']) {
      expect([adresse, (await request(app).get(adresse)).status]).toEqual([adresse, 403]);
    }
  });

  it('recherche et export des comptes atteignent leur fonction (avant : pris pour /users/:id)', async () => {
    mockUtilisateur = { id_user: 75, isAdmin: true };
    const app = application();
    expect((await request(app).get('/dashboard/users/search?q=amel')).body.methode).toBe('searchUsers');
    expect((await request(app).get('/dashboard/users/export')).body.methode).toBe('exportUsers');
    expect((await request(app).get('/dashboard/users/12')).body.methode).toBe('getUserDetails');
  });
});
