/**
 * Repositories - Point d'entrée
 * Pattern Repository pour abstraction de la couche données
 */

const BaseRepository = require('./baseRepository');
const UserRepository = require('./userRepository');
const OeuvreRepository = require('./oeuvreRepository');
const EvenementRepository = require('./evenementRepository');
const PatrimoineRepository = require('./patrimoineRepository');
const ArtisanatRepository = require('./artisanatRepository');
const ServiceRepository = require('./serviceRepository');
const ParcoursRepository = require('./parcoursRepository');
const SignalementRepository = require('./signalementRepository');
const NotificationRepository = require('./notificationRepository');

/**
 * Factory pour créer tous les repositories
 * @param {Object} models - Modèles Sequelize
 */
function createRepositories(models) {
  return {
    user: new UserRepository(models),
    oeuvre: new OeuvreRepository(models),
    evenement: models.Evenement ? new EvenementRepository(models) : null,
    patrimoine: models.Lieu ? new PatrimoineRepository(models) : null,
    artisanat: models.Artisanat ? new ArtisanatRepository(models) : null,
    service: models.Service ? new ServiceRepository(models) : null,
    parcours: models.Parcours ? new ParcoursRepository(models) : null,
    signalement: models.Signalement ? new SignalementRepository(models) : null,
    notification: models.Notification ? new NotificationRepository(models) : null,
    // Repositories de base pour les modèles utilitaires
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
  OeuvreRepository,
  EvenementRepository,
  PatrimoineRepository,
  ArtisanatRepository,
  ServiceRepository,
  ParcoursRepository,
  SignalementRepository,
  NotificationRepository
};
