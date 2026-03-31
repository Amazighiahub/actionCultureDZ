/**
 * Subtypes - Point d'entrée
 *
 * Initialise et enregistre tous les sub-services dans le registre centralisé.
 */

const subtypeRegistry = require('./subtypeRegistry');
const LivreSubService = require('./livreSubService');
const FilmSubService = require('./filmSubService');
const AlbumMusicalSubService = require('./albumMusicalSubService');
const ArticleSubService = require('./articleSubService');
const ArticleScientifiqueSubService = require('./articleScientifiqueSubService');
const OeuvreArtSubService = require('./oeuvreArtSubService');
const ArtisanatSubService = require('./artisanatSubService');

/**
 * Initialise les sub-services avec les modèles Sequelize et les enregistre dans le registre.
 * À appeler une seule fois au démarrage (dans le ServiceContainer ou à l'init de OeuvreService).
 *
 * @param {object} models - Modèles Sequelize
 */
function initSubtypeServices(models) {
  const livre = new LivreSubService(models);
  const film = new FilmSubService(models);
  const albumMusical = new AlbumMusicalSubService(models);
  const article = new ArticleSubService(models);
  const articleScientifique = new ArticleScientifiqueSubService(models);
  const oeuvreArt = new OeuvreArtSubService(models);
  const artisanat = new ArtisanatSubService(models);

  subtypeRegistry.registerService(1, livre);
  subtypeRegistry.registerService(2, film);
  subtypeRegistry.registerService(3, albumMusical);
  subtypeRegistry.registerService(4, article);
  subtypeRegistry.registerService(5, articleScientifique);
  subtypeRegistry.registerService(6, oeuvreArt);   // Œuvre d'Art
  subtypeRegistry.registerService(7, artisanat);   // Artisanat
}

module.exports = {
  subtypeRegistry,
  initSubtypeServices,
  LivreSubService,
  FilmSubService,
  AlbumMusicalSubService,
  ArticleSubService,
  ArticleScientifiqueSubService,
  OeuvreArtSubService,
  ArtisanatSubService
};
