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

  router.get('/:id/intervenants', validateId(), async (req, res) => {
    try {
      const intervenants = await models.LieuIntervenant.findAll({
        where: { id_lieu: parseInt(req.params.id) },
        order: [['ordre', 'ASC'], ['date_creation', 'ASC']],
        include: [{
          model: models.Intervenant,
          as: 'Intervenant',
          attributes: ['id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'photo_url', 'specialites', 'biographie', 'wikipedia_url']
        }]
      });
      res.json({ success: true, data: intervenants });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

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

  // Intervenants / personnalités d'un site patrimoine
  router.post('/:id/intervenants', authenticate, validateId(),
    [
      body('id_intervenant').isInt({ min: 1 }).withMessage('id_intervenant requis'),
      body('role_sur_site').optional().isLength({ max: 80 }).withMessage('role_sur_site trop long'),
      body('periode').optional().isLength({ max: 100 }).withMessage('periode trop long'),
      body('contexte').optional().isLength({ max: 5000 }).withMessage('contexte trop long'),
      body('ordre').optional().isInt({ min: 0 }).withMessage('ordre invalide'),
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const lieuId = parseInt(req.params.id);
        const { id_intervenant, role_sur_site, periode, contexte, ordre } = req.body;

        const lieu = await models.Lieu.findByPk(lieuId, { attributes: ['id_lieu'] });
        if (!lieu) return res.status(404).json({ success: false, error: 'Site patrimoine non trouvé' });

        const intervenant = await models.Intervenant.findByPk(id_intervenant, { attributes: ['id_intervenant'] });
        if (!intervenant) return res.status(404).json({ success: false, error: 'Intervenant non trouvé' });

        let finalOrdre = ordre;
        if (finalOrdre === undefined) {
          const maxOrdre = await models.LieuIntervenant.max('ordre', { where: { id_lieu: lieuId } });
          finalOrdre = (maxOrdre || 0) + 1;
        }

        const lien = await models.LieuIntervenant.create({
          id_lieu: lieuId,
          id_intervenant,
          role_sur_site: role_sur_site || null,
          periode: periode || null,
          contexte: contexte || null,
          ordre: finalOrdre,
          id_contributeur: req.user?.id_user || null
        });

        const result = await models.LieuIntervenant.findByPk(lien.id_lieu_intervenant, {
          include: [{ model: models.Intervenant, as: 'Intervenant', attributes: ['id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'photo_url', 'specialites'] }]
        });

        res.status(201).json({ success: true, data: result });
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          return res.status(409).json({ success: false, error: 'Cet intervenant est déjà associé à ce site' });
        }
        res.status(500).json({ success: false, error: error.message });
      }
    }
  );

  router.delete('/:id/intervenants/:lieuIntervenantId', authenticate, validateId(), async (req, res) => {
    try {
      const lieuIntervenantId = parseInt(req.params.lieuIntervenantId);
      if (isNaN(lieuIntervenantId)) {
        return res.status(400).json({ success: false, error: 'identifiant invalide' });
      }
      const lien = await models.LieuIntervenant.findOne({
        where: { id_lieu_intervenant: lieuIntervenantId, id_lieu: parseInt(req.params.id) }
      });
      if (!lien) return res.status(404).json({ success: false, error: 'Association non trouvée' });
      await lien.destroy();
      res.json({ success: true, message: 'Intervenant retiré du site' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

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
