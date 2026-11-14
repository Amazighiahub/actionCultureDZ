/**
 * Routes pour les événements
 * Utilise le pattern Controller → Service → Repository
 */

const express = require('express');
const { publicHttpCache, invalidateCache } = require('../middlewares/cacheMiddleware');
const { param, body } = require('express-validator');
const evenementController = require('../controllers/evenementController');
const { handleValidationErrors, validateId, validatePagination, validateEventCreation, validateStringLengths } = require('../middlewares/validationMiddleware');
const { createContentLimiter, importLimiter, pdfLimiter } = require('../middlewares/rateLimitMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const uploadService = require('../services/uploadService');
const { uploadClasseurXlsx } = require('../middlewares/uploadClasseur');
const { msg } = require('../utils/messageValidation');

const initEvenementRoutes = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, optionalAuth, requireRole, requireValidatedProfessional, requireVerifiedEmail } = authMiddleware;

  // Cache HTTP pour les listes publiques (données changent toutes les ~2 min)
  const cachePublic = publicHttpCache(120);

  // ============================================================================
  // ROUTES PUBLIQUES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/', cachePublic, asyncHandler((req, res) => evenementController.list(req, res)));
  router.get('/upcoming', cachePublic, asyncHandler((req, res) => {
    req.query.upcoming = 'true';
    evenementController.list(req, res);
  }));
  router.get('/statistics', cachePublic, asyncHandler((req, res) => evenementController.getPublicStats(req, res)));
  router.get('/search', cachePublic, asyncHandler((req, res) => evenementController.search(req, res)));
  router.get('/wilaya/:wilayaId', cachePublic, asyncHandler((req, res) => evenementController.getByWilaya(req, res)));
  router.get('/oeuvre/:oeuvreId', cachePublic, asyncHandler((req, res) => evenementController.getByOeuvre(req, res)));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/my/list', authenticate, asyncHandler((req, res) => evenementController.getMyEvenements(req, res)));

  // ============================================================================
  // ROUTES ADMIN (specific paths BEFORE :id catch-all)
  // ============================================================================

  router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => evenementController.listAll(req, res)));
  router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), asyncHandler((req, res) => evenementController.getPending(req, res)));
  router.get('/admin/stats', authenticate, requireRole(['Admin']), asyncHandler((req, res) => evenementController.getStats(req, res)));

  // ============================================================================
  // ROUTES AVEC :id
  // ============================================================================

  router.get('/:id/qrcode', cachePublic, validateId(), asyncHandler((req, res) => evenementController.getQRCode(req, res)));
  router.get('/:id/medias', optionalAuth, validateId(), asyncHandler((req, res) => evenementController.getMedias(req, res)));
  router.get('/:id/share-data', optionalAuth, validateId(), asyncHandler((req, res) => evenementController.getShareData(req, res)));
  router.get('/:id/participants/public', cachePublic, validateId(), asyncHandler((req, res) => evenementController.getPublicParticipants(req, res)));
  router.get('/:id/participants', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => evenementController.getParticipants(req, res)));
  router.get('/:id/professionnels/en-attente', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => evenementController.getProfessionnelsEnAttente(req, res)));
  router.get('/:id/mes-oeuvres', authenticate, validateId(), asyncHandler((req, res) => evenementController.getMesOeuvres(req, res)));
  router.get('/:id/articles-a-rattacher', authenticate, validateId(), asyncHandler((req, res) => evenementController.articlesARattacher(req, res)));
  router.get('/:id/mon-inscription', authenticate, validateId(), asyncHandler((req, res) => evenementController.getMyRegistration(req, res)));
  router.get('/:id/export', authenticate, validateId(), asyncHandler((req, res) => evenementController.exportEvent(req, res)));
  router.get('/:id', optionalAuth, validateId(), asyncHandler((req, res) => evenementController.getById(req, res)));

  router.post('/', authenticate,
    requireVerifiedEmail,
    requireValidatedProfessional,
    createContentLimiter,
    // Affiche et, facultative, image de partage (aperçu Facebook, WhatsApp… ; carrée de préférence)
    uploadService.uploadImage().fields([{ name: 'affiche', maxCount: 1 }, { name: 'image_partage', maxCount: 1 }]),
    validateStringLengths,
    [
      body('nom_evenement').optional().isLength({ min: 2, max: 1500 }).withMessage(msg('validation.nomEvenementInvalide')),
      body('nom').optional().isLength({ min: 2, max: 500 }).withMessage(msg('validation.invalidName')),
      body('date_debut').optional().isISO8601().withMessage(msg('validation.invalidStartDate')),
      body('date_fin').optional().isISO8601().withMessage(msg('validation.invalidEndDate')),
      body('capacite_max').optional().isInt({ min: 1 }).withMessage(msg('validation.capaciteInvalide')),
      body('tarif').optional().isFloat({ min: 0 }).withMessage(msg('validation.tarifPositif')),
    ],
    handleValidationErrors,
    validateEventCreation,
    asyncHandler((req, res) => evenementController.create(req, res)));
  router.put('/:id', authenticate,
    requireVerifiedEmail,
    requireValidatedProfessional,
    validateId(),
    // Affiche et, facultative, image de partage (aperçu Facebook, WhatsApp… ; carrée de préférence)
    uploadService.uploadImage().fields([{ name: 'affiche', maxCount: 1 }, { name: 'image_partage', maxCount: 1 }]),
    validateStringLengths,
    validateEventCreation,
    asyncHandler((req, res) => evenementController.update(req, res)));
  router.delete('/:id', authenticate, requireVerifiedEmail, requireValidatedProfessional, validateId(), asyncHandler((req, res) => evenementController.delete(req, res)));

  // Inscription
  router.post('/:id/register', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => evenementController.register(req, res)));
  router.delete('/:id/register', authenticate, requireVerifiedEmail, validateId(), asyncHandler((req, res) => evenementController.unregister(req, res)));

  // Oeuvres dans un événement
  router.post('/:id/oeuvres', authenticate, validateId(), asyncHandler((req, res) => evenementController.addOeuvre(req, res)));
  // /reorder avant /:oeuvreId : sinon « reorder » était lu comme un numéro d'œuvre (400 à chaque fois)
  router.put('/:id/oeuvres/reorder', authenticate, validateId(), asyncHandler((req, res) => evenementController.reorderOeuvres(req, res)));
  router.put('/:id/oeuvres/:oeuvreId', authenticate, validateId(), validateId('oeuvreId'), asyncHandler((req, res) => evenementController.updateOeuvre(req, res)));
  router.delete('/:id/oeuvres/:oeuvreId', authenticate, validateId(), validateId('oeuvreId'), asyncHandler((req, res) => evenementController.removeOeuvre(req, res)));

  // Liste d'inscriptions (Excel d'un formulaire en ligne) : aperçu, puis import (organisateur ou admin)
  router.post('/:id/participants/import/apercu', authenticate, requireVerifiedEmail, importLimiter, validateId(), ...uploadClasseurXlsx,
    asyncHandler((req, res) => evenementController.apercuImportInscriptions(req, res)));
  router.post('/:id/participants/import', authenticate, requireVerifiedEmail, importLimiter, validateId(), ...uploadClasseurXlsx,
    invalidateCache([req => `/evenements/${req.params.id}/participants`]),
    asyncHandler((req, res) => evenementController.importerInscriptions(req, res)));

  // Profil d'un participant corrigé par l'organisateur (choix de « Vous êtes »), montant recalculé
  router.get('/:id/participants/profils', authenticate, validateId(),
    asyncHandler((req, res) => evenementController.getProfilsParticipants(req, res)));
  router.put('/:id/participants/:userId/profil', authenticate, requireVerifiedEmail, validateId(), validateId('userId'),
    invalidateCache([req => `/evenements/${req.params.id}/participants`]),
    asyncHandler((req, res) => evenementController.changerProfilParticipant(req, res)));

  // Messages de l'organisateur à ses participants (changement de programme, PDF, WhatsApp, Drive…)
  router.get('/:id/participants/messages', authenticate, validateId(),
    asyncHandler((req, res) => evenementController.listerMessagesParticipants(req, res)));
  router.post('/:id/participants/messages', authenticate, requireVerifiedEmail, createContentLimiter, validateId(),
    asyncHandler((req, res) => evenementController.envoyerMessageParticipants(req, res)));
  // Documents PDF de l'événement (programme complet, présentation…) : liste et téléchargement publics,
  // ajout et retrait par l'organisateur ou l'administration
  router.get('/:id/documents', optionalAuth, validateId(),
    asyncHandler((req, res) => evenementController.listerDocuments(req, res)));
  router.get('/:id/documents/:idMedia/document.pdf', pdfLimiter, optionalAuth, validateId(), validateId('idMedia'),
    asyncHandler((req, res) => evenementController.telechargerDocument(req, res)));
  router.post('/:id/documents', authenticate, requireVerifiedEmail, createContentLimiter, validateId(),
    asyncHandler((req, res) => evenementController.ajouterDocument(req, res)));
  router.delete('/:id/documents/:idMedia', authenticate, requireVerifiedEmail, validateId(), validateId('idMedia'),
    asyncHandler((req, res) => evenementController.retirerDocument(req, res)));
  // Photos de l'événement (galerie publique via GET /:id/medias) : ajout et retrait par l'organisateur
  router.post('/:id/photos', authenticate, requireVerifiedEmail, createContentLimiter, validateId(),
    asyncHandler((req, res) => evenementController.ajouterPhoto(req, res)));
  router.delete('/:id/photos/:idMedia', authenticate, requireVerifiedEmail, validateId(), validateId('idMedia'),
    asyncHandler((req, res) => evenementController.retirerPhoto(req, res)));

  // Programme en PDF joint à un message (ouvert depuis l'email ou la notification, sans connexion)
  router.get('/:id/messages/:idMessage/programme.pdf', pdfLimiter, validateId(), validateId('idMessage'),
    asyncHandler((req, res) => evenementController.programmeMessage(req, res)));

  // Même e-mail, en une fois, à tous les participants qui n'ont pas fini
  router.post('/:id/participants/invitations', authenticate, requireVerifiedEmail, createContentLimiter, validateId(),
    asyncHandler((req, res) => evenementController.renvoyerInvitations(req, res)));

  // Email « Choisir mon mot de passe » renvoyé à un participant qui ne l'a pas encore fait
  router.post('/:id/participants/:userId/invitation', authenticate, requireVerifiedEmail, createContentLimiter, validateId(), validateId('userId'),
    asyncHandler((req, res) => evenementController.renvoyerInvitation(req, res)));

  // Participants validation (owner ou admin)
  router.put('/:id/participants/:userId/validate', authenticate, requireVerifiedEmail, validateId(), validateId('userId'),
    invalidateCache([req => `/evenements/${req.params.id}/participants`]), asyncHandler((req, res) => evenementController.validateParticipation(req, res)));

  // Cancel (owner or admin)
  router.post('/:id/cancel', authenticate, validateId(), asyncHandler((req, res) => evenementController.cancel(req, res)));

  // Publish (admin)
  router.post('/:id/publish', authenticate, requireRole(['Admin', 'Moderateur']), validateId(), asyncHandler((req, res) => evenementController.publish(req, res)));

  return router;
};

module.exports = initEvenementRoutes;
