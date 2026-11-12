/**
 * Erreurs de la base (Sequelize) en réponse claire : donnée refusée (400), valeur déjà utilisée (409),
 * élément lié introuvable (400). Partagé par errorMiddleware et BaseController._handleError : avant,
 * les contrôleurs à try/catch renvoyaient 500 « Erreur serveur » pour ces cas (audit V11 COD-B12).
 */
const { messageValidationBase, MESSAGE_REFERENCE } = require('./appError');

/** { statusCode, corps } pour une erreur Sequelize connue, sinon null */
function reponseErreurSequelize(error, isProduction = process.env.NODE_ENV === 'production') {
  if (error?.name === 'SequelizeValidationError') {
    // Texte de Sequelize en anglais avec noms de modèle et de colonne (« notNull Violation: Evenement.nom… ») :
    // une phrase courte à la place ; le champ reste dans « field » pour placer l'erreur sous le bon champ
    const details = (error.errors || []).map(err => ({
      field: err.path,
      message: messageValidationBase(err),
      ...(isProduction ? {} : { value: err.value })
    }));
    return { statusCode: 400, corps: { success: false, error: 'Données invalides', code: 'DB_VALIDATION_ERROR', details } };
  }
  if (error?.name === 'SequelizeUniqueConstraintError') {
    const details = (error.errors || []).map(err => ({
      field: err.path,
      message: 'Cette valeur est déjà utilisée',
      ...(isProduction ? {} : { value: err.value })
    }));
    return { statusCode: 409, corps: { success: false, error: 'Cette ressource existe déjà', code: 'UNIQUE_CONSTRAINT', details } };
  }
  if (error?.name === 'SequelizeForeignKeyConstraintError') {
    return { statusCode: 400, corps: { success: false, error: MESSAGE_REFERENCE, code: 'FK_CONSTRAINT' } };
  }
  return null;
}

module.exports = { reponseErreurSequelize };
