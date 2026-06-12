// routes/commentaireRoutes.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { handleValidationErrors, validateStringLengths, validateId } = require('../middlewares/validationMiddleware');
const { commentLimiter } = require('../middlewares/rateLimitMiddleware');

module.exports = (models, middlewares = {}) => {
  const controller = require('../controllers/commentaireController');

  // Middleware d'authentification — fail-closed si non fourni
  const authMiddleware = middlewares.auth || ((req, res) => res.status(401).json({ success: false, error: 'Authentication required' }));
  const optionalAuth = middlewares.optionalAuth || ((req, res, next) => next());
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
  router.post('/oeuvre/:oeuvreId', authMiddleware, validateId('oeuvreId'),
    commentLimiter,
    validateStringLengths,
    [
      body('contenu').notEmpty().withMessage('Le contenu est requis')
        .isLength({ min: 3 }).withMessage('Le commentaire doit contenir au moins 3 caractères')
        .isLength({ max: 2000 }).withMessage('Contenu trop long (max 2000 caractères)'),
      body('note').optional().isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
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
  router.post('/evenement/:evenementId', authMiddleware, validateId('evenementId'),
    commentLimiter,
    validateStringLengths,
    [
      body('contenu').notEmpty().withMessage('Le contenu est requis')
        .isLength({ min: 3 }).withMessage('Le commentaire doit contenir au moins 3 caractères')
        .isLength({ max: 2000 }).withMessage('Contenu trop long (max 2000 caractères)'),
      body('note').optional().isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
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
  // ROUTES GESTION COMMENTAIRES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * PUT /commentaires/:id
   * Modifier un commentaire (propriétaire uniquement)
   */
  router.put('/:id', authMiddleware, validateId(),
    validateStringLengths,
    [
      body('contenu').optional()
        .isLength({ min: 3 }).withMessage('Le commentaire doit contenir au moins 3 caractères')
        .isLength({ max: 2000 }).withMessage('Contenu trop long (max 2000 caractères)'),
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
   * Supprimer un commentaire (propriétaire uniquement)
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
      
      if (commentaire.id_user !== req.user.id_user) {
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
      body('statut').isIn(['publie', 'masque', 'supprime', 'signale']).withMessage('Statut invalide')
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