/**
 * UserController - Facade retro-compatible (DEPRECATED)
 *
 * La logique a ete eclatee en 4 sous-controllers :
 *   - authController         (auth + cycle de vie token)
 *   - userProfileController  (profil utilisateur, preferences, pro)
 *   - userAdminController    (CRUD admin, moderation, i18n)
 *   - gdprController         (droits RGPD art. 17/20)
 *
 * Ce fichier ne sert qu'a preserver la compatibilite avec :
 *   - les tests existants (backend/tests/unit/userController.test.js)
 *   - un eventuel import direct hors userRoutes.
 *
 * Les routes (userRoutes.js) pointent desormais directement sur les
 * sous-controllers. Cette facade peut etre supprimee dans un lot
 * dedie une fois les tests migres.
 */

const authController = require('./authController');
const userProfileController = require('./userProfileController');
const userAdminController = require('./userAdminController');
const gdprController = require('./gdprController');

// Table de delegation : chaque methode est reliee a son controller cible.
// L'ordre ici est purement documentaire.
const DELEGATIONS = [
  // authController
  ['register',             authController],
  ['login',                authController],
  ['logout',               authController],
  ['refreshToken',         authController],
  ['checkEmail',           authController],
  ['verifyEmail',          authController],
  ['getTypes',             authController],

  // userProfileController
  ['getProfile',           userProfileController],
  ['updateProfile',        userProfileController],
  ['changePassword',       userProfileController],
  ['updateProfilePhoto',   userProfileController],
  ['removeProfilePhoto',   userProfileController],
  ['updatePreferences',    userProfileController],
  ['updatePrivacy',        userProfileController],
  ['submitProfessional',   userProfileController],
  ['getProfessionalStatus', userProfileController],
  ['getProfessionals',     userProfileController],

  // userAdminController
  ['list',                 userAdminController],
  ['getById',              userAdminController],
  ['update',               userAdminController],
  ['delete',               userAdminController],
  ['search',               userAdminController],
  ['getStats',             userAdminController],
  ['getPending',           userAdminController],
  ['validate',             userAdminController],
  ['reject',               userAdminController],
  ['suspend',              userAdminController],
  ['reactivate',           userAdminController],
  ['getUserTranslations',  userAdminController],
  ['updateUserTranslation', userAdminController],

  // gdprController
  ['deleteMyAccount',      gdprController],
  ['exportMyData',         gdprController],
];

const facade = {};
for (const [method, target] of DELEGATIONS) {
  facade[method] = target[method].bind(target);
}

module.exports = facade;
