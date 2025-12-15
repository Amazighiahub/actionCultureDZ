// routes/commentaireRoutes.js - VERSION i18n
const express = require('express');
const router = express.Router();
const CommentaireController = require('../controllers/CommentaireController');
const createAuthMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');
const { body, param } = require('express-validator');

const initCommentaireRoutes = (models) => {
  const authMiddleware = createAuthMiddleware(models);
  const commentaireController = new CommentaireController(models);

  // Validation pour les commentaires
  const commentaireValidation = [
    body('contenu').trim().isLength({ min: 1, max: 2000 }).withMessage('Le contenu doit contenir entre 1 et 2000 caractères'),
    body('note_qualite').optional().isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
    body('commentaire_parent_id').optional().isInt().withMessage('ID du commentaire parent invalide')
  ];

  // ========================================================================
  // ROUTES PUBLIQUES - consultation des commentaires
  // ========================================================================

  // Commentaires d'une œuvre
  router.get('/oeuvre/:oeuvreId', 
    param('oeuvreId').isInt().withMessage('ID œuvre invalide'),
    validationMiddleware.handleValidationErrors,
    commentaireController.getCommentairesOeuvre.bind(commentaireController)
  );

  // Commentaires d'un événement
  router.get('/evenement/:evenementId', 
    param('evenementId').isInt().withMessage('ID événement invalide'),
    validationMiddleware.handleValidationErrors,
    commentaireController.getCommentairesEvenement.bind(commentaireController)
  );

  // ========================================================================
  // ROUTES AUTHENTIFIÉES - création de commentaires
  // ========================================================================

  // Créer un commentaire sur une œuvre
  router.post('/oeuvre/:oeuvreId', 
    authMiddleware.authenticate,
    param('oeuvreId').isInt().withMessage('ID œuvre invalide'),
    commentaireValidation,
    validationMiddleware.handleValidationErrors,
    commentaireController.createCommentaireOeuvre.bind(commentaireController)
  );

  // Créer un commentaire sur un événement
  router.post('/evenement/:evenementId', 
    authMiddleware.authenticate,
    param('evenementId').isInt().withMessage('ID événement invalide'),
    commentaireValidation,
    validationMiddleware.handleValidationErrors,
    commentaireController.createCommentaireEvenement.bind(commentaireController)
  );

  // ========================================================================
  // MODIFICATION/SUPPRESSION
  // ========================================================================

  // Modifier un commentaire (propriétaire ou admin)
  router.put('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireOwnership('Commentaire', 'id', 'id_user'),
    param('id').isInt().withMessage('ID invalide'),
    commentaireValidation,
    validationMiddleware.handleValidationErrors,
    commentaireController.updateCommentaire.bind(commentaireController)
  );

  // Supprimer un commentaire (propriétaire ou admin)
  router.delete('/:id', 
    authMiddleware.authenticate,
    authMiddleware.requireOwnership('Commentaire', 'id', 'id_user'),
    param('id').isInt().withMessage('ID invalide'),
    validationMiddleware.handleValidationErrors,
    commentaireController.deleteCommentaire.bind(commentaireController)
  );

  // ========================================================================
  // MODÉRATION - admins uniquement
  // ========================================================================

  router.patch('/:id/moderate', 
    authMiddleware.authenticate,
    authMiddleware.requireAdmin,
    param('id').isInt().withMessage('ID invalide'),
    [
      body('statut').isIn(['publie', 'rejete', 'supprime']).withMessage('Statut invalide')
    ],
    validationMiddleware.handleValidationErrors,
    commentaireController.moderateCommentaire.bind(commentaireController)
  );

  console.log('✅ Routes commentaires i18n initialisées');
  console.log('  🌍 Traduction automatique des noms d\'utilisateurs dans les réponses');

  return router;
};

module.exports = initCommentaireRoutes;
