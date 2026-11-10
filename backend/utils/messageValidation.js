/**
 * Message de validation traduit, pour express-validator :
 *   body('email').isEmail().withMessage(msg('validation.emailInvalide'))
 *
 * Le texte est choisi au moment de la réponse, dans la langue de la personne (req.t). Avant, 110 messages
 * étaient écrits en français dans les routes et s'affichaient en français sur le site arabe (audit V11
 * FRM-5). Sans req.t (tests, appel hors requête), le français est utilisé.
 */
const { t } = require('../helpers/messages');

const msg = (cle, params) => (_valeur, { req } = {}) =>
  (req && typeof req.t === 'function' ? req.t(cle, params) : t(cle, 'fr', params));

module.exports = { msg };
