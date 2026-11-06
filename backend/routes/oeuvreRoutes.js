/**
 * Routes pour les œuvres
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const { publicHttpCache, invalidateCache } = require('../middlewares/cacheMiddleware');
const { secureDiskUpload } = require('../middlewares/uploadSecurity');
const { MEDIA_MIMES, MAX_MEDIA_SIZE, AUDIO_MIMES, MAX_EXTRAIT_PDF_SIZE, MAX_EXTRAIT_PDF_ENVOI, MAX_EXTRAIT_AUDIO_SIZE, MAX_EXTRAIT_PDF_PAGES } = require('../constants/uploadMimes');
const { param, body } = require('express-validator');
const oeuvreController = require('../controllers/oeuvreController');
const articleRevisionController = require('../controllers/articleRevisionController');
const { handleValidationErrors, validateId, validatePagination, validateWorkSubmission, validateStringLengths } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const asyncHandler = require('../utils/asyncHandler');

const initOeuvreRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, optionalAuth, requireRole, requireVerifiedEmail } = authMiddleware;

  // Cache HTTP pour les listes publiques (données changent toutes les ~3 min)
  const cachePublic = publicHttpCache(180);
  // Le tableau de bord professionnel reste en cache 3 min : sans cela, un bouton « Envoyer » restait
  // affiché après l'envoi, et un second clic répondait par une erreur
  const viderTableauPro = invalidateCache(['/professionnel/']);
  router.use((req, res, next) => (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? viderTableauPro(req, res, next) : next()));

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.get('/', cachePublic, asyncHandler((req, res) => oeuvreController.list(req, res)));
  router.get('/recent', cachePublic, asyncHandler((req, res) => oeuvreController.getRecent(req, res)));
  router.get('/popular', cachePublic, asyncHandler((req, res) => oeuvreController.getPopular(req, res)));
  router.get('/statistics', cachePublic, asyncHandler((req, res) => oeuvreController.getStatistics(req, res)));
  router.get('/search', cachePublic, asyncHandler((req, res) => oeuvreController.search(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, asyncHandler((req, res) => oeuvreController.getMyOeuvres(req, res)));
  router.get('/my/statistics', authenticate, asyncHandler((req, res) => oeuvreController.getMyStatistics(req, res)));

  // ============================================================================
  // ROUTES ADMIN (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => oeuvreController.listAll(req, res)));
  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => oeuvreController.getPending(req, res)));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => oeuvreController.getStats(req, res)));

  // ============================================================================
  // ROUTES AVEC :id (après les routes spécifiques)
  // ============================================================================

  router.get('/:id', optionalAuth, validateId(), asyncHandler((req, res) => oeuvreController.getById(req, res)));

  // Propositions de modification d'un article : brouillons jusqu'à la décision de l'auteur ou de l'administration
  router.get('/:id/revisions', optionalAuth, validateId(), articleRevisionController.wrap('lister'));
  router.get('/:id/revisions/:idRevision', authenticate, validateId(), validateId('idRevision'), articleRevisionController.wrap('detail'));
  router.post('/:id/revisions', authenticate, requireVerifiedEmail, createContentLimiter, validateId(),
    [
      body('motif').isString().trim().isLength({ min: 5, max: 2000 }).withMessage('Motif : 5 à 2 000 caractères'),
      body('blocks').isArray({ min: 1, max: 150 }).withMessage('Contenu de l’article manquant')
    ],
    handleValidationErrors,
    articleRevisionController.wrap('proposer'));
  router.post('/:id/revisions/:idRevision/decision', authenticate, validateId(), validateId('idRevision'),
    [body('decision').isIn(['accepter', 'refuser']).withMessage('Décision invalide')],
    handleValidationErrors,
    articleRevisionController.wrap('decider'));
  router.get('/:id/similar', validateId(), asyncHandler((req, res) => oeuvreController.getSimilar(req, res)));
  router.get('/:id/medias', optionalAuth, validateId(), asyncHandler((req, res) => oeuvreController.getMedias(req, res)));

  router.post('/', authenticate, requireVerifiedEmail,
    createContentLimiter,
    validateStringLengths,
    [
      body('titre').notEmpty().withMessage('Le titre est requis'),
      body('id_type_oeuvre').isInt({ min: 1 }).withMessage('Le type d\'œuvre est requis'),
      body('description').optional().isLength({ max: 10000 }).withMessage('Description trop longue (max 10000 caractères)'),
      body('id_langue').optional().isInt({ min: 1 }).withMessage('Langue invalide'),
      body('prix').optional().isFloat({ min: 0 }).withMessage('Le prix doit être positif'),
      body('annee_creation').optional().isInt({ min: 1800, max: new Date().getFullYear() + 1 }).withMessage('Année de création invalide'),
    ],
    handleValidationErrors,
    validateWorkSubmission,
    asyncHandler((req, res) => oeuvreController.create(req, res)));
  router.put('/:id', authenticate, requireVerifiedEmail, validateId(),
    validateStringLengths,
    validateWorkSubmission,
    asyncHandler((req, res) => oeuvreController.update(req, res)));
  router.delete('/:id', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.delete(req, res)));
  router.post('/:id/submit', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.submit(req, res)));

  // Médias
  router.post('/:id/medias/upload', authenticate, requireVerifiedEmail, validateId(),
    ...secureDiskUpload({ field: 'medias', mimes: MEDIA_MIMES, maxFileSize: MAX_MEDIA_SIZE, maxFiles: 10 }),
    asyncHandler((req, res) => oeuvreController.uploadMedia(req, res)));
  // Extrait d'un livre : le PDF entier est reçu, seules les 20 premières pages sont gardées (5 Mo au plus) ;
  // lecture audio par l'écrivain (10 Mo)
  const premieresPages = async (file) => {
    const { garderPremieresPages } = require('../utils/extraitPdf');
    try {
      const { taille } = await garderPremieresPages(file.path, MAX_EXTRAIT_PDF_PAGES);
      file.size = taille;
      return taille > MAX_EXTRAIT_PDF_SIZE
        ? `Les ${MAX_EXTRAIT_PDF_PAGES} premières pages pèsent plus de 5 Mo (images trop lourdes). Réduisez la taille du PDF.` : null;
    } catch {
      return 'PDF illisible ou protégé par un mot de passe.';
    }
  };
  const extrait = (genre) => async (req, res) => {
    try {
      const data = await require('../services/serviceContainer').oeuvreService.definirExtraitFichier(
        parseInt(req.params.id, 10), genre, req.file || req.files?.[0], req.user.id_user, !!req.user.isAdmin);
      res.status(201).json({ success: true, data });
    } catch (error) {
      oeuvreController._handleError(res, error);
    }
  };
  router.post('/:id/extrait/pdf', authenticate, requireVerifiedEmail, validateId(),
    ...secureDiskUpload({ field: 'fichier', mimes: ['application/pdf'], maxFileSize: MAX_EXTRAIT_PDF_ENVOI, maxFiles: 1, controle: premieresPages }),
    asyncHandler(extrait('pdf')));
  router.post('/:id/extrait/audio', authenticate, requireVerifiedEmail, validateId(),
    ...secureDiskUpload({ field: 'fichier', mimes: AUDIO_MIMES, maxFileSize: MAX_EXTRAIT_AUDIO_SIZE, maxFiles: 1 }),
    asyncHandler(extrait('audio')));
  router.delete('/:id/extrait/:genre(pdf|audio)', authenticate, requireVerifiedEmail, validateId(), asyncHandler(async (req, res) => {
    try {
      await require('../services/serviceContainer').oeuvreService.retirerExtraitFichier(
        parseInt(req.params.id, 10), req.params.genre, req.user.id_user, !!req.user.isAdmin);
      res.json({ success: true });
    } catch (error) {
      oeuvreController._handleError(res, error);
    }
  }));
  router.put('/:id/medias/reorder', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => oeuvreController.reorderMedias(req, res)));
  router.delete('/:id/medias/:mediaId', authenticate, requireVerifiedEmail, validateId(), validateId('mediaId'), asyncHandler((req, res) => oeuvreController.deleteMedia(req, res)));

  // Admin actions sur :id
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => oeuvreController.validate(req, res)));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => oeuvreController.reject(req, res)));
  router.post('/:id/feature', authenticate, requireRole(['Admin']), validateId(), asyncHandler((req, res) => oeuvreController.setFeatured(req, res)));

  // Traductions (admin i18n)
  router.get('/:id/translations', authenticate, requireRole(['Admin']), asyncHandler((req, res) => oeuvreController.getTranslations(req, res)));
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), asyncHandler((req, res) => oeuvreController.updateTranslation(req, res)));

  return router;
};

module.exports = initOeuvreRoutes;
