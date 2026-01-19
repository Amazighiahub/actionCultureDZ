// routes/commentaireRoutes.js
const express = require('express');
const router = express.Router();

module.exports = (models, middlewares = {}) => {
  const CommentaireController = require('../controllers/commentaireController');
  const controller = new CommentaireController(models);
  
  // Middleware d'authentification (optionnel si non fourni)
  const authMiddleware = middlewares.auth || ((req, res, next) => next());
  const optionalAuth = middlewares.optionalAuth || ((req, res, next) => next());

  // ════════════════════════════════════════════════════════════════════════════
  // ROUTES COMMENTAIRES ŒUVRES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * GET /commentaires/oeuvre/:oeuvreId
   * Récupérer les commentaires d'une œuvre (public)
   */
  router.get('/oeuvre/:oeuvreId', async (req, res) => {
    try {
      await controller.getCommentairesOeuvre(req, res);
    } catch (error) {
      console.error('Erreur route GET /oeuvre/:oeuvreId:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des commentaires'
      });
    }
  });

  /**
   * POST /commentaires/oeuvre/:oeuvreId
   * Créer un commentaire sur une œuvre (authentifié)
   */
  router.post('/oeuvre/:oeuvreId', authMiddleware, async (req, res) => {
    try {
      await controller.createCommentaireOeuvre(req, res);
    } catch (error) {
      console.error('Erreur route POST /oeuvre/:oeuvreId:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création du commentaire'
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
  router.get('/evenement/:evenementId', async (req, res) => {
    try {
      await controller.getCommentairesEvenement(req, res);
    } catch (error) {
      console.error('Erreur route GET /evenement/:evenementId:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la récupération des commentaires'
      });
    }
  });

  /**
   * POST /commentaires/evenement/:evenementId
   * Créer un commentaire sur un événement (authentifié)
   */
  router.post('/evenement/:evenementId', authMiddleware, async (req, res) => {
    try {
      await controller.createCommentaireEvenement(req, res);
    } catch (error) {
      console.error('Erreur route POST /evenement/:evenementId:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la création du commentaire'
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
  router.put('/:id', authMiddleware, async (req, res) => {
    try {
      // Vérifier que l'utilisateur est propriétaire du commentaire
      const commentaire = await models.Commentaire.findByPk(req.params.id);
      
      if (!commentaire) {
        return res.status(404).json({
          success: false,
          error: 'Commentaire non trouvé'
        });
      }
      
      if (commentaire.id_user !== req.user.id_user) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à modifier ce commentaire'
        });
      }
      
      req.resource = commentaire;
      await controller.updateCommentaire(req, res);
    } catch (error) {
      console.error('Erreur route PUT /:id:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la modification du commentaire'
      });
    }
  });

  /**
   * DELETE /commentaires/:id
   * Supprimer un commentaire (propriétaire uniquement)
   */
  router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const commentaire = await models.Commentaire.findByPk(req.params.id);
      
      if (!commentaire) {
        return res.status(404).json({
          success: false,
          error: 'Commentaire non trouvé'
        });
      }
      
      if (commentaire.id_user !== req.user.id_user) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé à supprimer ce commentaire'
        });
      }
      
      req.resource = commentaire;
      await controller.deleteCommentaire(req, res);
    } catch (error) {
      console.error('Erreur route DELETE /:id:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la suppression du commentaire'
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
  router.put('/:id/moderate', authMiddleware, async (req, res) => {
    try {
      // Vérifier que l'utilisateur est admin
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Accès réservé aux administrateurs'
        });
      }
      
      await controller.moderateCommentaire(req, res);
    } catch (error) {
      console.error('Erreur route PUT /:id/moderate:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur serveur lors de la modération du commentaire'
      });
    }
  });

  return router;
};