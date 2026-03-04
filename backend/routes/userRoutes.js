/**
 * Routes v2 pour les utilisateurs
 * Utilise le nouveau pattern Controller → Service → Repository
 */

const express = require('express');
const userController = require('../controllers/userController');

const initUserRoutesV2 = (models, authMiddleware) => {
  const router = express.Router();
  const { authenticate, requireRole } = authMiddleware;

  // ============================================================================
  // ROUTES PUBLIQUES
  // ============================================================================

  router.post('/register', (req, res) => userController.register(req, res));
  router.post('/login', (req, res) => userController.login(req, res));
  router.post('/refresh-token', (req, res) => userController.refreshToken(req, res));
  router.post('/check-email', (req, res) => userController.checkEmail(req, res));
  router.post('/verify-email/:token', (req, res) => userController.verifyEmail(req, res));
  router.get('/types', (req, res) => userController.getTypes(req, res));
  router.get('/professionals', (req, res) => userController.getProfessionals(req, res));

  // ============================================================================
  // ROUTES AUTHENTIFIÉES
  // ============================================================================

  router.post('/logout', authenticate, (req, res) => userController.logout(req, res));
  router.get('/profile', authenticate, (req, res) => userController.getProfile(req, res));
  router.put('/profile', authenticate, (req, res) => userController.updateProfile(req, res));
  router.patch('/profile/photo', authenticate, (req, res) => userController.updateProfilePhoto(req, res));
  router.delete('/profile/photo', authenticate, (req, res) => userController.removeProfilePhoto(req, res));
  router.post('/change-password', authenticate, (req, res) => userController.changePassword(req, res));
  router.get('/search', authenticate, (req, res) => userController.search(req, res));

  // ============================================================================
  // ROUTES ADMIN
  // ============================================================================

  router.get('/', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.list(req, res));
  router.get('/stats', authenticate, requireRole(['Admin']), (req, res) => userController.getStats(req, res));
  router.get('/pending', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.getPending(req, res));
  router.get('/:id', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.getById(req, res));
  router.put('/:id', authenticate, requireRole(['Admin']), (req, res) => userController.update(req, res));
  router.delete('/:id', authenticate, requireRole(['Admin']), (req, res) => userController.delete(req, res));

  // Validation/Modération
  router.post('/:id/validate', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.validate(req, res));
  router.post('/:id/reject', authenticate, requireRole(['Admin', 'Moderateur']), (req, res) => userController.reject(req, res));
  router.post('/:id/suspend', authenticate, requireRole(['Admin']), (req, res) => userController.suspend(req, res));
  router.post('/:id/reactivate', authenticate, requireRole(['Admin']), (req, res) => userController.reactivate(req, res));

  // Traductions (admin i18n)
  router.get('/:id/translations', authenticate, requireRole(['Admin']), (req, res) => userController.getUserTranslations(req, res));
  router.patch('/:id/translation/:lang', authenticate, requireRole(['Admin']), (req, res) => userController.updateUserTranslation(req, res));

  return router;
};

module.exports = initUserRoutesV2;
