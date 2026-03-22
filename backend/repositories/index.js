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
const CommentaireRepository = require('./commentaireRepository');
const FavoriRepository = require('./favoriRepository');
const VueRepository = require('./vueRepository');
const ProgrammeRepository = require('./programmeRepository');
const IntervenantRepository = require('./intervenantRepository');
const ArticleBlockRepository = require('./articleBlockRepository');
const LieuRepository = require('./lieuRepository');

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
    commentaire: models.Commentaire ? new CommentaireRepository(models) : null,
    favori: models.Favori ? new FavoriRepository(models) : null,
    vue: models.Vue ? new VueRepository(models) : null,
    programme: models.Programme ? new ProgrammeRepository(models) : null,
    intervenant: models.Intervenant ? new IntervenantRepository(models) : null,
    articleBlock: models.ArticleBlock ? new ArticleBlockRepository(models) : null,
    lieu: models.Lieu ? new LieuRepository(models) : null,
    // Repositories de base pour les modèles utilitaires
    categorie: models.Categorie ? new BaseRepository(models.Categorie) : null,
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
  NotificationRepository,
  CommentaireRepository,
  FavoriRepository,
  VueRepository,
  ProgrammeRepository,
  IntervenantRepository,
  ArticleBlockRepository,
  LieuRepository
};
