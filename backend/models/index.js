// ============================================================================
// backend/models/index.js
// ----------------------------------------------------------------------------
// Point d'entree unique pour les modeles Sequelize et les utilitaires de
// lifecycle (init/reset/seed).
//
// Historique : ce fichier a absorbe l'ancien models/index-original.js (1160
// lignes, 53 KB) pour eliminer la double-indirection et remplacer les ~42
// console.* par logger.* (cf. Audit §3.3 + refactor Q2 2026).
//
// API publique (preservee a l'identique pour compatibilite) :
//   - Tous les modeles (User, Oeuvre, Evenement, ...) comme proprietes
//   - sequelize : instance Sequelize (pour app.js, migrations, queries directes)
//   - Sequelize : classe Sequelize (pour Op, DataTypes, Transaction, ...)
//   - initializeDatabase(config)  : init complet (connect + sync + seed)
//   - resetDatabase(config)       : drop + recreate + seed
//   - loadModels(sequelize)       : charge les modeles sur une instance donnee
//                                   (utilise par les tests, voir tests/setup.js)
//   - initializeAssociations(models) : appelle .associate() sur chaque modele
//   - insertDefaultData(models)   : seeds (langues, genres, categories, ...)
//   - importData(models)          : import geographique Algerie
// ============================================================================

const fs = require('fs');
const path = require('path');
const { createDatabaseConnection } = require('../config/database');
const logger = require('../utils/logger');

// ============================================================================
// 1. loadModelSafely : charge un fichier de modele avec gestion d'erreur
// ============================================================================
//
// Objectif : permettre au backend de demarrer meme si un fichier de modele a
// ete supprime/renomme (on logge un warn et on ignore). Toute autre erreur
// (ex: syntaxe, bad require interne) est relancee pour que le boot crashe
// avec un message clair.
const loadModelSafely = (modelPath, modelName, sequelize) => {
  try {
    const model = require(modelPath)(sequelize);
    logger.debug(`Modele ${modelName} charge`);
    return model;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      logger.warn(`Modele ${modelName} non trouve (${modelPath}) - ignore`);
      return null;
    }
    logger.error(`Erreur lors du chargement de ${modelName}: ${error.message}`);
    throw error;
  }
};

