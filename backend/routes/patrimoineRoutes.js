/**
 * Routes pour le patrimoine
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { publicHttpCache } = require('../middlewares/cacheMiddleware');
const { secureDiskUpload } = require('../middlewares/uploadSecurity');
const { uploadClasseurXlsx } = require('../middlewares/uploadClasseur');
const { MEDIA_MIMES, MAX_MEDIA_SIZE } = require('../constants/uploadMimes');
const { MONUMENT_TYPES, VESTIGE_TYPES, LANGUES_AUDIO } = require('../constants/patrimoineTypes');
const { param, body } = require('express-validator');
const patrimoineController = require('../controllers/patrimoineController');
const { handleValidationErrors, validateId, validateStringLengths, validateGPS } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');
const logger = require('../utils/logger');

const initPatrimoineRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, optionalAuth, requireRole, requireValidatedProfessional } = authMiddleware;
  // Actions destructives sur un site (partagé) : réservées à la modération
  const requireModeration = requireRole('Administrateur', 'Moderateur');
  // Modification d'un site : modération, ou professionnel validé (le contrôleur vérifie qu'il en est le créateur)
  const requireModerationOuPro = (req, res, next) =>
    (req.user?.isAdmin || req.user?.isModerateur) ? next() : requireValidatedProfessional(req, res, next);

  // Relevé Excel de points de visite (modèle Taladz) : lu en mémoire, jamais stocké
  const releveUpload = [
    ...uploadClasseurXlsx,
    [body('parentId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Lieu invalide')],
    handleValidationErrors
  ];
  router.post('/import-releve/apercu', authenticate, requireModeration, ...releveUpload, patrimoineController.wrap('apercuReleve'));
  router.post('/import-releve', authenticate, requireModeration, ...releveUpload, patrimoineController.wrap('importerReleve'));

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  // Routes mobile (AVANT /:id pour éviter que "mobile" soit pris comme id)
  router.get('/mobile/nearby', patrimoineController.wrap('getMobileNearby'));
  router.post('/mobile/qr-scan', patrimoineController.wrap('scanQRCode'));
  router.get('/mobile/offline/:wilayaId', patrimoineController.wrap('getMobileOffline'));

  // Cache HTTP des listes publiques (les sites changent rarement)
  const cachePublic = publicHttpCache(300);

  router.get('/', cachePublic, patrimoineController.wrap('list'));
  // Sites et points créés par le compte connecté (tableau de bord professionnel), tous statuts
  router.get('/mes-sites', authenticate, requireModerationOuPro, patrimoineController.wrap('mesSites'));
  router.get('/popular', cachePublic, patrimoineController.wrap('popular'));
  router.get('/search', cachePublic, patrimoineController.wrap('search'));
  // Vérifier les doublons avant création (nom + commune)
  router.get('/check-duplicate', patrimoineController.wrap('checkDuplicate'));
  router.get('/types', cachePublic, patrimoineController.wrap('getTypes'));
  // Plats de la page Gastronomie (articles des sections Gastronomie des lieux)
  router.get('/gastronomie', patrimoineController.wrap('plats'));
  // « À lire » de la page d'accueil : derniers articles publiés
  router.get('/a-lire', cachePublic, patrimoineController.wrap('aLire'));
  router.get('/map', cachePublic, patrimoineController.wrap('getMap'));
  router.get('/monuments/:type', patrimoineController.wrap('getByType'));
  router.get('/vestiges/:type', patrimoineController.wrap('getByType'));
  // optionalAuth : le créateur d'un site non publié peut voir sa propre fiche
  router.get('/:id/galerie', optionalAuth, validateId(), patrimoineController.wrap('getGalerie'));
  router.get('/:id/carte-visite', optionalAuth, validateId(), patrimoineController.wrap('getCarteVisite'));
  router.get('/:id/qrcode', validateId(), patrimoineController.wrap('getQRCode'));

  router.get('/:id/intervenants', validateId(), async (req, res) => {
    try {
      const intervenants = await models.LieuIntervenant.findAll({
        where: { id_lieu: parseInt(req.params.id) },
        order: [['ordre', 'ASC'], ['date_creation', 'ASC']],
        include: [{
          model: models.Intervenant,
          as: 'Intervenant',
          attributes: ['id_intervenant', 'nom', 'prenom', 'titre_professionnel', 'photo_url', 'specialites', 'biographie', 'wikipedia_url',
            'date_naissance', 'lieu_naissance', 'date_deces', 'lieu_deces', 'id_user']
        }]
      });
      res.json({ success: true, data: intervenants });
    } catch (error) {
      logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/:id', optionalAuth, validateId(), patrimoineController.wrap('getById'));

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
    ...secureDiskUpload({ field: 'medias', mimes: MEDIA_MIMES, maxFileSize: MAX_MEDIA_SIZE, maxFiles: 10 }),
    [body('langue').optional({ values: 'falsy' }).isIn(LANGUES_AUDIO).withMessage('Langue invalide')],
    handleValidationErrors,
    patrimoineController.wrap('uploadMedias'));
  // Ordre de visite des points d'un site (créateur du site ou modération, vérifié par le service)
  router.put('/:id/points/ordre', authenticate, validateId(),
    [body('ordre').isArray({ min: 1, max: 200 }).withMessage('ordre doit être la liste des points')],
    handleValidationErrors,
    patrimoineController.wrap('reordonnerPoints'));
  router.delete('/:id/medias/:mediaId', authenticate, requireModerationOuPro, validateId(), validateId('mediaId'), patrimoineController.wrap('deleteMedia'));
  router.put('/:id/horaires', authenticate, validateId(), patrimoineController.wrap('updateHoraires'));

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
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  // Retirer une personnalité : modération, contributeur qui l'a rattachée ou créateur du site
  router.delete('/:id/intervenants/:lieuIntervenantId', authenticate, validateId(), validateId('lieuIntervenantId'),
    patrimoineController.wrap('retirerPersonnalite'));

  // Nouvelle personnalité (fiche + rattachement) : professionnels validés et modération
  router.post('/:id/personnalites', authenticate, requireModerationOuPro, validateId(),
    [
      body('nom').custom(v => (typeof v === 'string' ? v.trim().length > 0 : !!(v && (v.fr || v.ar)))).withMessage('Le nom est requis'),
      body('titre_professionnel').optional({ values: 'falsy' }).isString().isLength({ max: 255 }),
      body('date_naissance').optional({ values: 'falsy' }).isISO8601(),
      body('date_deces').optional({ values: 'falsy' }).isISO8601(),
      body('lieu_naissance').optional({ values: 'falsy' }).isString().isLength({ max: 255 }),
      body('lieu_deces').optional({ values: 'falsy' }).isString().isLength({ max: 255 }),
      body('photo_url').optional({ values: 'falsy' }).isURL(),
      body('wikipedia_url').optional({ values: 'falsy' }).isURL(),
      body('role_sur_site').optional({ values: 'falsy' }).isLength({ max: 80 }),
      body('periode').optional({ values: 'falsy' }).isLength({ max: 100 }),
      body('contexte').optional({ values: 'falsy' }).isLength({ max: 5000 })
    ],
    handleValidationErrors,
    patrimoineController.wrap('creerPersonnalite'));

  // Pages détaillées : articles de l'éditeur avancé reliés à une section du site
  const SECTIONS_PAGES = ['histoire', 'architecture', 'traditions', 'gastronomie', 'artisanat_local', 'personnalites', 'infos_pratiques', 'referencesHistoriques'];
  router.get('/:id/pages', optionalAuth, validateId(), patrimoineController.wrap('pagesDetaillees'));
  // Fil d'un article : lieux (et sections) et personnalités auxquels il est relié
  router.get('/article-contexte/:idOeuvre', validateId('idOeuvre'), patrimoineController.wrap('contexteArticle'));
  router.post('/:id/pages', authenticate, requireModerationOuPro, validateId(),
    [
      body('id_oeuvre').isInt({ min: 1 }).withMessage('Article invalide'),
      body('section_patrimoine').isIn(SECTIONS_PAGES).withMessage('Section invalide')
    ],
    handleValidationErrors,
    patrimoineController.wrap('lierPage'));
  router.delete('/:id/pages/:lieuOeuvreId', authenticate, validateId(), patrimoineController.wrap('retirerPage'));

  // ============================================================================
  // MONUMENTS — ajout / suppression depuis la fiche enrichissement
  // ============================================================================

  router.post('/:id/monuments', authenticate, validateId(),
    [
      body('nom').isObject().withMessage('nom doit être un objet multilingue {fr, ar, en}'),
      body('type').isIn(MONUMENT_TYPES).withMessage('Type de monument invalide'),
      body('description').optional().isObject(),
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const lieuId = parseInt(req.params.id);
        const { nom, type, description } = req.body;

        const lieu = await models.Lieu.findByPk(lieuId, { attributes: ['id_lieu'] });
        if (!lieu) return res.status(404).json({ success: false, error: 'Site non trouvé' });

        let detail = await models.DetailLieu.findOne({ where: { id_lieu: lieuId } });
        if (!detail) {
          detail = await models.DetailLieu.create({
            id_lieu: lieuId,
            id_dernier_contributeur: req.user?.id_user || null,
            date_derniere_contribution: new Date(),
            nb_contributions: 1
          });
        }

        const monument = await models.Monument.create({
          id_detail_lieu: detail.id_detailLieu,
          nom,
          description: description || {},
          type
        });

        res.status(201).json({ success: true, data: monument });
      } catch (error) {
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  router.delete('/:id/monuments/:monumentId', authenticate, requireModeration, validateId(), async (req, res) => {
    try {
      const lieuId = parseInt(req.params.id);
      const monumentId = parseInt(req.params.monumentId);
      if (isNaN(monumentId)) return res.status(400).json({ success: false, error: 'Identifiant invalide' });

      const monument = await models.Monument.findOne({
        where: { id: monumentId },
        include: [{ model: models.DetailLieu, where: { id_lieu: lieuId }, required: true, attributes: [] }]
      });
      if (!monument) return res.status(404).json({ success: false, error: 'Monument non trouvé' });

      await monument.destroy();
      res.json({ success: true, message: 'Monument supprimé' });
    } catch (error) {
      logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.patch('/:id/monuments/:monumentId', authenticate, validateId(),
    [
      body('nom').optional().isObject(),
      body('type').optional().isIn(MONUMENT_TYPES),
      body('description').optional().isObject(),
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const lieuId = parseInt(req.params.id);
        const monumentId = parseInt(req.params.monumentId);
        if (isNaN(monumentId)) return res.status(400).json({ success: false, error: 'Identifiant invalide' });

        const monument = await models.Monument.findOne({
          where: { id: monumentId },
          include: [{ model: models.DetailLieu, where: { id_lieu: lieuId }, required: true, attributes: [] }]
        });
        if (!monument) return res.status(404).json({ success: false, error: 'Monument non trouvé' });

        const { nom, type, description } = req.body;
        if (nom !== undefined) monument.nom = nom;
        if (type !== undefined) monument.type = type;
        if (description !== undefined) monument.description = description;
        await monument.save();

        res.json({ success: true, data: monument });
      } catch (error) {
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  // ============================================================================
  // VESTIGES — ajout / suppression depuis la fiche enrichissement
  // ============================================================================

  router.post('/:id/vestiges', authenticate, validateId(),
    [
      body('nom').isObject().withMessage('nom doit être un objet multilingue {fr, ar, en}'),
      body('type').isIn(VESTIGE_TYPES).withMessage('Type de vestige invalide'),
      body('description').optional().isObject(),
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const lieuId = parseInt(req.params.id);
        const { nom, type, description } = req.body;

        const lieu = await models.Lieu.findByPk(lieuId, { attributes: ['id_lieu'] });
        if (!lieu) return res.status(404).json({ success: false, error: 'Site non trouvé' });

        let detail = await models.DetailLieu.findOne({ where: { id_lieu: lieuId } });
        if (!detail) {
          detail = await models.DetailLieu.create({
            id_lieu: lieuId,
            id_dernier_contributeur: req.user?.id_user || null,
            date_derniere_contribution: new Date(),
            nb_contributions: 1
          });
        }

        const vestige = await models.Vestige.create({
          id_detail_lieu: detail.id_detailLieu,
          nom,
          description: description || {},
          type
        });

        res.status(201).json({ success: true, data: vestige });
      } catch (error) {
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  router.delete('/:id/vestiges/:vestigeId', authenticate, requireModeration, validateId(), async (req, res) => {
    try {
      const lieuId = parseInt(req.params.id);
      const vestigeId = parseInt(req.params.vestigeId);
      if (isNaN(vestigeId)) return res.status(400).json({ success: false, error: 'Identifiant invalide' });

      const vestige = await models.Vestige.findOne({
        where: { id: vestigeId },
        include: [{ model: models.DetailLieu, where: { id_lieu: lieuId }, required: true, attributes: [] }]
      });
      if (!vestige) return res.status(404).json({ success: false, error: 'Vestige non trouvé' });

      await vestige.destroy();
      res.json({ success: true, message: 'Vestige supprimé' });
    } catch (error) {
      logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.patch('/:id/vestiges/:vestigeId', authenticate, validateId(),
    [
      body('nom').optional().isObject(),
      body('type').optional().isIn(VESTIGE_TYPES),
      body('description').optional().isObject(),
    ],
    handleValidationErrors,
    async (req, res) => {
      try {
        const lieuId = parseInt(req.params.id);
        const vestigeId = parseInt(req.params.vestigeId);
        if (isNaN(vestigeId)) return res.status(400).json({ success: false, error: 'Identifiant invalide' });

        const vestige = await models.Vestige.findOne({
          where: { id: vestigeId },
          include: [{ model: models.DetailLieu, where: { id_lieu: lieuId }, required: true, attributes: [] }]
        });
        if (!vestige) return res.status(404).json({ success: false, error: 'Vestige non trouvé' });

        const { nom, type, description } = req.body;
        if (nom !== undefined) vestige.nom = nom;
        if (type !== undefined) vestige.type = type;
        if (description !== undefined) vestige.description = description;
        await vestige.save();

        res.json({ success: true, data: vestige });
      } catch (error) {
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  // Articles patrimoine (blocs éditeur riche liés à un lieu + section)
  router.get('/:id/articles', validateId(), async (req, res) => {
    try {
      const { section } = req.query;
      const where = { id_article: parseInt(req.params.id), article_type: 'patrimoine', visible: true };
      if (section) where.section_patrimoine = section;

      // models déjà disponible via initPatrimoineRoutes(models, ...)
      const blocks = await models.ArticleBlock.findAll({
        where,
        order: [['section_patrimoine', 'ASC'], ['ordre', 'ASC']],
        include: [{ model: models.Media, as: 'media', required: false }]
      });

      res.json({ success: true, data: blocks });
    } catch (error) {
      logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // Articles : modération et professionnels validés (comme la modification du site)
  router.post('/:id/articles', authenticate, requireModerationOuPro, validateId(),
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

        const lieu = await models.Lieu.findByPk(lieuId, { attributes: ['id_lieu'] });
        if (!lieu) return res.status(404).json({ success: false, error: 'Site patrimoine non trouvé' });

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
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  router.delete('/:id/articles/:blockId', authenticate, requireModeration, validateId(),
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
        logger.error('patrimoineRoutes error', { message: error.message, stack: error.stack });
      res.status(500).json({ success: false, error: 'Internal server error' });
      }
    }
  );

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/admin/stats', authenticate, requireRole(['Admin']), patrimoineController.wrap('getStats'));
  // Création de site (admin, modérateur ET professionnels validés)
  router.post('/', authenticate, requireValidatedProfessional,
    createContentLimiter,
    validateStringLengths,
    validateGPS,
    [
      body('nom').notEmpty().withMessage('Le nom est requis'),
      body('typePatrimoine').optional().isIn(['ville_village', 'monument', 'musee', 'site_archeologique', 'site_naturel', 'edifice_religieux', 'palais_forteresse', 'autre']).withMessage('Type de patrimoine invalide'),
      body('communeId').optional().isInt({ min: 1 }).withMessage('Commune invalide'),
      body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
      body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
      body('id_lieu_parent').optional({ values: 'null' }).isInt({ min: 1 }).withMessage('Site parent invalide'),
      body('ordre_visite').optional({ values: 'null' }).isInt({ min: 0, max: 10000 }).withMessage('Ordre de visite invalide'),
      body('repere').optional({ values: 'null' }).isObject().withMessage('repere doit être un objet multilingue'),
    ],
    handleValidationErrors,
    patrimoineController.wrap('create'));
  router.put('/:id', authenticate, requireModerationOuPro, validateId(),
    validateStringLengths,
    validateGPS,
    patrimoineController.wrap('update'));
  router.delete('/:id', authenticate, requireRole(['Admin']), validateId(), patrimoineController.wrap('delete'));

  return router;
};

module.exports = initPatrimoineRoutes;
