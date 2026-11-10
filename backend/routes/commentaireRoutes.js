// routes/commentaireRoutes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { handleValidationErrors, validateStringLengths, validateId } = require('../middlewares/validationMiddleware');
const { commentLimiter } = require('../middlewares/rateLimitMiddleware');
const { msg } = require('../utils/messageValidation');

module.exports = (models, middlewares = {}) => {
  const controller = require('../controllers/commentaireController');

  // Middleware d'authentification — fail-closed si non fourni
  const authMiddleware = middlewares.auth || ((req, res) => res.status(401).json({ success: false, error: 'Authentication required' }));
  const optionalAuth = middlewares.optionalAuth || ((req, res, next) => next());
  // Écrire un commentaire ou un avis : adresse e-mail vérifiée (sinon des comptes jetables, ou
  // créés avec l'adresse d'un tiers, notaient et commentaient sans limite)
  const emailVerifie = middlewares.requireVerifiedEmail || ((req, res, next) => next());
  const requireRole = middlewares.requireRole || (() => (req, res) => res.status(503).json({ success: false, error: 'Auth service unavailable' }));

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES COMMENTAIRES ŒUVRES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /commentaires/oeuvre/:oeuvreId
   * Récupérer les commentaires d'une œuvre (public)
   */
  router.get('/oeuvre/:oeuvreId', validateId('oeuvreId'), async (req, res) => {
    try {
      await controller.getCommentairesOeuvre(req, res);
    } catch (error) {
      console.error('Erreur route GET /oeuvre/:oeuvreId:', error);
      res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  });

  /**
   * POST /commentaires/oeuvre/:oeuvreId
   * Créer un commentaire sur une œuvre (authentifié)
   */
  router.post('/oeuvre/:oeuvreId', authMiddleware, emailVerifie, validateId('oeuvreId'),
    commentLimiter,
    validateStringLengths,
    [
      body('contenu').notEmpty().withMessage(msg('validation.contenuRequis'))
        .isLength({ min: 3 }).withMessage(msg('validation.commentaireTropCourt'))
        .isLength({ max: 2000 }).withMessage(msg('validation.contenu2000')),
      body('note_qualite').optional().isInt({ min: 1, max: 5 }).withMessage(msg('validation.note1a5')),
    ],
    handleValidationErrors,
    async (req, res) => {
    try {
      await controller.createCommentaireOeuvre(req, res);
    } catch (error) {
      console.error('Erreur route POST /oeuvre/:oeuvreId:', error);
      res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES COMMENTAIRES ÉVÉNEMENTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /commentaires/evenement/:evenementId
   * Récupérer les commentaires d'un événement (public)
   */
  router.get('/evenement/:evenementId', validateId('evenementId'), async (req, res) => {
    try {
      await controller.getCommentairesEvenement(req, res);
    } catch (error) {
      console.error('Erreur route GET /evenement/:evenementId:', error);
      res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  });

  /**
   * POST /commentaires/evenement/:evenementId
   * Créer un commentaire sur un événement (authentifié)
   */
  router.post('/evenement/:evenementId', authMiddleware, emailVerifie, validateId('evenementId'),
    commentLimiter,
    validateStringLengths,
    [
      body('contenu').notEmpty().withMessage(msg('validation.contenuRequis'))
        .isLength({ min: 3 }).withMessage(msg('validation.commentaireTropCourt'))
        .isLength({ max: 2000 }).withMessage(msg('validation.contenu2000')),
      body('note_qualite').optional().isInt({ min: 1, max: 5 }).withMessage(msg('validation.note1a5')),
    ],
    handleValidationErrors,
    async (req, res) => {
    try {
      await controller.createCommentaireEvenement(req, res);
    } catch (error) {
      console.error('Erreur route POST /evenement/:evenementId:', error);
      res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES AVIS SERVICES (restaurant, hébergement, guide…)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /commentaires/service/:serviceId
   * Avis d'un service et note moyenne (public)
   */
  router.get('/service/:serviceId', validateId('serviceId'), (req, res) => controller.getCommentairesService(req, res));

  /**
   * POST /commentaires/service/:serviceId
   * Publier un avis (note de 1 à 5 facultative) ou une réponse (authentifié)
   */
  router.post('/service/:serviceId', authMiddleware, emailVerifie, validateId('serviceId'),
    commentLimiter,
    validateStringLengths,
    [
      body('contenu').notEmpty().withMessage(msg('validation.contenuRequis'))
        .isLength({ min: 3 }).withMessage(msg('validation.commentaireTropCourt'))
        .isLength({ max: 2000 }).withMessage(msg('validation.contenu2000')),
      body('note_qualite').optional({ values: 'null' }).isInt({ min: 1, max: 5 }).withMessage(msg('validation.note1a5')).toInt(),
      body('commentaire_parent_id').optional({ values: 'null' }).isInt({ min: 1 }).toInt(),
    ],
    handleValidationErrors,
    (req, res) => controller.createCommentaireService(req, res));

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES GESTION COMMENTAIRES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * PUT /commentaires/:id
   * Modifier un commentaire (propriétaire uniquement)
   */
  router.put('/:id', authMiddleware, emailVerifie, validateId(),
    validateStringLengths,
    [
      body('contenu').optional()
        .isLength({ min: 3 }).withMessage(msg('validation.commentaireTropCourt'))
        .isLength({ max: 2000 }).withMessage(msg('validation.contenu2000')),
      // Note de 1 à 5 (avant : 7 donnait une erreur 500, null effaçait la note)
      body('note_qualite').optional().isInt({ min: 1, max: 5 }).withMessage(msg('validation.note1a5')),
    ],
    handleValidationErrors,
    async (req, res) => {
    try {
      // Vérifier que l'utilisateur est propriétaire du commentaire
      const commentaire = await models.Commentaire.findByPk(req.params.id);
      
      if (!commentaire) {
        return res.status(404).json({
          success: false,
          error: req.t ? req.t('common.notFound') : 'Not found'
        });
      }
      
      if (commentaire.id_user !== req.user.id_user) {
        return res.status(403).json({
          success: false,
          error: req.t ? req.t('auth.forbidden') : 'Forbidden'
        });
      }
      
      req.resource = commentaire;
      await controller.updateCommentaire(req, res);
    } catch (error) {
      console.error('Erreur route PUT /:id:', error);
      res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  });

  /**
   * DELETE /commentaires/:id
   * Supprimer un commentaire (son auteur, ou l'administration et la modération)
   */
  router.delete('/:id', authMiddleware, validateId(), async (req, res) => {
    try {
      const commentaire = await models.Commentaire.findByPk(req.params.id);
      
      if (!commentaire) {
        return res.status(404).json({
          success: false,
          error: req.t ? req.t('common.notFound') : 'Not found'
        });
      }
      
      if (commentaire.id_user !== req.user.id_user && !req.user.isAdmin && !req.user.isModerateur) {
        return res.status(403).json({
          success: false,
          error: req.t ? req.t('auth.forbidden') : 'Forbidden'
        });
      }

      req.resource = commentaire;
      await controller.deleteCommentaire(req, res);
    } catch (error) {
      console.error('Erreur route DELETE /:id:', error);
      res.status(500).json({
        success: false,
        error: req.t ? req.t('common.serverError') : 'Server error'
      });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES ADMIN
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * PUT /commentaires/:id/moderate
   * Modérer un commentaire (admin uniquement)
   */
  router.put('/:id/moderate',
    authMiddleware,
    validateId(),
    requireRole('Administrateur', 'Moderateur'),
    [
      // Statuts du modèle : « masque » et « signale » n'y sont pas, ils finissaient en erreur 500.
      // Masquer un commentaire = « rejete » (il disparaît du site, et peut être rétabli)
      body('statut').isIn(['publie', 'rejete', 'supprime']).withMessage(msg('validation.invalidStatus'))
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        await controller.moderateCommentaire(req, res);
      } catch (error) {
        console.error('Erreur route PUT /:id/moderate:', error);
        res.status(500).json({
          success: false,
          error: req.t ? req.t('common.serverError') : 'Server error'
        });
      }
    }
  );

  return router;
};