// ============================================================================
// 2. loadModels : charge TOUS les modeles dans l'ordre des dependances FK
// ============================================================================
//
// ORDRE IMPORTANT : les modeles referencants doivent etre charges APRES leurs
// cibles (Sequelize construit les relations via hasMany/belongsTo qui tapent
// dans la registry globale).
const loadModels = (sequelize) => {
  const models = {};
  logger.debug('Chargement des modeles...');

  // 1. Modeles geographiques (referencees par Lieu)
  const wilayaModel = loadModelSafely('./geography/wilaya', 'Wilaya', sequelize);
  if (wilayaModel) models.Wilaya = wilayaModel;

  const dairaModel = loadModelSafely('./geography/daira', 'Daira', sequelize);
  if (dairaModel) models.Daira = dairaModel;

  const communeModel = loadModelSafely('./geography/commune', 'Commune', sequelize);
  if (communeModel) models.Commune = communeModel;

  // TypeUser : apres les modeles de base
  const typeUserModel = loadModelSafely('./classifications/typeUser.js', 'TypeUser', sequelize);
  if (typeUserModel) models.TypeUser = typeUserModel;

  // Tables de liaison pour la hierarchie TypeOeuvre/Genre/Categorie
  const typeOeuvreGenreModel = loadModelSafely('./associations/typeOeuvreGenre', 'TypeOeuvreGenre', sequelize);
  if (typeOeuvreGenreModel) models.TypeOeuvreGenre = typeOeuvreGenreModel;

  const genreCategorieModel = loadModelSafely('./associations/genreCategorie', 'GenreCategorie', sequelize);
  if (genreCategorieModel) models.GenreCategorie = genreCategorieModel;

  const localiteModel = loadModelSafely('./geography/localite', 'Localite', sequelize);
  if (localiteModel) models.Localite = localiteModel;

  const oeuvreIntervenantModel = loadModelSafely('./associations/oeuvreIntervenant', 'OeuvreIntervenant', sequelize);
  if (oeuvreIntervenantModel) models.OeuvreIntervenant = oeuvreIntervenantModel;

  // 2. Modeles de base (User, Role) - referencees par beaucoup d'autres
  const roleModel = loadModelSafely('./users/role', 'Role', sequelize);
  if (roleModel) models.Role = roleModel;

  const userModel = loadModelSafely('./users/user', 'User', sequelize);
  if (userModel) models.User = userModel;

  const userRoleModel = loadModelSafely('./users/userRole', 'UserRole', sequelize);
  if (userRoleModel) models.UserRole = userRoleModel;

  // 3. Modeles de lieux (avant Evenement)
  const lieuModel = loadModelSafely('./places/lieu', 'Lieu', sequelize);
  if (lieuModel) models.Lieu = lieuModel;

  const detailLieuModel = loadModelSafely('./places/detailLieu', 'DetailLieu', sequelize);
  if (detailLieuModel) models.DetailLieu = detailLieuModel;

  const serviceModel = loadModelSafely('./places/service', 'Service', sequelize);
  if (serviceModel) models.Service = serviceModel;

  const lieuMediaModel = loadModelSafely('./places/lieuMedia', 'LieuMedia', sequelize);
  if (lieuMediaModel) models.LieuMedia = lieuMediaModel;

  const monumentModel = loadModelSafely('./places/monument', 'Monument', sequelize);
  if (monumentModel) models.Monument = monumentModel;

  const vestigeModel = loadModelSafely('./places/vestige', 'Vestige', sequelize);
  if (vestigeModel) models.Vestige = vestigeModel;

  // 4. Types et classifications
  const langueModel = loadModelSafely('./classifications/langue', 'Langue', sequelize);
  if (langueModel) models.Langue = langueModel;

  const categorieModel = loadModelSafely('./classifications/categorie', 'Categorie', sequelize);
  if (categorieModel) models.Categorie = categorieModel;

  const genreModel = loadModelSafely('./classifications/genre', 'Genre', sequelize);
  if (genreModel) models.Genre = genreModel;

  const typeOeuvreModel = loadModelSafely('./classifications/typeOeuvre', 'TypeOeuvre', sequelize);
  if (typeOeuvreModel) models.TypeOeuvre = typeOeuvreModel;

  const tagMotCleModel = loadModelSafely('./classifications/tagMotCle', 'TagMotCle', sequelize);
  if (tagMotCleModel) models.TagMotCle = tagMotCleModel;

  const materiauModel = loadModelSafely('./classifications/materiau', 'Materiau', sequelize);
  if (materiauModel) models.Materiau = materiauModel;

  const techniqueModel = loadModelSafely('./classifications/technique', 'Technique', sequelize);
  if (techniqueModel) models.Technique = techniqueModel;

  // 5. Types d'evenements (reference par Evenement)
  const typeEvenementModel = loadModelSafely('./events/typeEvenement', 'TypeEvenement', sequelize);
  if (typeEvenementModel) models.TypeEvenement = typeEvenementModel;

  // 6. Organisations
  const typeOrganisationModel = loadModelSafely('./organisations/typeOrganisation', 'TypeOrganisation', sequelize);
  if (typeOrganisationModel) models.TypeOrganisation = typeOrganisationModel;

  const organisationModel = loadModelSafely('./organisations/organisation', 'Organisation', sequelize);
  if (organisationModel) models.Organisation = organisationModel;

  const editeurModel = loadModelSafely('./organisations/editeur', 'Editeur', sequelize);
  if (editeurModel) models.Editeur = editeurModel;

  // 7. Oeuvres
  const oeuvreModel = loadModelSafely('./oeuvres/oeuvre', 'Oeuvre', sequelize);
  if (oeuvreModel) models.Oeuvre = oeuvreModel;

  const livreModel = loadModelSafely('./oeuvres/livre', 'Livre', sequelize);
  if (livreModel) models.Livre = livreModel;

  const filmModel = loadModelSafely('./oeuvres/film', 'Film', sequelize);
  if (filmModel) models.Film = filmModel;

  const albumMusicalModel = loadModelSafely('./oeuvres/albumMusical', 'AlbumMusical', sequelize);
  if (albumMusicalModel) models.AlbumMusical = albumMusicalModel;

  const articleModel = loadModelSafely('./oeuvres/article', 'Article', sequelize);
  if (articleModel) models.Article = articleModel;

  const articleScientifiqueModel = loadModelSafely('./oeuvres/articleScientifique', 'ArticleScientifique', sequelize);
  if (articleScientifiqueModel) models.ArticleScientifique = articleScientifiqueModel;

  const articleBlockModel = loadModelSafely('./oeuvres/articleBlock', 'ArticleBlock', sequelize);
  if (articleBlockModel) models.ArticleBlock = articleBlockModel;

  const artisanatModel = loadModelSafely('./oeuvres/artisanat', 'Artisanat', sequelize);
  if (artisanatModel) models.Artisanat = artisanatModel;

  const oeuvreArtModel = loadModelSafely('./oeuvres/oeuvreArt', 'OeuvreArt', sequelize);
  if (oeuvreArtModel) models.OeuvreArt = oeuvreArtModel;

  // 8. Specialite et Intervenant (avant Programme et Evenement)
  const specialiteModel = loadModelSafely('./misc/specialite', 'Specialite', sequelize);
  if (specialiteModel) models.Specialite = specialiteModel;

  const intervenantModel = loadModelSafely('./misc/intervenant', 'Intervenant', sequelize);
  if (intervenantModel) models.Intervenant = intervenantModel;

  // 9. Evenements (apres Lieu, User, TypeEvenement)
  const evenementModel = loadModelSafely('./events/evenement', 'Evenement', sequelize);
  if (evenementModel) models.Evenement = evenementModel;

  const programmeModel = loadModelSafely('./events/programme', 'Programme', sequelize);
  if (programmeModel) models.Programme = programmeModel;

  const parcoursModel = loadModelSafely('./events/parcours', 'Parcours', sequelize);
  if (parcoursModel) models.Parcours = parcoursModel;

  // 10. Tables de liaison (apres tous les modeles principaux)
  const oeuvreUserModel = loadModelSafely('./associations/oeuvreUser', 'OeuvreUser', sequelize);
  if (oeuvreUserModel) models.OeuvreUser = oeuvreUserModel;

  const oeuvreEditeurModel = loadModelSafely('./associations/oeuvreEditeur', 'OeuvreEditeur', sequelize);
  if (oeuvreEditeurModel) models.OeuvreEditeur = oeuvreEditeurModel;

  const oeuvreCategorieModel = loadModelSafely('./associations/oeuvreCategorie', 'OeuvreCategorie', sequelize);
  if (oeuvreCategorieModel) models.OeuvreCategorie = oeuvreCategorieModel;

  const oeuvreTagModel = loadModelSafely('./associations/oeuvreTag', 'OeuvreTag', sequelize);
  if (oeuvreTagModel) models.OeuvreTag = oeuvreTagModel;

  const evenementOeuvreModel = loadModelSafely('./associations/evenementOeuvre', 'EvenementOeuvre', sequelize);
  if (evenementOeuvreModel) models.EvenementOeuvre = evenementOeuvreModel;

  const evenementUserModel = loadModelSafely('./associations/evenementUser', 'EvenementUser', sequelize);
  if (evenementUserModel) models.EvenementUser = evenementUserModel;

  const evenementOrganisationModel = loadModelSafely('./associations/evenementOrganisation', 'EvenementOrganisation', sequelize);
  if (evenementOrganisationModel) models.EvenementOrganisation = evenementOrganisationModel;

  const programmeIntervenantModel = loadModelSafely('./associations/programmeIntervenant', 'ProgrammeIntervenant', sequelize);
  if (programmeIntervenantModel) models.ProgrammeIntervenant = programmeIntervenantModel;

  const parcoursLieuModel = loadModelSafely('./associations/parcoursLieu', 'ParcoursLieu', sequelize);
  if (parcoursLieuModel) models.ParcoursLieu = parcoursLieuModel;

  const userOrganisationModel = loadModelSafely('./associations/userOrganisation', 'UserOrganisation', sequelize);
  if (userOrganisationModel) models.UserOrganisation = userOrganisationModel;

  const userSpecialiteModel = loadModelSafely('./associations/userSpecialite', 'UserSpecialite', sequelize);
  if (userSpecialiteModel) models.UserSpecialite = userSpecialiteModel;

  // 11. Certifications
  const userCertificationModel = loadModelSafely('./misc/userCertification', 'UserCertification', sequelize);
  if (userCertificationModel) models.UserCertification = userCertificationModel;

  const emailVerificationModel = loadModelSafely('./misc/emailVerification', 'EmailVerification', sequelize);
  if (emailVerificationModel) models.EmailVerification = emailVerificationModel;

  // 12. Modeles divers
  const mediaModel = loadModelSafely('./misc/media', 'Media', sequelize);
  if (mediaModel) models.Media = mediaModel;

  const favoriModel = loadModelSafely('./misc/favori', 'Favori', sequelize);
  if (favoriModel) models.Favori = favoriModel;

  const commentaireModel = loadModelSafely('./misc/commentaire', 'Commentaire', sequelize);
  if (commentaireModel) models.Commentaire = commentaireModel;

  const critiqueEvaluationModel = loadModelSafely('./misc/critiqueEvaluation', 'CritiqueEvaluation', sequelize);
  if (critiqueEvaluationModel) models.CritiqueEvaluation = critiqueEvaluationModel;

  // 13. Tracking et moderation
  const vueModel = loadModelSafely('./misc/vue', 'Vue', sequelize);
  if (vueModel) models.Vue = vueModel;

  const signalementModel = loadModelSafely('./misc/signalement', 'Signalement', sequelize);
  if (signalementModel) models.Signalement = signalementModel;

  const notificationModel = loadModelSafely('./misc/notification', 'Notification', sequelize);
  if (notificationModel) models.Notification = notificationModel;

  const auditLogModel = loadModelSafely('./misc/auditLog', 'AuditLog', sequelize);
  if (auditLogModel) models.AuditLog = auditLogModel;

  // 14. QR Code
  const qrCodeModel = loadModelSafely('./misc/qrCode', 'QRCode', sequelize);
  if (qrCodeModel) models.QRCode = qrCodeModel;

  const qrScanModel = loadModelSafely('./misc/qrScan', 'QRScan', sequelize);
  if (qrScanModel) models.QRScan = qrScanModel;

  logger.info(`${Object.keys(models).length} modeles charges`);
  return models;
};

