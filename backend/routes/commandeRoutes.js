/**
 * Commandes de livres, d'œuvres d'art et d'artisanat : l'acheteur paie directement le professionnel,
 * Tala DZ n'encaisse rien. Voir services/commandes.js.
 */
const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { validateId } = require('../middlewares/validationMiddleware');
const { commandeLimiter, commandeEtapeLimiter } = require('../middlewares/rateLimitMiddleware');
const commandes = require('../services/commandes');

const repondreErreur = (res, err) => {
  if (!err.statusCode || err.statusCode >= 500) throw err;
  res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
};
const par = (req) => ({ id: req.user.id_user, isAdmin: !!req.user.isAdmin });
const notifications = () => require('../services/serviceContainer').notificationService;

module.exports = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireVerifiedEmail } = authMiddleware;

  // Public : l'œuvre se commande-t-elle, à quel prix, avec quelle livraison (rien de privé)
  router.get('/oeuvres/:id/offre', validateId(), asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: await commandes.offrePublique(models, Number(req.params.id)) });
  }));

  router.post('/', authenticate, requireVerifiedEmail, commandeLimiter, asyncHandler(async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await commandes.commander(models, notifications(), req.user.id_user, req.body || {}) });
    } catch (err) { repondreErreur(res, err); }
  }));

  router.get('/mes-achats', authenticate, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await commandes.liste(models, req.user.id_user, 'achats') });
  }));

  router.get('/mes-ventes', authenticate, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await commandes.liste(models, req.user.id_user, 'ventes') });
  }));

  router.get('/mes-ventes/a-traiter', authenticate, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: { total: await commandes.ventesATraiter(models, req.user.id_user) } });
  }));

  router.get('/:id', authenticate, validateId(), asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      res.json({ success: true, data: await commandes.detail(models, Number(req.params.id), par(req)) });
    } catch (err) { repondreErreur(res, err); }
  }));

  // Étapes : paiement reçu, envoyée, annulée ; montant fixé par le vendeur
  router.put('/:id', authenticate, requireVerifiedEmail, validateId(), commandeEtapeLimiter, asyncHandler(async (req, res) => {
    try {
      const { statut, montant_total } = req.body || {};
      res.json({ success: true, data: await commandes.mettreAJour(models, notifications(), Number(req.params.id), par(req), { statut, montant_total }) });
    } catch (err) { repondreErreur(res, err); }
  }));

  return router;
};
