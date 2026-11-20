/**
 * Section Tamazight (2026-11-20) : page publique, données ouvertes et relecture par la modération.
 * - GET  /api/tamazight/oeuvres?variante=&type=&page=  œuvres publiées en tamazight
 * - GET  /api/tamazight/voix                         voix des lieux en tamazight
 * - GET  /api/tamazight/donnees-ouvertes.json|.csv   textes et voix relus, licence CC BY-SA 4.0
 * - GET  /api/tamazight/admin/a-relire               textes partagés à relire (modération)
 * - PATCH /api/tamazight/admin/:id {valide}           entrée ou sortie des données ouvertes
 */
const express = require('express');
const { publicHttpCache, conditionalCache, invalidateCache } = require('../middlewares/cacheMiddleware');
const t = require('../services/tamazight');

const initTamazightRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;
  const moderation = requireRole('Administrateur', 'Moderateur');
  const viderDonnees = invalidateCache(['/tamazight/']);

  // Refus attendu (400, 404…) : son message ; autre erreur : traitement commun (journal, message masqué)
  const repondre = (fn) => async (req, res, next) => {
    try {
      res.json({ success: true, data: await fn(req) });
    } catch (e) {
      if (e.statusCode && e.statusCode < 500) return res.status(e.statusCode).json({ success: false, error: e.message, code: e.code });
      return next(e);
    }
  };

  router.get('/oeuvres', publicHttpCache(120), repondre((req) => t.liste(models, req.query)));
  router.get('/voix', publicHttpCache(300), repondre(() => t.voixDesLieux(models)));

  // Données ouvertes : gardées 10 min sur le serveur, effacées à chaque décision de la modération
  router.get('/donnees-ouvertes.json', publicHttpCache(600), conditionalCache(600, { sansParametres: true }), async (req, res, next) => {
    try {
      const jeu = await t.donneesOuvertes(models);
      res.set('Content-Disposition', 'inline; filename="taladz-tamazight.json"');
      res.json(jeu);
    } catch (e) {
      next(e);
    }
  });
  router.get('/donnees-ouvertes.csv', publicHttpCache(600), async (req, res, next) => {
    try {
      const csv = t.enCsv(await t.donneesOuvertes(models));
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="taladz-tamazight.csv"');
      // BOM : l'arabe et le tifinagh s'ouvrent correctement dans Excel
      res.send(`${String.fromCharCode(0xfeff)}${csv}`);
    } catch (e) {
      next(e);
    }
  });

  router.get('/admin/a-relire', authenticate, moderation, repondre(() => t.aRelire(models)));
  router.patch('/admin/:id(\\d+)', authenticate, moderation, viderDonnees,
    repondre((req) => t.decider(models, req.params.id, req.body?.valide === true || req.body?.valide === 'true', req.user.id_user)));

  return router;
};

module.exports = initTamazightRoutes;