// ============================================================================
// 3. initializeAssociations : appelle .associate() sur chaque modele
// ============================================================================
const initializeAssociations = (models) => {
  logger.debug('Initialisation des associations...');

  // Verifications critiques (ces modeles ont des associations complexes)
  if (!models.Intervenant) {
    logger.error('Le modele Intervenant n\'est pas charge !');
  }
  if (!models.Specialite) {
    logger.error('Le modele Specialite n\'est pas charge !');
  }

  Object.keys(models).forEach((modelName) => {
    if (models[modelName].associate) {
      try {
        logger.debug(`  -> Associations pour ${modelName}`);
        models[modelName].associate(models);
      } catch (error) {
        // On continue avec les autres modeles meme en cas d'erreur pour
        // permettre un boot partiel et diagnostiquer via /health.
        logger.error(`Erreur associations ${modelName}: ${error.message}`);
      }
    }
  });

  logger.debug('Associations terminees');
};

// ============================================================================
// 4. importData : import des wilayas/dairas/communes d'Algerie
// ============================================================================
//
// Appele par insertDefaultData. Lit algeria_cities.json (dans ce repertoire)
// et cree les entites geographiques si elles n'existent pas.
async function importData(models) {
  try {
    logger.info('Import des donnees geographiques d\'Algerie...');

    const rawData = fs.readFileSync(path.join(__dirname, 'algeria_cities.json'), 'utf-8');
    const data = JSON.parse(rawData);

    const wilayaCache = new Map();
    const dairaCache = new Map();

    for (const entry of data) {
      const codeW = parseInt(entry.wilaya_code, 10);
      const wilayaNom = entry.wilaya_name;
      const wilayaNomAscii = entry.wilaya_name_ascii;

      const dairaNom = entry.daira_name;
      const dairaNomAscii = entry.daira_name_ascii;

      const communeNom = entry.commune_name;
      const communeNomAscii = entry.commune_name_ascii;

      // Wilaya
      let wilaya = wilayaCache.get(codeW);
      if (!wilaya) {
        wilaya = await models.Wilaya.findOne({ where: { codeW } });
        if (!wilaya) {
          wilaya = await models.Wilaya.create({
            codeW,
            nom: wilayaNom,
            wilaya_name_ascii: wilayaNomAscii
          });
        }
        wilayaCache.set(codeW, wilaya);
      }

      // Daira
      const dairaKey = `${codeW}-${dairaNomAscii}`;
      let daira = dairaCache.get(dairaKey);
      if (!daira) {
        daira = await models.Daira.findOne({
          where: {
            nom: dairaNom,
            wilayaId: wilaya.id_wilaya
          }
        });
        if (!daira) {
          daira = await models.Daira.create({
            nom: dairaNom,
            daira_name_ascii: dairaNomAscii,
            wilayaId: wilaya.id_wilaya
          });
        }
        dairaCache.set(dairaKey, daira);
      }

      // Commune
      const exists = await models.Commune.findOne({
        where: {
          nom: communeNom,
          dairaId: daira.id_daira
        }
      });
      if (!exists) {
        await models.Commune.create({
          nom: communeNom,
          commune_name_ascii: communeNomAscii,
          dairaId: daira.id_daira
        });
      }
    }

    logger.info('Import des donnees geographiques termine avec succes');
  } catch (error) {
    logger.error(`Erreur lors de l'import des donnees geographiques: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// 5. insertDefaultData : seeds de reference (langues, genres, categories, ...)
// ============================================================================
//
// Ne s'execute que si DB_SEED=true (voir app.js:329). La plupart des donnees
// sont inserees via findOrCreate -> idempotent, relance possible.
// Utilitaire interne pour inserer des donnees seulement si le modele existe
const insertDataIfModelExists = async (models, modelName, data, insertFunction) => {
  if (models[modelName]) {
    try {
      await insertFunction(models[modelName], data);
      logger.debug(`Donnees pour ${modelName} inserees`);
    } catch (error) {
      logger.error(`Erreur lors de l'insertion des donnees pour ${modelName}: ${error.message}`);
    }
  } else {
    logger.warn(`Modele ${modelName} non disponible - donnees ignorees`);
  }
};

