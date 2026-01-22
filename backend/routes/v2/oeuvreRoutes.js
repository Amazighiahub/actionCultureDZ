/**
 * Routes v2 pour les œuvres
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const router = express.Router();
const oeuvreController = require('../../controllers/v2/OeuvreControllerV2');
const { authenticate, requireRole } = require('../../middlewares/authMiddleware');

// ============================================================================
// ROUTES PUBLIQUES
// ============================================================================

// Liste des œuvres publiées
router.get('/', (req, res) => oeuvreController.list(req, res));

// Recherche avancée
router.get('/search', (req, res) => oeuvreController.search(req, res));

// Œuvres populaires
router.get('/popular', (req, res) => oeuvreController.getPopular(req, res));

// Œuvres récentes
router.get('/recent', (req, res) => oeuvreController.getRecent(req, res));

// Détails d'une œuvre
router.get('/:id', (req, res) => oeuvreController.getById(req, res));

// Œuvres similaires
router.get('/:id/similar', (req, res) => oeuvreController.getSimilar(req, res));

// ============================================================================
// ROUTES AUTHENTIFIÉES (CRÉATEURS)
// ============================================================================

// Mes œuvres
router.get('/my/list', authenticate, (req, res) => oeuvreController.getMyOeuvres(req, res));

// Créer une œuvre
router.post('/', authenticate, (req, res) => oeuvreController.create(req, res));

// Modifier une œuvre
router.put('/:id', authenticate, (req, res) => oeuvreController.update(req, res));

// Supprimer une œuvre
router.delete('/:id', authenticate, (req, res) => oeuvreController.delete(req, res));

// Soumettre pour validation
router.post('/:id/submit', authenticate, (req, res) => oeuvreController.submit(req, res));

// ============================================================================
// ROUTES ADMIN
// ============================================================================

// Toutes les œuvres (admin)
router.get('/admin/all', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.listAll(req, res));

// Œuvres en attente
router.get('/admin/pending', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.getPending(req, res));

// Statistiques
router.get('/admin/stats', authenticate, requireRole(['Admin']), (req, res) => oeuvreController.getStats(req, res));

// Valider une œuvre
router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.validate(req, res));

// Refuser une œuvre
router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => oeuvreController.reject(req, res));

// Mettre en avant
router.post('/:id/feature', authenticate, requireRole(['Admin']), (req, res) => oeuvreController.setFeatured(req, res));

module.exports = router;
