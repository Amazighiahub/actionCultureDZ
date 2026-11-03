// Newsletter sans compte : inscription par e-mail, confirmation, désabonnement
const express = require('express');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');
const abonnes = require('../services/newsletterAbonnes');

module.exports = (models) => {
  const router = express.Router();

  router.post('/inscription', rateLimitMiddleware.endpointLimiters.newsletter, async (req, res) => {
    // Champ caché du formulaire : rempli seulement par les robots, qui reçoivent la réponse habituelle
    if (req.body?.site_web) return res.json({ success: true });
    try {
      const resultat = await abonnes.demander(models, req.body?.email);
      if (resultat.invalide) return res.status(400).json({ success: false, error: req.t('validation.invalidEmail') });
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  });

  // POST seulement : certaines messageries ouvrent les liens toutes seules, ce qui confirmerait sans accord
  router.post('/confirmer', rateLimitMiddleware.endpointLimiters.newsletter, async (req, res) => {
    try {
      const ok = await abonnes.confirmer(models, req.body?.u, req.body?.t);
      if (!ok) return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      res.json({ success: true });
    } catch {
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  });

  // Lien de chaque newsletter (GET) et bouton « Se désabonner » de la messagerie (POST, RFC 8058)
  const desabonner = async (req, res) => {
    try {
      const ok = await abonnes.desabonner(models, req.query.u ?? req.body?.u, req.query.t ?? req.body?.t);
      if (!ok) return res.status(400).json({ success: false, error: req.t('common.badRequest') });
      if (req.method === 'POST') return res.json({ success: true });
      res.type('html').send('<!doctype html><meta charset="utf-8"><title>Désinscription</title>'
        + '<p>Vous êtes désinscrit(e) de la newsletter de Tala DZ, et votre adresse a été effacée.</p>');
    } catch {
      res.status(500).json({ success: false, error: req.t('common.serverError') });
    }
  };
  router.get('/desabonner', desabonner);
  router.post('/desabonner', desabonner);

  return router;
};