const insertDefaultData = async (models) => {
  try {
    logger.info('Insertion des donnees par defaut...');

    // Import geographique : seulement si les 3 modeles sont la
    if (models.Wilaya && models.Daira && models.Commune) {
      await importData(models);
    } else {
      logger.warn('Modeles geographiques manquants - import Algerie ignore');
    }

    // Langues par defaut
    const defaultLangues = [
      { nom: 'Tamazight', code: 'tm' },
      { nom: 'Tifinagh', code: 'tif' },
      { nom: 'Arabe', code: 'ar' },
      { nom: 'Derja', code: 'de' },
      { nom: 'Francais', code: 'fr' },
      { nom: 'Anglais', code: 'en' }
    ];

    await insertDataIfModelExists(models, 'Langue', defaultLangues, async (model, data) => {
      for (const langue of data) {
        await model.findOrCreate({
          where: { nom: langue.nom },
          defaults: langue
        });
      }
    });

    // Types d'evenements par defaut
    const defaultTypesEvenements = [
      { nom_type: 'Festival', description: 'Festivals culturels' },
      { nom_type: 'Exposition', description: 'Expositions d\'art' },
      { nom_type: 'Concert', description: 'Concerts et spectacles musicaux' },
      { nom_type: 'Conference', description: 'Conferences et colloques' },
      { nom_type: 'Atelier', description: 'Ateliers creatifs' },
      { nom_type: 'Visite guidee', description: 'Visites culturelles' },
      { nom_type: 'Spectacle', description: 'Spectacles vivants' },
      { nom_type: 'Projection', description: 'Projections cinematographiques' },
      { nom_type: 'Lecture', description: 'Lectures publiques' },
      { nom_type: 'Debat', description: 'Debats culturels' }
    ];

    await insertDataIfModelExists(models, 'TypeEvenement', defaultTypesEvenements, async (model, data) => {
      for (const typeEvenement of data) {
        await model.findOrCreate({
          where: { nom_type: typeEvenement.nom_type },
          defaults: typeEvenement
        });
      }
    });

    // Types d'organisations par defaut
    const defaultTypesOrganisations = [
      'Association culturelle',
      'Ministere',
      'Collectivite territoriale',
      'Institution publique',
      'Fondation',
      'ONG',
      'Entreprise privee',
      'Universite',
      'Ecole',
      'Musee',
      'Bibliotheque'
    ];

    await insertDataIfModelExists(models, 'TypeOrganisation', defaultTypesOrganisations, async (model, data) => {
      for (const nom of data) {
        await model.findOrCreate({
          where: { nom },
          defaults: { nom }
        });
      }
    });

    // Roles par defaut
    const defaultRoles = [
      { nom_role: 'Administrateur', description: 'Acces complet au systeme' },
      { nom_role: 'User', description: 'Utilisateur standard' },
      { nom_role: 'Professionnel', description: 'Professionnel de la culture' },
      { nom_role: 'Moderateur', description: 'Moderation du contenu' }
    ];

    await insertDataIfModelExists(models, 'Role', defaultRoles, async (model, data) => {
      for (const role of data) {
        await model.findOrCreate({
          where: { nom_role: role.nom_role },
          defaults: role
        });
      }
    });

    // Materiaux par defaut
    const defaultMateriaux = [
      { nom: 'Bois', description: 'Materiau naturel' },
      { nom: 'Pierre', description: 'Materiau mineral' },
      { nom: 'Metal', description: 'Materiau metallique' },
      { nom: 'Ceramique', description: 'Terre cuite' },
      { nom: 'Textile', description: 'Fibres textiles' },
      { nom: 'Cuir', description: 'Peau animale traitee' },
      { nom: 'Verre', description: 'Materiau transparent' },
      { nom: 'Papier', description: 'Support d\'ecriture' },
      { nom: 'Plastique', description: 'Materiau synthetique' }
    ];

    await insertDataIfModelExists(models, 'Materiau', defaultMateriaux, async (model, data) => {
      for (const materiau of data) {
        await model.findOrCreate({
          where: { nom: materiau.nom },
          defaults: materiau
        });
      }
    });

    // Techniques par defaut
    const defaultTechniques = [
      { nom: 'Sculpture', description: 'Art du volume' },
      { nom: 'Peinture', description: 'Art pictural' },
      { nom: 'Gravure', description: 'Art de l\'estampe' },
      { nom: 'Tissage', description: 'Entrelacement de fils' },
      { nom: 'Poterie', description: 'Faconnage de l\'argile' },
      { nom: 'Broderie', description: 'Ornementation textile' },
      { nom: 'Marqueterie', description: 'Decoration en bois' },
      { nom: 'Ciselure', description: 'Travail du metal' },
      { nom: 'Calligraphie', description: 'Art de l\'ecriture' },
      { nom: 'Photographie', description: 'Capture d\'images' }
    ];

    await insertDataIfModelExists(models, 'Technique', defaultTechniques, async (model, data) => {
      for (const technique of data) {
        await model.findOrCreate({
          where: { nom: technique.nom },
          defaults: technique
        });
      }
    });

    // Types d'utilisateurs
    const typesUtilisateurs = [
      { nom_type: 'visiteur', description: 'Utilisateur standard du site' },
      { nom_type: 'ecrivain', description: 'Auteur de livres et oeuvres litteraires' },
      { nom_type: 'journaliste', description: 'Professionnel de l\'information et des medias' },
      { nom_type: 'scientifique', description: 'Chercheur ou academique' },
      { nom_type: 'acteur', description: 'Professionnel du cinema et du theatre' },
      { nom_type: 'artiste', description: 'Createur d\'oeuvres artistiques' },
      { nom_type: 'artisan', description: 'Createur d\'objets artisanaux' },
      { nom_type: 'realisateur', description: 'Professionnel de la realisation audiovisuelle' },
      { nom_type: 'musicien', description: 'Compositeur ou interprete musical' },
      { nom_type: 'photographe', description: 'Professionnel de la photographie' },
      { nom_type: 'danseur', description: 'Professionnel de la danse' },
      { nom_type: 'sculpteur', description: 'Createur de sculptures' },
      { nom_type: 'autre', description: 'Autre type de professionnel' }
    ];

    await insertDataIfModelExists(models, 'TypeUser', typesUtilisateurs, async (model, data) => {
      for (const typeUser of data) {
        await model.findOrCreate({
          where: { nom_type: typeUser.nom_type },
          defaults: typeUser
        });
      }
    });

    // Types d'oeuvres
    logger.debug('Creation des types d\'oeuvres...');
    const typesOeuvres = [
      { nom_type: 'Livre', description: 'Oeuvres litteraires ecrites' },
      { nom_type: 'Film', description: 'Oeuvres cinematographiques' },
      { nom_type: 'Album Musical', description: 'Oeuvres musicales' },
      { nom_type: 'Article', description: 'Articles de presse et blog' },
      { nom_type: 'Article Scientifique', description: 'Publications academiques' },
      { nom_type: "Oeuvre d'Art", description: 'Peintures, dessins, installations' },
      { nom_type: 'Artisanat', description: 'Creations artisanales traditionnelles' }
    ];

    const typeOeuvreMap = {};
    for (const typeData of typesOeuvres) {
      const [type] = await models.TypeOeuvre.findOrCreate({
        where: { nom_type: typeData.nom_type },
        defaults: typeData
      });
      typeOeuvreMap[typeData.nom_type] = type.id_type_oeuvre;
    }

    // Genres (80+ entrees)
    logger.debug('Creation des genres...');
    const genres = [
      // Litteraires (1-10)
      { nom: 'Roman', description: 'Recit long en prose', slug: 'roman' },
      { nom: 'Nouvelle', description: 'Recit court', slug: 'nouvelle' },
      { nom: 'Essai', description: 'Texte argumentatif', slug: 'essai' },
      { nom: 'Poesie', description: 'Oeuvre en vers', slug: 'poesie' },
      { nom: 'Biographie', description: 'Recit de vie', slug: 'biographie' },
      { nom: 'Theatre', description: 'Texte destine a etre joue', slug: 'theatre' },
      { nom: 'Bande Dessinee', description: 'Recit graphique', slug: 'bande-dessinee' },
      { nom: 'Conte', description: 'Recit merveilleux', slug: 'conte' },
      { nom: 'Chronique', description: "Recits d'evenements", slug: 'chronique' },
      { nom: 'Memoires', description: 'Souvenirs personnels', slug: 'memoires' },
      // Cinema (11-25)
      { nom: 'Action', description: "Films d'action et d'aventure", slug: 'action' },
      { nom: 'Comedie', description: 'Films humoristiques', slug: 'comedie' },
      { nom: 'Drame', description: 'Films dramatiques', slug: 'drame' },
      { nom: 'Thriller', description: 'Films a suspense', slug: 'thriller-film' },
      { nom: 'Science-Fiction', description: 'Films de SF', slug: 'science-fiction-film' },
      { nom: 'Fantastique', description: 'Films fantastiques', slug: 'fantastique-film' },
      { nom: 'Horreur', description: "Films d'epouvante", slug: 'horreur' },
      { nom: 'Documentaire', description: 'Films documentaires', slug: 'documentaire' },
      { nom: 'Animation', description: "Films d'animation", slug: 'animation' },
      { nom: 'Romance', description: 'Films romantiques', slug: 'romance-film' },
      { nom: 'Western', description: 'Films de western', slug: 'western' },
      { nom: 'Guerre', description: 'Films de guerre', slug: 'guerre' },
      { nom: 'Historique', description: 'Films historiques', slug: 'historique-film' },
      { nom: 'Musical', description: 'Films musicaux', slug: 'musical-film' },
      { nom: 'Policier', description: 'Films policiers', slug: 'policier-film' },
      // Musique (26-40)
      { nom: 'Rock', description: 'Musique rock', slug: 'rock' },
      { nom: 'Pop', description: 'Musique pop', slug: 'pop' },
      { nom: 'Jazz', description: 'Musique jazz', slug: 'jazz' },
      { nom: 'Classique', description: 'Musique classique', slug: 'classique' },
      { nom: 'Electronique', description: 'Musique electronique', slug: 'electronique' },
      { nom: 'Hip-Hop', description: 'Musique hip-hop', slug: 'hip-hop' },
      { nom: 'Folk', description: 'Musique folk', slug: 'folk' },
      { nom: 'Metal', description: 'Musique metal', slug: 'metal' },
      { nom: 'R&B', description: 'Rhythm and blues', slug: 'rnb' },
      { nom: 'Reggae', description: 'Musique reggae', slug: 'reggae' },
      { nom: 'Blues', description: 'Musique blues', slug: 'blues' },
      { nom: 'Country', description: 'Musique country', slug: 'country' },
      { nom: 'Rai', description: 'Musique rai algerienne', slug: 'rai' },
      { nom: 'Chaabi', description: 'Musique chaabi algerienne', slug: 'chaabi' },
      { nom: 'Andalou', description: 'Musique andalouse', slug: 'andalou' },
      // Articles (41-50)
      { nom: 'Actualite', description: "Articles d'actualite", slug: 'actualite' },
      { nom: 'Opinion', description: "Articles d'opinion", slug: 'opinion' },
      { nom: 'Analyse', description: "Articles d'analyse", slug: 'analyse' },
      { nom: 'Interview', description: 'Interviews', slug: 'interview' },
      { nom: 'Reportage', description: 'Reportages', slug: 'reportage' },
      { nom: 'Editorial', description: 'Editoriaux', slug: 'editorial' },
      { nom: 'Critique', description: 'Critiques', slug: 'critique' },
      { nom: 'Portrait', description: 'Portraits', slug: 'portrait' },
      { nom: 'Enquete', description: "Articles d'enquete", slug: 'enquete' },
      { nom: 'Tribune', description: 'Tribunes', slug: 'tribune' },
      // Scientifiques (51-58)
      { nom: 'Recherche', description: 'Articles de recherche', slug: 'recherche' },
      { nom: 'Meta-analyse', description: 'Meta-analyses', slug: 'meta-analyse' },
      { nom: 'Revue systematique', description: 'Revues systematiques', slug: 'revue-systematique' },
      { nom: 'Etude de cas', description: 'Etudes de cas', slug: 'etude-de-cas' },
      { nom: 'Article de synthese', description: 'Articles de synthese', slug: 'article-synthese' },
      { nom: 'Communication courte', description: 'Communications courtes', slug: 'communication-courte' },
      { nom: "Lettre a l'editeur", description: "Lettres a l'editeur", slug: 'lettre-editeur' },
      { nom: 'Rapport technique', description: 'Rapports techniques', slug: 'rapport-technique' },
      // Arts visuels (59-68)
      { nom: 'Peinture', description: 'Oeuvres peintes', slug: 'peinture' },
      { nom: 'Sculpture', description: 'Oeuvres sculptees', slug: 'sculpture' },
      { nom: 'Photographie', description: 'Oeuvres photographiques', slug: 'photographie' },
      { nom: 'Dessin', description: 'Oeuvres dessinees', slug: 'dessin' },
      { nom: 'Gravure', description: 'Oeuvres gravees', slug: 'gravure' },
      { nom: 'Installation', description: 'Installations artistiques', slug: 'installation' },
      { nom: 'Art numerique', description: 'Oeuvres numeriques', slug: 'art-numerique' },
      { nom: 'Street Art', description: 'Art urbain', slug: 'street-art' },
      { nom: 'Calligraphie', description: 'Art de la calligraphie', slug: 'calligraphie' },
      { nom: 'Collage', description: 'Oeuvres en collage', slug: 'collage' },
      // Artisanat (69-80)
      { nom: 'Poterie', description: 'Poterie traditionnelle', slug: 'poterie' },
      { nom: 'Tissage', description: 'Tissage traditionnel', slug: 'tissage' },
      { nom: 'Bijouterie', description: 'Creation de bijoux', slug: 'bijouterie' },
      { nom: 'Maroquinerie', description: 'Travail du cuir', slug: 'maroquinerie' },
      { nom: 'Vannerie', description: 'Travail de vannerie', slug: 'vannerie' },
      { nom: 'Ebenisterie', description: 'Travail du bois', slug: 'ebenisterie' },
      { nom: 'Ferronnerie', description: 'Travail du metal', slug: 'ferronnerie' },
      { nom: 'Ceramique', description: 'Art de la ceramique', slug: 'ceramique' },
      { nom: 'Broderie', description: 'Art de la broderie', slug: 'broderie' },
      { nom: 'Tapisserie', description: 'Art de la tapisserie', slug: 'tapisserie' },
      { nom: 'Dinanderie', description: 'Travail du cuivre', slug: 'dinanderie' },
      { nom: 'Zellige', description: 'Mosaique traditionnelle', slug: 'zellige' }
    ];

    const genreMap = {};
    for (const genreData of genres) {
      const [genre] = await models.Genre.findOrCreate({
        where: { nom: genreData.nom },
        defaults: genreData
      });
      genreMap[genreData.nom] = genre.id_genre;
    }

    // Categories (125+ entrees)
    logger.debug('Creation des categories...');
    const categories = [
      // Litteraires (1-20)
      { nom: 'Romance', description: "Histoires d'amour" },
      { nom: 'Thriller', description: 'Suspense et tension' },
      { nom: 'Fantasy', description: 'Mondes imaginaires' },
      { nom: 'Science-Fiction', description: 'Futur et technologie' },
      { nom: 'Historique', description: "Base sur l'histoire" },
      { nom: 'Policier', description: 'Enquetes et mysteres' },
      { nom: 'Horreur', description: 'Epouvante et terreur' },
      { nom: 'Contemporain', description: 'Epoque actuelle' },
      { nom: 'Jeunesse', description: 'Pour les jeunes' },
      { nom: 'Young Adult', description: 'Jeunes adultes' },
      { nom: 'Dystopie', description: 'Societes futures sombres' },
      { nom: 'Aventure', description: "Recits d'aventures" },
      { nom: 'Guerre', description: 'Recits de guerre' },
      { nom: 'Espionnage', description: "Histoires d'espions" },
      { nom: 'Psychologique', description: 'Exploration psychologique' },
      { nom: 'Social', description: 'Questions sociales' },
      { nom: 'Philosophique', description: 'Reflexions philosophiques' },
      { nom: 'Satirique', description: 'Satire sociale' },
      { nom: 'Epistolaire', description: 'Roman par lettres' },
      { nom: 'Autobiographique', description: "Base sur la vie de l'auteur" },
      // Cinema (21-40)
      { nom: 'Super-heros', description: 'Films de super-heros' },
      { nom: 'Arts martiaux', description: "Films d'arts martiaux" },
      { nom: 'Catastrophe', description: 'Films catastrophe' },
      { nom: 'Biographique', description: 'Biographies filmees' },
      { nom: 'Sport', description: 'Films de sport' },
      { nom: 'Road Movie', description: 'Films de voyage' },
      { nom: 'Film noir', description: 'Genre noir classique' },
      { nom: 'Neo-noir', description: 'Noir moderne' },
      { nom: 'Zombie', description: 'Films de zombies' },
      { nom: 'Vampire', description: 'Films de vampires' },
      { nom: 'Space Opera', description: 'Epopees spatiales' },
      { nom: 'Cyberpunk', description: 'Futur dystopique high-tech' },
      { nom: 'Steampunk', description: 'Retro-futurisme vapeur' },
      { nom: 'Post-apocalyptique', description: "Apres l'apocalypse" },
      { nom: 'Survival', description: 'Films de survie' },
      { nom: 'Slasher', description: 'Films slasher' },
      { nom: 'Found Footage', description: 'Faux documentaires' },
      { nom: 'Mockumentary', description: 'Faux documentaires comiques' },
      { nom: 'Anthologie', description: 'Films a sketches' },
      { nom: 'Experimental', description: 'Cinema experimental' },
      // Musique (41-60)
      { nom: 'Rock Alternatif', description: 'Rock alternatif' },
      { nom: 'Hard Rock', description: 'Rock dur' },
      { nom: 'Punk Rock', description: 'Punk rock' },
      { nom: 'Rock Progressif', description: 'Rock progressif' },
      { nom: 'Indie Rock', description: 'Rock independant' },
      { nom: 'Pop Rock', description: 'Pop rock' },
      { nom: 'Electro Pop', description: 'Pop electronique' },
      { nom: 'K-Pop', description: 'Pop coreenne' },
      { nom: 'Indie Pop', description: 'Pop independante' },
      { nom: 'Bebop', description: 'Jazz bebop' },
      { nom: 'Smooth Jazz', description: 'Jazz doux' },
      { nom: 'Jazz Fusion', description: 'Jazz fusion' },
      { nom: 'Free Jazz', description: 'Jazz libre' },
      { nom: 'House', description: 'Musique house' },
      { nom: 'Techno', description: 'Musique techno' },
      { nom: 'Dubstep', description: 'Musique dubstep' },
      { nom: 'Ambient', description: 'Musique ambiante' },
      { nom: 'Trap', description: 'Musique trap' },
      { nom: 'Drill', description: 'Musique drill' },
      { nom: 'Afrobeat', description: 'Musique afrobeat' },
      // Articles (61-80)
      { nom: 'Politique', description: 'Articles politiques' },
      { nom: 'Economie', description: 'Articles economiques' },
      { nom: 'Societe', description: 'Articles de societe' },
      { nom: 'International', description: 'Actualite internationale' },
      { nom: 'Sport', description: 'Articles sportifs' },
      { nom: 'Culture', description: 'Articles culturels' },
      { nom: 'Technologie', description: 'Articles tech' },
      { nom: 'Environnement', description: 'Articles environnement' },
      { nom: 'Sante', description: 'Articles sante' },
      { nom: 'Education', description: 'Articles education' },
      { nom: 'Sciences', description: 'Articles scientifiques' },
      { nom: 'Justice', description: 'Articles justice' },
      { nom: 'Faits divers', description: 'Faits divers' },
      { nom: 'Medias', description: 'Articles sur les medias' },
      { nom: 'Lifestyle', description: 'Art de vivre' },
      { nom: 'Gastronomie', description: 'Articles gastronomie' },
      { nom: 'Tourisme', description: 'Articles tourisme' },
      { nom: 'Mode', description: 'Articles mode' },
      { nom: 'People', description: 'Celebrites' },
      { nom: 'Gaming', description: 'Jeux video' },
      // Sciences (81-95)
      { nom: 'Biologie', description: 'Sciences de la vie' },
      { nom: 'Physique', description: 'Sciences physiques' },
      { nom: 'Chimie', description: 'Sciences chimiques' },
      { nom: 'Mathematiques', description: 'Sciences mathematiques' },
      { nom: 'Informatique', description: 'Sciences informatiques' },
      { nom: 'Medecine', description: 'Sciences medicales' },
      { nom: 'Psychologie', description: 'Sciences psychologiques' },
      { nom: 'Sociologie', description: 'Sciences sociales' },
      { nom: 'Anthropologie', description: 'Sciences anthropologiques' },
      { nom: 'Archeologie', description: 'Sciences archeologiques' },
      { nom: 'Geologie', description: 'Sciences de la Terre' },
      { nom: 'Astronomie', description: 'Sciences astronomiques' },
      { nom: 'Ecologie', description: 'Sciences ecologiques' },
      { nom: 'Genetique', description: 'Sciences genetiques' },
      { nom: 'Neurosciences', description: 'Sciences du cerveau' },
      // Arts (96-110)
      { nom: 'Portrait', description: 'Portraits artistiques' },
      { nom: 'Paysage', description: 'Paysages' },
      { nom: 'Nature morte', description: 'Natures mortes' },
      { nom: 'Abstrait', description: 'Art abstrait' },
      { nom: 'Figuratif', description: 'Art figuratif' },
      { nom: 'Surrealiste', description: 'Art surrealiste' },
      { nom: 'Impressionniste', description: 'Style impressionniste' },
      { nom: 'Expressionniste', description: 'Style expressionniste' },
      { nom: 'Cubiste', description: 'Style cubiste' },
      { nom: 'Minimaliste', description: 'Art minimaliste' },
      { nom: 'Pop Art', description: 'Pop art' },
      { nom: 'Art Deco', description: 'Style art deco' },
      { nom: 'Art Nouveau', description: 'Style art nouveau' },
      { nom: 'Contemporain', description: 'Art contemporain' },
      { nom: 'Traditionnel', description: 'Art traditionnel' },
      // Artisanat (111-125)
      { nom: 'Utilitaire', description: 'Objets utilitaires' },
      { nom: 'Decoratif', description: 'Objets decoratifs' },
      { nom: 'Rituel', description: 'Objets rituels' },
      { nom: 'Mobilier', description: 'Meubles artisanaux' },
      { nom: 'Vestimentaire', description: 'Vetements artisanaux' },
      { nom: 'Accessoires', description: 'Accessoires artisanaux' },
      { nom: 'Instruments', description: 'Instruments artisanaux' },
      { nom: 'Jouets', description: 'Jouets artisanaux' },
      { nom: 'Cuisine', description: 'Ustensiles de cuisine' },
      { nom: 'Jardin', description: 'Objets de jardin' },
      { nom: 'Architecture', description: 'Elements architecturaux' },
      { nom: 'Religieux', description: 'Objets religieux' },
      { nom: 'Festif', description: 'Objets festifs' },
      { nom: 'Traditionnel Algerien', description: 'Artisanat algerien' },
      { nom: 'Moderne', description: 'Artisanat moderne' }
    ];

    const categorieMap = {};
    for (const catData of categories) {
      const [cat] = await models.Categorie.findOrCreate({
        where: { nom: catData.nom },
        defaults: catData
      });
      categorieMap[catData.nom] = cat.id_categorie;
    }

    // Associations TypeOeuvre -> Genre
    logger.debug('Creation des associations Type -> Genre...');
    const typeGenreAssociations = [
      { type: 'Livre', genres: ['Roman', 'Nouvelle', 'Essai', 'Poesie', 'Biographie', 'Theatre', 'Bande Dessinee', 'Conte', 'Chronique', 'Memoires'] },
      { type: 'Film', genres: ['Action', 'Comedie', 'Drame', 'Thriller', 'Science-Fiction', 'Fantastique', 'Horreur', 'Documentaire', 'Animation', 'Romance', 'Western', 'Guerre', 'Historique', 'Musical', 'Policier'] },
      { type: 'Album Musical', genres: ['Rock', 'Pop', 'Jazz', 'Classique', 'Electronique', 'Hip-Hop', 'Folk', 'Metal', 'R&B', 'Reggae', 'Blues', 'Country', 'Rai', 'Chaabi', 'Andalou'] },
      { type: 'Article', genres: ['Actualite', 'Opinion', 'Analyse', 'Interview', 'Reportage', 'Editorial', 'Critique', 'Portrait', 'Enquete', 'Tribune'] },
      { type: 'Article Scientifique', genres: ['Recherche', 'Meta-analyse', 'Revue systematique', 'Etude de cas', 'Article de synthese', 'Communication courte', "Lettre a l'editeur", 'Rapport technique'] },
      { type: "Oeuvre d'Art", genres: ['Peinture', 'Sculpture', 'Photographie', 'Dessin', 'Gravure', 'Installation', 'Art numerique', 'Street Art', 'Calligraphie', 'Collage'] },
      { type: 'Artisanat', genres: ['Poterie', 'Tissage', 'Bijouterie', 'Maroquinerie', 'Vannerie', 'Ebenisterie', 'Ferronnerie', 'Ceramique', 'Broderie', 'Tapisserie', 'Dinanderie', 'Zellige'] }
    ];

    for (const assoc of typeGenreAssociations) {
      const typeId = typeOeuvreMap[assoc.type];
      if (!typeId) continue;
      for (let i = 0; i < assoc.genres.length; i++) {
        const genreId = genreMap[assoc.genres[i]];
        if (!genreId) continue;
        await models.TypeOeuvreGenre.findOrCreate({
          where: {
            id_type_oeuvre: typeId,
            id_genre: genreId
          },
          defaults: {
            id_type_oeuvre: typeId,
            id_genre: genreId,
            ordre_affichage: i + 1,
            actif: true
          }
        });
      }
    }

    // Associations Genre -> Categorie
    logger.debug('Creation des associations Genre -> Categorie...');
    const genreCategorieAssociations = [
      // Litteraires
      { genre: 'Roman', categories: ['Romance', 'Thriller', 'Fantasy', 'Science-Fiction', 'Historique', 'Policier', 'Horreur', 'Contemporain', 'Jeunesse', 'Young Adult', 'Dystopie', 'Aventure', 'Guerre', 'Espionnage', 'Psychologique', 'Social', 'Philosophique', 'Satirique', 'Epistolaire', 'Autobiographique'] },
      { genre: 'Nouvelle', categories: ['Fantasy', 'Science-Fiction', 'Policier', 'Horreur', 'Contemporain', 'Psychologique', 'Social'] },
      { genre: 'Essai', categories: ['Philosophique', 'Social', 'Politique', 'Economie', 'Culture', 'Sciences', 'Historique'] },
      { genre: 'Poesie', categories: ['Contemporain', 'Classique', 'Romance', 'Social', 'Philosophique'] },
      { genre: 'Biographie', categories: ['Historique', 'Politique', 'Culture', 'Sport', 'Sciences', 'Autobiographique'] },
      // Cinema
      { genre: 'Action', categories: ['Super-heros', 'Arts martiaux', 'Espionnage', 'Guerre', 'Aventure', 'Catastrophe', 'Survival'] },
      { genre: 'Comedie', categories: ['Romance', 'Satirique', 'Mockumentary', 'Sport', 'Road Movie'] },
      { genre: 'Drame', categories: ['Psychologique', 'Social', 'Historique', 'Biographique', 'Guerre', 'Romance'] },
      { genre: 'Thriller', categories: ['Policier', 'Psychologique', 'Espionnage', 'Film noir', 'Neo-noir', 'Survival'] },
      { genre: 'Science-Fiction', categories: ['Space Opera', 'Cyberpunk', 'Steampunk', 'Post-apocalyptique', 'Dystopie', 'Super-heros'] },
      { genre: 'Horreur', categories: ['Zombie', 'Vampire', 'Slasher', 'Found Footage', 'Psychologique', 'Survival'] },
      // Musique
      { genre: 'Rock', categories: ['Rock Alternatif', 'Hard Rock', 'Punk Rock', 'Rock Progressif', 'Indie Rock', 'Pop Rock'] },
      { genre: 'Pop', categories: ['Pop Rock', 'Electro Pop', 'K-Pop', 'Indie Pop'] },
      { genre: 'Jazz', categories: ['Bebop', 'Smooth Jazz', 'Jazz Fusion', 'Free Jazz'] },
      { genre: 'Electronique', categories: ['House', 'Techno', 'Dubstep', 'Ambient'] },
      { genre: 'Hip-Hop', categories: ['Trap', 'Drill', 'Afrobeat'] },
      // Articles
      { genre: 'Actualite', categories: ['Politique', 'Economie', 'Societe', 'International', 'Sport', 'Culture', 'Technologie', 'Environnement', 'Sante', 'Education', 'Justice', 'Faits divers'] },
      { genre: 'Opinion', categories: ['Politique', 'Societe', 'Culture', 'Economie', 'International', 'Environnement'] },
      { genre: 'Analyse', categories: ['Politique', 'Economie', 'Societe', 'International', 'Culture', 'Technologie', 'Sciences'] },
      { genre: 'Interview', categories: ['Politique', 'Culture', 'Sport', 'Sciences', 'Economie', 'People'] },
      { genre: 'Reportage', categories: ['International', 'Societe', 'Environnement', 'Culture', 'Sport', 'Guerre'] },
      // Scientifiques
      { genre: 'Recherche', categories: ['Biologie', 'Physique', 'Chimie', 'Mathematiques', 'Informatique', 'Medecine', 'Psychologie', 'Sociologie', 'Anthropologie', 'Archeologie', 'Geologie', 'Astronomie', 'Ecologie', 'Genetique', 'Neurosciences'] },
      { genre: 'Meta-analyse', categories: ['Medecine', 'Psychologie', 'Biologie', 'Sciences sociales'] },
      { genre: 'Etude de cas', categories: ['Medecine', 'Psychologie', 'Sociologie', 'Anthropologie', 'Education'] },
      // Arts visuels
      { genre: 'Peinture', categories: ['Portrait', 'Paysage', 'Nature morte', 'Abstrait', 'Figuratif', 'Surrealiste', 'Impressionniste', 'Expressionniste', 'Cubiste', 'Minimaliste', 'Pop Art', 'Contemporain', 'Traditionnel'] },
      { genre: 'Photographie', categories: ['Portrait', 'Paysage', 'Nature morte', 'Street Art', 'Documentaire', 'Abstrait', 'Contemporain'] },
      { genre: 'Sculpture', categories: ['Abstrait', 'Figuratif', 'Minimaliste', 'Contemporain', 'Traditionnel'] },
      // Artisanat
      { genre: 'Poterie', categories: ['Utilitaire', 'Decoratif', 'Rituel', 'Traditionnel Algerien', 'Moderne'] },
      { genre: 'Tissage', categories: ['Vestimentaire', 'Decoratif', 'Mobilier', 'Traditionnel Algerien'] },
      { genre: 'Bijouterie', categories: ['Accessoires', 'Decoratif', 'Rituel', 'Traditionnel Algerien', 'Moderne'] },
      { genre: 'Ebenisterie', categories: ['Mobilier', 'Decoratif', 'Utilitaire', 'Architecture'] },
      { genre: 'Ceramique', categories: ['Utilitaire', 'Decoratif', 'Architecture', 'Traditionnel Algerien'] }
    ];

    for (const assoc of genreCategorieAssociations) {
      const genreId = genreMap[assoc.genre];
      if (!genreId) continue;
      for (let i = 0; i < assoc.categories.length; i++) {
        const catId = categorieMap[assoc.categories[i]];
        if (!catId) continue;
        await models.GenreCategorie.findOrCreate({
          where: {
            id_genre: genreId,
            id_categorie: catId
          },
          defaults: {
            id_genre: genreId,
            id_categorie: catId,
            ordre_affichage: i + 1,
            actif: true
          }
        });
      }
    }

    // Specialites par defaut
    const defaultSpecialites = [
      { nom_specialite: 'Arts visuels', description: 'Peinture, sculpture, photographie', categorie: 'Arts' },
      { nom_specialite: 'Musique', description: 'Composition, interpretation', categorie: 'Arts' },
      { nom_specialite: 'Litterature', description: 'Ecriture, poesie', categorie: 'Arts' },
      { nom_specialite: 'Theatre', description: "Mise en scene, jeu d'acteur", categorie: 'Arts' },
      { nom_specialite: 'Danse', description: 'Choregraphie, interpretation', categorie: 'Arts' },
      { nom_specialite: 'Artisanat', description: 'Techniques traditionnelles', categorie: 'Metiers' },
      { nom_specialite: 'Conservation', description: 'Preservation du patrimoine', categorie: 'Metiers' },
      { nom_specialite: 'Mediation culturelle', description: 'Animation, pedagogie', categorie: 'Metiers' },
      { nom_specialite: 'Production', description: "Organisation d'evenements", categorie: 'Metiers' },
      { nom_specialite: 'Communication', description: 'Promotion culturelle', categorie: 'Metiers' }
    ];

    await insertDataIfModelExists(models, 'Specialite', defaultSpecialites, async (model, data) => {
      for (const specialite of data) {
        await model.findOrCreate({
          where: { nom_specialite: specialite.nom_specialite },
          defaults: specialite
        });
      }
    });

    logger.info('Donnees par defaut inserees avec succes');
  } catch (error) {
    logger.error(`Erreur lors de l'insertion des donnees par defaut: ${error.message}`);
    throw error;
  }
};

