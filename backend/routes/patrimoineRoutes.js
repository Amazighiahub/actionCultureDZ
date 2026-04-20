/**
 * Routes pour le patrimoine
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { param, body } = require('express-validator');
const patrimoineController = require('../controllers/patrimoineController');
const { handleValidationErrors, validateId, validateStringLengths, validateGPS } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const uploadService = require('../services/uploadService');

const initPatrimoineRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole, requireValidatedProfessional } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  // Routes mobile (AVANT /:id pour éviter que "mobile" soit pris comme id)
  router.get('/mobile/nearby', patrimoineController.wrap('getMobileNearby'));
  router.post('/mobile/qr-scan', patrimoineController.wrap('scanQRCode'));
  router.get('/mobile/offline/:wilayaId', patrimoineController.wrap('getMobileOffline'));

  router.get('/', patrimoineController.wrap('list'));
  router.get('/popular', (req, res, next) => { console.log('[DEBUG ROUTE] /popular hit'); next(); }, patrimoineController.wrap('popular'));
  router.get('/search', patrimoineController.wrap('search'));
  // Vérifier les doublons avant création (nom + commune)
  router.get('/check-duplicate', patrimoineController.wrap('checkDuplicate'));
  router.get('/types', patrimoineController.wrap('getTypes'));
  router.get('/map', patrimoineController.wrap('getMap'));
  router.get('/monuments/:type', patrimoineController.wrap('getByType'));
  router.get('/vestiges/:type', patrimoineController.wrap('getByType'));
  router.get('/:id/galerie', validateId(), patrimoineController.wrap('getGalerie'));
  router.get('/:id/carte-visite', validateId(), patrimoineController.wrap('getCarteVisite'));
  router.get('/:id/qrcode', validateId(), patrimoineController.wrap('getQRCode'));
  router.get('/:id', validateId(), patrimoineController.wrap('getById'));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.post('/:id/noter', authenticate, validateId(),
    [body('note').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5')],
    handleValidationErrors,
    patrimoineController.wrap('noter'));
  router.post('/:id/favoris', authenticate, validateId(), patrimoineController.wrap('ajouterFavoris'));
  router.delete('/:id/favoris', authenticate, validateId(), patrimoineController.wrap('retirerFavoris'));
  router.post('/:id/medias', authenticate, requireValidatedProfessional, validateId(),
    uploadService.uploadMedia().array('medias', 10),
    patrimoineController.wrap('uploadMedias'));
  router.delete('/:id/medias/:mediaId', authenticate, requireValidatedProfessional, validateId(), validateId('mediaId'), patrimoineController.wrap('deleteMedia'));
  router.put('/:id/horaires', authenticate, requireValidatedProfessional, validateId(), patrimoineController.wrap('updateHoraires'));

  // Enrichir les détails culturels d'un site (contribution collaborative)
  router.patch('/:id/detail', authenticate, validateId(),
    validateStringLengths,
    handleValidationErrors,
    patrimoineController.wrap('enrichDetail'));

  // Articles patrimoine (blocs éditeur riche liés à un lieu + section)
  router.get('/:id/articles', validateId(), async (req, res) => {
    try {
      const { section } = req.query;
      const where = { id_article: parseInt(req.params.id), article_type: 'patrimoine' };
      if (section) where.section_patrimoine = section;

      // models déjà disponible via initPatrimoineRoutes(models, ...)
      const blocks = await models.ArticleBlock.findAll({
        where,
        order: [['section_patrimoine', 'ASC'], ['ordre', 'ASC']],
        include: [{ model: models.Media, as: 'media', required: false }]
      });

      res.json({ success: true, data: blocks });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/:id/articles', authenticate, validateId(),
    [
      body('type_block').isIn(['text', 'heading', 'image', 'video', 'citation', 'code', 'list', 'table', 'separator', 'embed']).withMessage('Type de bloc invalide'),
      body('section_patrimoine').isIn(['histoire', 'architecture', 'traditions', 'gastronomie', 'artisanat_local', 'personnalites', 'infos_pratiques', 'referencesHistoriques']).withMessage('Section invalide'),
      body('contenu').optional().isLength({ max: 10000 }).withMessage('Contenu trop long'),
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        // models déjà disponible via initPatrimoineRoutes(models, ...)
        const { sanitizeBlockContent } = require('../utils/sanitizeArticle');

        const lieuId = parseInt(req.params.id);
        const { type_block, section_patrimoine, contenu, contenu_json, metadata } = req.body;

        // Sanitiser le contenu
        const sanitizedContenu = contenu ? sanitizeBlockContent(type_block, contenu) : null;

        // Trouver le prochain ordre
        const maxOrder = await models.ArticleBlock.max('ordre', {
          where: { id_article: lieuId, article_type: 'patrimoine', section_patrimoine }
        });

        const block = await models.ArticleBlock.create({
          id_article: lieuId,
          article_type: 'patrimoine',
          section_patrimoine,
          type_block,
          contenu: sanitizedContenu,
          contenu_json: contenu_json || {},
          metadata: metadata || {},
          ordre: (maxOrder || 0) + 1,
          visible: true
        });

        // Incrémenter nb_contributions sur DetailLieu
        const DetailLieu = models.DetailLieu;
        const detail = await DetailLieu.findOne({ where: { id_lieu: lieuId } });
        if (detail) {
          await detail.update({
            id_dernier_contributeur: req.user?.id_user,
            date_derniere_contribution: new Date(),
            nb_contributions: (detail.nb_contributions || 0) + 1
          });
        }

        res.status(201).json({ success: true, data: block });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  router.delete('/:id/articles/:blockId', authenticate, validateId(),
    async (req, res) => {
      try {
        // models déjà disponible via initPatrimoineRoutes(models, ...)
        const block = await models.ArticleBlock.findOne({
          where: {
            id_block: parseInt(req.params.blockId),
            id_article: parseInt(req.params.id),
            article_type: 'patrimoine'
          }
        });

        if (!block) {
          return res.status(404).json({ success: false, error: 'Bloc non trouvé' });
        }

        await block.destroy();
        res.json({ success: true, message: 'Bloc supprimé' });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/stats', authenticate, requireRole(['Admin']), patrimoineController.wrap('getStats'));
  // Création de site (admin, modérateur ET professionnels validés)
  router.post('/', authenticate,
    createContentLimiter,
    validateStringLengths,
    validateGPS,
    [
      body('nom').notEmpty().withMessage('Le nom est requis'),
      body('typePatrimoine').optional().isIn(['ville_village', 'monument', 'musee', 'site_archeologique', 'site_naturel', 'edifice_religieux', 'palais_forteresse', 'autre']).withMessage('Type de patrimoine invalide'),
      body('communeId').optional().isInt({ min: 1 }).withMessage('Commune invalide'),
      body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
      body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    ],
    handleValidationErrors,
    patrimoineController.wrap('create'));
  router.put('/:id', authenticate, validateId(),
    validateStringLengths,
    validateGPS,
    patrimoineController.wrap('update'));
  router.delete('/:id', authenticate, requireRole(['Admin']), validateId(), patrimoineController.wrap('delete'));

  return router;
};

module.exports = initPatrimoineRoutes;
