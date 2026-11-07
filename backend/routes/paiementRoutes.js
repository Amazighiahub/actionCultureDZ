/**
 * Espace du professionnel : paiement direct (moyens de paiement, état d'un paiement, confirmation par
 * l'organisateur ; aucune somme ne passe par Tala DZ) et visibilité de sa fiche.
 */
const express = require('express');
const { body } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const { validateId, handleValidationErrors } = require('../middlewares/validationMiddleware');
const paiement = require('../services/paiementDirect');
const { moyensPaiementLimiter } = require('../middlewares/rateLimitMiddleware');

const repondreErreur = (res, err) => {
  if (!err.statusCode || err.statusCode >= 500) throw err;
  res.status(err.statusCode).json({ success: false, error: err.message, code: err.code });
};

module.exports = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireValidatedProfessional, requireVerifiedEmail } = authMiddleware;
  const container = () => require('../services/serviceContainer');

  // Le professionnel : ses moyens de paiement
  router.get('/mes-moyens', authenticate, requireValidatedProfessional, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await paiement.mesMoyens(models, req.user.id_user) });
  }));
  // Limite stricte : le mot de passe y est vérifié (pas d'essais en masse)
  router.put('/mes-moyens', authenticate, requireValidatedProfessional, requireVerifiedEmail, moyensPaiementLimiter, asyncHandler(async (req, res) => {
    try {
      const c = container();
      res.json({ success: true, data: await paiement.enregistrerMoyens(models, req.user.id_user, req.body?.moyens ?? null, {
        motDePasse: req.body?.mot_de_passe, ip: req.ip, userAgent: req.get('user-agent'),
        emailService: require('../services/emailService'), notificationService: c.notificationService,
      }) });
    } catch (err) { repondreErreur(res, err); }
  }));

  // Le participant : combien, à qui, comment, et si l'organisateur a reçu le paiement
  router.get('/evenements/:id', authenticate, validateId(), asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      res.json({ success: true, data: await paiement.paiementDuParticipant(models, Number(req.params.id), req.user.id_user) });
    } catch (err) { repondreErreur(res, err); }
  }));

  // L'organisateur : « Paiement reçu » (ou correction)
  router.put('/evenements/:id/participants/:userId', authenticate, requireVerifiedEmail, validateId(), validateId('userId'),
    [body('recu').isBoolean().withMessage('Valeur invalide')], handleValidationErrors,
    asyncHandler(async (req, res) => {
      try {
        const c = container();
        const data = await paiement.confirmerPaiement(models, c.evenementService, c.notificationService, {
          idEvenement: Number(req.params.id),
          idParticipant: Number(req.params.userId),
          recu: req.body.recu === true || req.body.recu === 'true',
          par: { id: req.user.id_user, isAdmin: !!req.user.isAdmin },
        });
        res.json({ success: true, data });
      } catch (err) { repondreErreur(res, err); }
    }));

  // Le professionnel : ce qui l'aide à être trouvé sur les moteurs de recherche
  router.get('/visibilite', authenticate, requireValidatedProfessional, asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.json({ success: true, data: await require('../services/visibiliteFiche').visibiliteFiche(models, req.user.id_user) });
  }));

  return router;
};
