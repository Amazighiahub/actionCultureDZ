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
const { body } = require('express-validator');
const { aUnTexte } = require('../helpers/i18n');
const patrimoineController = require('../controllers/patrimoineController');
const { handleValidationErrors, validateId, validateStringLengths, validateGPS } = require('../middlewares/validationMiddleware');
const { createContentLimiter } = require('../middlewares/rateLimitMiddleware');

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

  router.get('/:id/intervenants', validateId(), patrimoineController.wrap('personnalites'));

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

  // Historique des textes du lieu, et retour à une version précédente (administration)
  router.get('/:id/historique', authenticate, requireModeration, validateId(), patrimoineController.wrap('historique'));
  router.post('/:id/historique/:idHistorique/restaurer', authenticate, requireModeration, validateId(), validateId('idHistorique'),
    patrimoineController.wrap('restaurerVersion'));

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
    patrimoineController.wrap('rattacherPersonnalite'));

  // Retirer une personnalité : modération, contributeur qui l'a rattachée ou créateur du site
  router.delete('/:id/intervenants/:lieuIntervenantId', authenticate, validateId(), validateId('lieuIntervenantId'),
    patrimoineController.wrap('retirerPersonnalite'));

  // Nouvelle personnalité (fiche + rattachement) : professionnels validés et modération
  router.post('/:id/personnalites', authenticate, requireModerationOuPro, validateId(),
    [
      body('nom').custom(v => aUnTexte(v)).withMessage('Le nom est requis'),
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
  // MONUMENTS ET VESTIGES — ajout / modification depuis la fiche enrichissement,
  // suppression par la modération
  // ============================================================================

  const champsElement = (types, creation) => [
    creation
      ? body('nom').isObject().custom(v => aUnTexte(v)).withMessage('Écrivez le nom, dans au moins une langue')
      : body('nom').optional().isObject(),
    creation ? body('type').isIn(types).withMessage('Type invalide') : body('type').optional().isIn(types),
    body('description').optional().isObject(),
  ];
  for (const [chemin, genre, types] of [['monuments', 'monument', MONUMENT_TYPES], ['vestiges', 'vestige', VESTIGE_TYPES]]) {
    const avecGenre = (req, res, next) => { req.genreElement = genre; next(); };
    router.post(`/:id/${chemin}`, authenticate, validateId(), champsElement(types, true), handleValidationErrors,
      avecGenre, patrimoineController.wrap('ajouterElement'));
    router.patch(`/:id/${chemin}/:idElement`, authenticate, validateId(), validateId('idElement'), champsElement(types, false),
      handleValidationErrors, avecGenre, patrimoineController.wrap('modifierElement'));
    router.delete(`/:id/${chemin}/:idElement`, authenticate, requireModeration, validateId(), validateId('idElement'),
      avecGenre, patrimoineController.wrap('supprimerElement'));
  }

  // Articles patrimoine (blocs éditeur riche liés à un lieu + section)
  router.get('/:id/articles', validateId(), patrimoineController.wrap('blocs'));

  // Articles : modération et professionnels validés (comme la modification du site)
  router.post('/:id/articles', authenticate, requireModerationOuPro, validateId(),
    [
      body('type_block').isIn(['text', 'heading', 'image', 'video', 'citation', 'code', 'list', 'table', 'separator', 'embed']).withMessage('Type de bloc invalide'),
      body('section_patrimoine').isIn(['histoire', 'architecture', 'traditions', 'gastronomie', 'artisanat_local', 'personnalites', 'infos_pratiques', 'referencesHistoriques']).withMessage('Section invalide'),
      body('contenu').optional().isLength({ max: 10000 }).withMessage('Contenu trop long'),
    ],
    handleValidationErrors,
    patrimoineController.wrap('ajouterBloc'));

  router.delete('/:id/articles/:blockId', authenticate, requireModeration, validateId(), validateId('blockId'),
    patrimoineController.wrap('supprimerBloc'));

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
