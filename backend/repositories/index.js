/**
 * Repositories - Point d'entrée
 * Pattern Repository pour abstraction de la couche données
 */

const BaseRepository = require('./BaseRepository');
const UserRepository = require('./UserRepository');
const OeuvreRepository = require('./OeuvreRepository');

/**
 * Factory pour créer tous les repositories
 * @param {Object} models - Modèles Sequelize
 */
function createRepositories(models) {
  return {
    user: new UserRepository(models),
    oeuvre: new OeuvreRepository(models),
    // Repositories de base pour les autres modèles
    evenement: models.Evenement ? new BaseRepository(models.Evenement) : null,
    patrimoine: models.Patrimoine ? new BaseRepository(models.Patrimoine) : null,
    artisanat: models.Artisanat ? new BaseRepository(models.Artisanat) : null,
    lieu: models.Lieu ? new BaseRepository(models.Lieu) : null,
    categorie: models.Categorie ? new BaseRepository(models.Categorie) : null,
    commentaire: models.Commentaire ? new BaseRepository(models.Commentaire) : null,
    programme: models.Programme ? new BaseRepository(models.Programme) : null,
    media: models.Media ? new BaseRepository(models.Media) : null
  };
}

module.exports = {
  createRepositories,
  BaseRepository,
  UserRepository,
  OeuvreRepository
};