// ============================================================================
// 6. initializeDatabase : lifecycle complet (connect + sync + seed)
// ============================================================================
const initializeDatabase = async (config = {}) => {
  try {
    logger.info('Initialisation de la base de donnees...');

    const syncConfig = config.sync || {};
    const shouldSeed = config.skipSeed !== true;

    const sequelize = createDatabaseConnection(config);

    await sequelize.authenticate();
    logger.info('Connexion a la base de donnees etablie');

    const models = loadModels(sequelize);
    initializeAssociations(models);
    logger.info('Associations entre modeles configurees');

    // Desactiver les contraintes FK temporairement (MySQL)
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      logger.debug('Contraintes FK desactivees temporairement');
    } catch (error) {
      logger.debug('Impossible de desactiver les contraintes FK (normal si pas MySQL)');
    }

    // Si force: true, drop manuellement toutes les tables pour eviter les
    // erreurs de dependance FK.
    if (syncConfig.force) {
      try {
        const [tables] = await sequelize.query(
          'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();'
        );
        for (const row of tables) {
          const tableName = row.table_name || row.TABLE_NAME;
          if (tableName) {
            try {
              await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
            } catch (dropErr) {
              // Erreurs individuelles ignorees (tables deja supprimees)
            }
          }
        }
      } catch (listErr) {
        // On continue meme si on ne peut pas lister
      }
    }

    await sequelize.sync({
      force: !!syncConfig.force,
      alter: !!syncConfig.alter
    });
    logger.info('Base de donnees synchronisee');

    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      logger.debug('Contraintes FK reactivees');
    } catch (error) {
      logger.debug('Impossible de reactiver les contraintes FK');
    }

    if (shouldSeed) {
      await insertDefaultData(models);
      logger.info('Donnees par defaut inserees');
    }

    logger.info('Base de donnees initialisee avec succes');
    return { sequelize, models };
  } catch (error) {
    logger.error(`Erreur lors de l'initialisation de la base de donnees: ${error.message}`);
    throw error;
  }
};

