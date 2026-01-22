/**
 * Routes v2 pour les utilisateurs
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const router = express.Router();
const userController = require('../../controllers/v2/UserControllerV2');
const { authenticate, requireRole } = require('../../middlewares/authMiddleware');

// ============================================================================
// ROUTES PUBLIQUES
// ============================================================================

// Inscription
router.post('/register', (req, res) => userController.register(req, res));

// Connexion
router.post('/login', (req, res) => userController.login(req, res));

// Liste des professionnels validés (public)
router.get('/professionals', (req, res) => userController.getProfessionals(req, res));

// ============================================================================
// ROUTES AUTHENTIFIÉES
// ============================================================================

// Déconnexion
router.post('/logout', authenticate, (req, res) => userController.logout(req, res));

// Profil de l'utilisateur connecté
router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));
router.put('/profile', authenticate, (req, res) => userController.updateProfile(req, res));

// Changement de mot de passe
router.post('/change-password', authenticate, (req, res) => userController.changePassword(req, res));

// Recherche
router.get('/search', authenticate, (req, res) => userController.search(req, res));

// ============================================================================
// ROUTES ADMIN
// ============================================================================

// Liste des utilisateurs
router.get('/', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.list(req, res));

// Statistiques
router.get('/stats', authenticate, requireRole(['Admin']), (req, res) => userController.getStats(req, res));

// Utilisateurs en attente
router.get('/pending', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.getPending(req, res));

// Récupérer un utilisateur par ID
router.get('/:id', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.getById(req, res));

// Modifier un utilisateur
router.put('/:id', authenticate, requireRole(['Admin']), (req, res) => userController.update(req, res));

// Supprimer un utilisateur
router.delete('/:id', authenticate, requireRole(['Admin']), (req, res) => userController.delete(req, res));

// Validation/Modération
router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.validate(req, res));
router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.reject(req, res));
router.post('/:id/suspend', authenticate, requireRole(['Admin']), (req, res) => userController.suspend(req, res));
router.post('/:id/reactivate', authenticate, requireRole(['Admin']), (req, res) => userController.reactivate(req, res));

module.exports = router;