// ============================================================================
// 7. resetDatabase : drop toutes les tables + recreate + seed
// ============================================================================
const resetDatabase = async (config = {}) => {
  logger.warn('ATTENTION: Remise a zero de la base de donnees !');

  let sequelize = createDatabaseConnection(config);

  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    logger.debug('Contraintes FK desactivees');

    const [tables] = await sequelize.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();'
    );

    for (const { table_name } of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table_name}\`;`);
        logger.debug(`  Table ${table_name} supprimee`);
      } catch (err) {
        logger.warn(`  Impossible de supprimer ${table_name}: ${err.message}`);
      }
    }

    logger.info('Toutes les tables supprimees');

    // Nouvelle connexion pour eviter les problemes de cache Sequelize
    await sequelize.close();
    sequelize = createDatabaseConnection(config);

    const models = loadModels(sequelize);

    // Verification des modeles critiques
    const requiredModels = ['User', 'Lieu', 'Intervenant', 'Programme', 'Evenement', 'Specialite'];
    for (const modelName of requiredModels) {
      if (!models[modelName]) {
        logger.error(`Modele requis manquant : ${modelName}`);
      }
    }

    initializeAssociations(models);
    logger.info('Associations configurees');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    // alter: false pour eviter les erreurs d'index
    await sequelize.sync({ force: true, alter: false });
    logger.info('Tables recreees');

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    logger.debug('Contraintes FK reactivees');

    await insertDefaultData(models);
    logger.info('Donnees par defaut inserees');

    logger.info('Base de donnees reinitialisee avec succes');
    return { sequelize, models };
  } catch (error) {
    logger.error(`Erreur lors de la remise a zero: ${error.message}`);
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } catch (e) {
      // Ignorer si echec (sequelize peut etre dans un etat casse)
    }
    throw error;
  }
};

// ============================================================================
// 8. Initialisation au chargement du module (compat ascendante)
// ============================================================================
//
// Historiquement, app.js et les services font require('./models') et s'attendent
// a recuperer directement un objet {User, Oeuvre, ..., sequelize, Sequelize}.
// On reproduit ce comportement en creant une connexion + chargeant les modeles
// a l'import du module.
//
// Pour les tests qui veulent une instance Sequelize isolee (tests/setup.js),
// loadModels et initializeAssociations restent exposes sur le module : le test
// peut creer son propre Sequelize et relancer loadModels dessus.
const env = process.env.NODE_ENV || 'development';
logger.debug(`Initialisation des modeles pour l'environnement: ${env}`);

const sequelize = createDatabaseConnection(env);
const models = loadModels(sequelize);
initializeAssociations(models);

const db = {
  ...models,
  sequelize,
  Sequelize: require('sequelize'),
  initializeDatabase,
  resetDatabase,
  loadModels,
  initializeAssociations,
  insertDefaultData,
  importData
};

module.exports = db;
