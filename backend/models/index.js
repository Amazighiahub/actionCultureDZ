const fs = require('fs');
const path = require('path');
const { createDatabaseConnection } = require('../config/database');

// Fonction d'import des données géographiques modifiée
async function importData(models) {
  try {
    console.log('📍 Import des données géographiques d\'Algérie...');
    
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
            wilaya_name_ascii: wilayaNomAscii,
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
            wilayaId: wilaya.id_wilaya,
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
          dairaId: daira.id_daira,
        });
      }
    }

    console.log('✅ Import des données géographiques terminé avec succès.');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import des données géographiques:', error);
    throw error;
  }
}

// Fonction utilitaire pour charger un modèle de manière sécurisée
const loadModelSafely = (modelPath, modelName, sequelize) => {
  try {
    const model = require(modelPath)(sequelize);
    console.log(`✅ Modèle ${modelName} chargé avec succès`);
    return model;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log(`⚠️  Modèle ${modelName} non trouvé (${modelPath}) - ignoré`);
      return null;
    } else {
      console.error(`❌ Erreur lors du chargement de ${modelName}:`, error.message);
      throw error;
    }
  }
};

const loadModels = (sequelize) => {
  const models = {};

  console.log('📦 Chargement des modèles...');

  // ORDRE IMPORTANT : Charger les modèles référencés en premier

  // 1. Modèles géographiques (référencés par Lieu)
  const wilayaModel = loadModelSafely('./geography/Wilaya', 'Wilaya', sequelize);
  if (wilayaModel) models.Wilaya = wilayaModel;
  
  const dairaModel = loadModelSafely('./geography/Daira', 'Daira', sequelize);
  if (dairaModel) models.Daira = dairaModel;
  
  const communeModel = loadModelSafely('./geography/Commune', 'Commune', sequelize);
  if (communeModel) models.Commune = communeModel;
  
  const localiteModel = loadModelSafely('./geography/Localite', 'Localite', sequelize);
  if (localiteModel) models.Localite = localiteModel;

  // 2. Modèles de base (User, Role) - référencés par beaucoup d'autres
  const roleModel = loadModelSafely('./users/Role', 'Role', sequelize);
  if (roleModel) models.Role = roleModel;
  
  const userModel = loadModelSafely('./users/User', 'User', sequelize);
  if (userModel) models.User = userModel;
  
  const userRoleModel = loadModelSafely('./users/UserRole', 'UserRole', sequelize);
  if (userRoleModel) models.UserRole = userRoleModel;

  // 3. Modèles de lieux - IMPORTANT: Charger avant Evenement
  const lieuModel = loadModelSafely('./places/Lieu', 'Lieu', sequelize);
  if (lieuModel) models.Lieu = lieuModel;
  
  const detailLieuModel = loadModelSafely('./places/DetailLieu', 'DetailLieu', sequelize);
  if (detailLieuModel) models.DetailLieu = detailLieuModel;
  
  const serviceModel = loadModelSafely('./places/Service', 'Service', sequelize);
  if (serviceModel) models.Service = serviceModel;
  
  const lieuMediaModel = loadModelSafely('./places/LieuMedia', 'LieuMedia', sequelize);
  if (lieuMediaModel) models.LieuMedia = lieuMediaModel;
  
  const monumentModel = loadModelSafely('./places/Monument', 'Monument', sequelize);
  if (monumentModel) models.Monument = monumentModel;
  
  const vestigeModel = loadModelSafely('./places/Vestige', 'Vestige', sequelize);
  if (vestigeModel) models.Vestige = vestigeModel;

  // 4. Types et classifications
  const langueModel = loadModelSafely('./classifications/Langue', 'Langue', sequelize);
  if (langueModel) models.Langue = langueModel;
  
  const categorieModel = loadModelSafely('./classifications/Categorie', 'Categorie', sequelize);
  if (categorieModel) models.Categorie = categorieModel;
  
  const genreModel = loadModelSafely('./classifications/Genre', 'Genre', sequelize);
  if (genreModel) models.Genre = genreModel;
  
  const typeOeuvreModel = loadModelSafely('./classifications/TypeOeuvre', 'TypeOeuvre', sequelize);
  if (typeOeuvreModel) models.TypeOeuvre = typeOeuvreModel;
  
  const tagMotCleModel = loadModelSafely('./classifications/TagMotCle', 'TagMotCle', sequelize);
  if (tagMotCleModel) models.TagMotCle = tagMotCleModel;
  
  const materiauModel = loadModelSafely('./classifications/Materiau', 'Materiau', sequelize);
  if (materiauModel) models.Materiau = materiauModel;
  
  const techniqueModel = loadModelSafely('./classifications/Technique', 'Technique', sequelize);
  if (techniqueModel) models.Technique = techniqueModel;

  // 5. Types d'événements (référencé par Evenement)
  const typeEvenementModel = loadModelSafely('./events/TypeEvenement', 'TypeEvenement', sequelize);
  if (typeEvenementModel) models.TypeEvenement = typeEvenementModel;

  // 6. Organisations
  const typeOrganisationModel = loadModelSafely('./organisations/TypeOrganisation', 'TypeOrganisation', sequelize);
  if (typeOrganisationModel) models.TypeOrganisation = typeOrganisationModel;
  
  const organisationModel = loadModelSafely('./organisations/Organisation', 'Organisation', sequelize);
  if (organisationModel) models.Organisation = organisationModel;
  
  const editeurModel = loadModelSafely('./organisations/Editeur', 'Editeur', sequelize);
  if (editeurModel) models.Editeur = editeurModel;

  // 7. Œuvres
  const oeuvreModel = loadModelSafely('./oeuvres/Oeuvre', 'Oeuvre', sequelize);
  if (oeuvreModel) models.Oeuvre = oeuvreModel;
  
  const livreModel = loadModelSafely('./oeuvres/Livre', 'Livre', sequelize);
  if (livreModel) models.Livre = livreModel;
  
  const filmModel = loadModelSafely('./oeuvres/Film', 'Film', sequelize);
  if (filmModel) models.Film = filmModel;
  
  const albumMusicalModel = loadModelSafely('./oeuvres/AlbumMusical', 'AlbumMusical', sequelize);
  if (albumMusicalModel) models.AlbumMusical = albumMusicalModel;
  
  const articleModel = loadModelSafely('./oeuvres/Article', 'Article', sequelize);
  if (articleModel) models.Article = articleModel;
  
  const articleScientifiqueModel = loadModelSafely('./oeuvres/ArticleScientifique', 'ArticleScientifique', sequelize);
  if (articleScientifiqueModel) models.ArticleScientifique = articleScientifiqueModel;
  
  const artisanatModel = loadModelSafely('./oeuvres/Artisanat', 'Artisanat', sequelize);
  if (artisanatModel) models.Artisanat = artisanatModel;
  
  const oeuvreArtModel = loadModelSafely('./oeuvres/OeuvreArt', 'OeuvreArt', sequelize);
  if (oeuvreArtModel) models.OeuvreArt = oeuvreArtModel;

  // 8. Specialite et Intervenant - IMPORTANT: Charger avant Programme et Evenement
  const specialiteModel = loadModelSafely('./misc/Specialite', 'Specialite', sequelize);
  if (specialiteModel) models.Specialite = specialiteModel;
  
  const intervenantModel = loadModelSafely('./misc/Intervenant', 'Intervenant', sequelize);
  if (intervenantModel) models.Intervenant = intervenantModel;

  // 9. Événements (après Lieu, User, TypeEvenement)
  const evenementModel = loadModelSafely('./events/Evenement', 'Evenement', sequelize);
  if (evenementModel) models.Evenement = evenementModel;
  
  const programmeModel = loadModelSafely('./events/Programme', 'Programme', sequelize);
  if (programmeModel) models.Programme = programmeModel;
  
  const parcoursModel = loadModelSafely('./events/Parcours', 'Parcours', sequelize);
  if (parcoursModel) models.Parcours = parcoursModel;

  // 10. Tables de liaison (après tous les modèles principaux)
  const oeuvreUserModel = loadModelSafely('./associations/OeuvreUser', 'OeuvreUser', sequelize);
  if (oeuvreUserModel) models.OeuvreUser = oeuvreUserModel;
  
  const oeuvreEditeurModel = loadModelSafely('./associations/OeuvreEditeur', 'OeuvreEditeur', sequelize);
  if (oeuvreEditeurModel) models.OeuvreEditeur = oeuvreEditeurModel;
  
  const oeuvreCategorieModel = loadModelSafely('./associations/OeuvreCategorie', 'OeuvreCategorie', sequelize);
  if (oeuvreCategorieModel) models.OeuvreCategorie = oeuvreCategorieModel;
  
  const oeuvreTagModel = loadModelSafely('./associations/OeuvreTag', 'OeuvreTag', sequelize);
  if (oeuvreTagModel) models.OeuvreTag = oeuvreTagModel;
  
  const evenementOeuvreModel = loadModelSafely('./associations/EvenementOeuvre', 'EvenementOeuvre', sequelize);
  if (evenementOeuvreModel) models.EvenementOeuvre = evenementOeuvreModel;
  
  const evenementUserModel = loadModelSafely('./associations/EvenementUser', 'EvenementUser', sequelize);
  if (evenementUserModel) models.EvenementUser = evenementUserModel;
  
  const evenementOrganisationModel = loadModelSafely('./associations/EvenementOrganisation', 'EvenementOrganisation', sequelize);
  if (evenementOrganisationModel) models.EvenementOrganisation = evenementOrganisationModel;
  
  const programmeIntervenantModel = loadModelSafely('./associations/ProgrammeIntervenant', 'ProgrammeIntervenant', sequelize);
  if (programmeIntervenantModel) models.ProgrammeIntervenant = programmeIntervenantModel;
  
  const parcoursLieuModel = loadModelSafely('./associations/ParcoursLieu', 'ParcoursLieu', sequelize);
  if (parcoursLieuModel) models.ParcoursLieu = parcoursLieuModel;
  
  const userOrganisationModel = loadModelSafely('./associations/UserOrganisation', 'UserOrganisation', sequelize);
  if (userOrganisationModel) models.UserOrganisation = userOrganisationModel;
  
  const userSpecialiteModel = loadModelSafely('./associations/UserSpecialite', 'UserSpecialite', sequelize);
  if (userSpecialiteModel) models.UserSpecialite = userSpecialiteModel;

  // 11. Modèles de certifications
  const userCertificationModel = loadModelSafely('./misc/UserCertification', 'UserCertification', sequelize);
  if (userCertificationModel) models.UserCertification = userCertificationModel;

  // 12. Modèles divers
  const mediaModel = loadModelSafely('./misc/Media', 'Media', sequelize);
  if (mediaModel) models.Media = mediaModel;
  
  const favoriModel = loadModelSafely('./misc/Favori', 'Favori', sequelize);
  if (favoriModel) models.Favori = favoriModel;
  
  const commentaireModel = loadModelSafely('./misc/Commentaire', 'Commentaire', sequelize);
  if (commentaireModel) models.Commentaire = commentaireModel;
  
  const critiqueEvaluationModel = loadModelSafely('./misc/CritiqueEvaluation', 'CritiqueEvaluation', sequelize);
  if (critiqueEvaluationModel) models.CritiqueEvaluation = critiqueEvaluationModel;

  // 13. Modèles de tracking et modération
  const vueModel = loadModelSafely('./misc/Vue', 'Vue', sequelize);
  if (vueModel) models.Vue = vueModel;
  
  const signalementModel = loadModelSafely('./misc/Signalement', 'Signalement', sequelize);
  if (signalementModel) models.Signalement = signalementModel;
  
  const notificationModel = loadModelSafely('./misc/Notification', 'Notification', sequelize);
  if (notificationModel) models.Notification = notificationModel;
  
  const auditLogModel = loadModelSafely('./misc/AuditLog', 'AuditLog', sequelize);
  if (auditLogModel) models.AuditLog = auditLogModel;

  // 14. Modèles QR Code
  const qrCodeModel = loadModelSafely('./misc/QRCode', 'QRCode', sequelize);
  if (qrCodeModel) models.QRCode = qrCodeModel;
  
  const qrScanModel = loadModelSafely('./misc/QRScan', 'QRScan', sequelize);
  if (qrScanModel) models.QRScan = qrScanModel;

  console.log(`📦 ${Object.keys(models).length} modèles chargés avec succès`);
  
  return models;
};

// Initialiser les associations
const initializeAssociations = (models) => {
  console.log('🔗 Initialisation des associations...');
  
  // Vérifier les modèles disponibles avant les associations
  console.log('Modèles disponibles:', Object.keys(models));
  
  // Vérifier spécifiquement les modèles problématiques
  if (!models.Intervenant) {
    console.error('⚠️  Le modèle Intervenant n\'est pas chargé !');
  }
  
  if (!models.Specialite) {
    console.error('⚠️  Le modèle Specialite n\'est pas chargé !');
  }
  
  Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
      try {
        console.log(`  → Associations pour ${modelName}`);
        models[modelName].associate(models);
      } catch (error) {
        console.error(`  ❌ Erreur associations ${modelName}:`, error.message);
        // Continuer avec les autres modèles même en cas d'erreur
      }
    }
  });
  
  console.log('✅ Associations terminées');
};

// Fonction utilitaire pour insérer des données si le modèle existe
const insertDataIfModelExists = async (models, modelName, data, insertFunction) => {
  if (models[modelName]) {
    try {
      await insertFunction(models[modelName], data);
      console.log(`✅ Données pour ${modelName} insérées`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'insertion des données pour ${modelName}:`, error.message);
    }
  } else {
    console.log(`⚠️  Modèle ${modelName} non disponible - données ignorées`);
  }
};

// Données par défaut
const insertDefaultData = async (models) => {
  try {
    console.log('📊 Insertion des données par défaut...');
    
    // APPEL À LA FONCTION IMPORTDATA() POUR LES DONNÉES GÉOGRAPHIQUES
    // Vérifier d'abord que les modèles géographiques existent
    if (models.Wilaya && models.Daira && models.Commune) {
      await importData(models);
    } else {
      console.log('⚠️  Modèles géographiques manquants - import des données d\'Algérie ignoré');
    }
    
    // Langues par défaut
    const defaultLangues = [
      { nom: 'Tamazight', code: 'tm' },
      { nom: 'Tifinagh', code: 'tif' },
      { nom: 'Arabe', code: 'ar' },
      { nom: 'Derja', code: 'de' },
      { nom: 'Français', code: 'fr' },
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
    
    // Catégories par défaut
    const defaultCategories = [
      'Roman', 'Poésie', 'Bande dessinée', 'Essai', 'Histoire', 'Biographie',
      'Peinture', 'Sculpture', 'Documentaire', 'Fiction', 'Jazz', 'Classique',
      'Musique traditionnelle', 'Cinéma d\'auteur', 'Comédie', 'Drame',
      'Court métrage', 'Photographie'
    ];
    
    await insertDataIfModelExists(models, 'Categorie', defaultCategories, async (model, data) => {
      for (const nom of data) {
        await model.findOrCreate({
          where: { nom },
          defaults: { nom }
        });
      }
    });
    
    // Types d'œuvres par défaut
    const defaultTypesOeuvres = [
      { nom_type: 'Livre', description: 'Œuvres littéraires et ouvrages' },
      { nom_type: 'Film', description: 'Œuvres cinématographiques' },
      { nom_type: 'Album Musical', description: 'Œuvres musicales' },
      { nom_type: 'Article', description: 'Articles de presse et blogs' },
      { nom_type: 'Article Scientifique', description: 'Publications scientifiques' },
      { nom_type: 'Artisanat', description: 'Œuvres artisanales' },
      { nom_type: 'Œuvre d\'Art', description: 'Œuvres d\'art visuel' },
      { nom_type: 'Photographie', description: 'Œuvres photographiques' },
      { nom_type: 'Théâtre', description: 'Pièces de théâtre' },
      { nom_type: 'Danse', description: 'Spectacles de danse' },
      { nom_type: 'Performance', description: 'Art performance' },
      { nom_type: 'Installation', description: 'Installations artistiques' }
    ];
    
    await insertDataIfModelExists(models, 'TypeOeuvre', defaultTypesOeuvres, async (model, data) => {
      for (const typeOeuvre of data) {
        await model.findOrCreate({
          where: { nom_type: typeOeuvre.nom_type },
          defaults: typeOeuvre
        });
      }
    });
    
    // Types d'événements par défaut
    const defaultTypesEvenements = [
      { nom_type: 'Festival', description: 'Festivals culturels' },
      { nom_type: 'Exposition', description: 'Expositions d\'art' },
      { nom_type: 'Concert', description: 'Concerts et spectacles musicaux' },
      { nom_type: 'Conférence', description: 'Conférences et colloques' },
      { nom_type: 'Atelier', description: 'Ateliers créatifs' },
      { nom_type: 'Visite guidée', description: 'Visites culturelles' },
      { nom_type: 'Spectacle', description: 'Spectacles vivants' },
      { nom_type: 'Projection', description: 'Projections cinématographiques' },
      { nom_type: 'Lecture', description: 'Lectures publiques' },
      { nom_type: 'Débat', description: 'Débats culturels' }
    ];
    
    await insertDataIfModelExists(models, 'TypeEvenement', defaultTypesEvenements, async (model, data) => {
      for (const typeEvenement of data) {
        await model.findOrCreate({
          where: { nom_type: typeEvenement.nom_type },
          defaults: typeEvenement
        });
      }
    });
    
    // Types d'organisations par défaut
    const defaultTypesOrganisations = [
      'Association culturelle',
      'Ministère',
      'Collectivité territoriale',
      'Institution publique',
      'Fondation',
      'ONG',
      'Entreprise privée',
      'Université',
      'École',
      'Musée',
      'Bibliothèque'
    ];
    
    await insertDataIfModelExists(models, 'TypeOrganisation', defaultTypesOrganisations, async (model, data) => {
      for (const nom of data) {
        await model.findOrCreate({
          where: { nom },
          defaults: { nom }
        });
      }
    });
    
    // Rôles par défaut
    const defaultRoles = [
      { nom_role: 'Administrateur', description: 'Accès complet au système' },
      { nom_role: 'Visiteur', description: 'Utilisateur standard' },
      { nom_role: 'Professionnel', description: 'Professionnel de la culture' },
      { nom_role: 'Modérateur', description: 'Modération du contenu' }
    ];
    
    await insertDataIfModelExists(models, 'Role', defaultRoles, async (model, data) => {
      for (const role of data) {
        await model.findOrCreate({
          where: { nom_role: role.nom_role },
          defaults: role
        });
      }
    });
    
    // Matériaux par défaut
    const defaultMateriaux = [
      { nom: 'Bois', description: 'Matériau naturel' },
      { nom: 'Pierre', description: 'Matériau minéral' },
      { nom: 'Métal', description: 'Matériau métallique' },
      { nom: 'Céramique', description: 'Terre cuite' },
      { nom: 'Textile', description: 'Fibres textiles' },
      { nom: 'Cuir', description: 'Peau animale traitée' },
      { nom: 'Verre', description: 'Matériau transparent' },
      { nom: 'Papier', description: 'Support d\'écriture' },
      { nom: 'Plastique', description: 'Matériau synthétique' }
    ];
    
    await insertDataIfModelExists(models, 'Materiau', defaultMateriaux, async (model, data) => {
      for (const materiau of data) {
        await model.findOrCreate({
          where: { nom: materiau.nom },
          defaults: materiau
        });
      }
    });
    
    // Techniques par défaut
    const defaultTechniques = [
      { nom: 'Sculpture', description: 'Art du volume' },
      { nom: 'Peinture', description: 'Art pictural' },
      { nom: 'Gravure', description: 'Art de l\'estampe' },
      { nom: 'Tissage', description: 'Entrelacement de fils' },
      { nom: 'Poterie', description: 'Façonnage de l\'argile' },
      { nom: 'Broderie', description: 'Ornementation textile' },
      { nom: 'Marqueterie', description: 'Décoration en bois' },
      { nom: 'Ciselure', description: 'Travail du métal' },
      { nom: 'Calligraphie', description: 'Art de l\'écriture' },
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
    
    // Spécialités par défaut
    const defaultSpecialites = [
      { nom_specialite: 'Arts visuels', description: 'Peinture, sculpture, photographie', categorie: 'Arts' },
      { nom_specialite: 'Musique', description: 'Composition, interprétation', categorie: 'Arts' },
      { nom_specialite: 'Littérature', description: 'Écriture, poésie', categorie: 'Arts' },
      { nom_specialite: 'Théâtre', description: 'Mise en scène, jeu d\'acteur', categorie: 'Arts' },
      { nom_specialite: 'Danse', description: 'Chorégraphie, interprétation', categorie: 'Arts' },
      { nom_specialite: 'Artisanat', description: 'Techniques traditionnelles', categorie: 'Métiers' },
      { nom_specialite: 'Conservation', description: 'Préservation du patrimoine', categorie: 'Métiers' },
      { nom_specialite: 'Médiation culturelle', description: 'Animation, pédagogie', categorie: 'Métiers' },
      { nom_specialite: 'Production', description: 'Organisation d\'événements', categorie: 'Métiers' },
      { nom_specialite: 'Communication', description: 'Promotion culturelle', categorie: 'Métiers' }
    ];
    
    await insertDataIfModelExists(models, 'Specialite', defaultSpecialites, async (model, data) => {
      for (const specialite of data) {
        await model.findOrCreate({
          where: { nom_specialite: specialite.nom_specialite },
          defaults: specialite
        });
      }
    });
    
    console.log('✅ Données par défaut insérées avec succès.');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données par défaut:', error);
    throw error;
  }
};

// Initialisation complète de la base de données
const initializeDatabase = async (config = {}) => {
  try {
    console.log('🚀 Initialisation de la base de données...');
    
    // 1. Créer la connexion
    const sequelize = createDatabaseConnection(config);
    
    // 2. Tester la connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie avec succès.');
    
    // 3. Charger tous les modèles
    const models = loadModels(sequelize);
    console.log(`✅ ${Object.keys(models).length} modèles chargés.`);
    
    // 4. Initialiser les associations
    initializeAssociations(models);
    console.log('✅ Associations entre modèles configurées.');
    
    // 5. Synchroniser avec la base de données
    // Désactiver temporairement les contraintes de clés étrangères pour MySQL
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      console.log('🔧 Contraintes de clés étrangères désactivées temporairement');
    } catch (error) {
      console.log('⚠️  Impossible de désactiver les contraintes FK (normal si pas MySQL)');
    }
    
    // Corriger le problème de référence 'lieu' vs 'lieux'
    // Créer d'abord toutes les tables sans contraintes
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Base de données synchronisée.');
    
    // Réactiver les contraintes de clés étrangères
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('🔧 Contraintes de clés étrangères réactivées');
    } catch (error) {
      console.log('⚠️  Impossible de réactiver les contraintes FK');
    }
    
    // 6. Insérer les données par défaut (inclut maintenant l'import géographique)
    await insertDefaultData(models);
    console.log('✅ Données par défaut insérées.');
    
    console.log('🎉 Base de données initialisée avec succès !');
    
    return { sequelize, models };
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
};

// Utilitaire pour remettre à zéro la base
const resetDatabase = async (config = {}) => {
  console.log('⚠️  ATTENTION: Remise à zéro de la base de données !');
  
  let sequelize = createDatabaseConnection(config);
  
  try {
    // Désactiver les contraintes FK
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('🔧 Contraintes FK désactivées');
    
    // Obtenir la liste de toutes les tables
    const [tables] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();"
    );
    
    // Supprimer toutes les tables une par une
    for (const { table_name } of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS \`${table_name}\`;`);
        console.log(`  🗑️  Table ${table_name} supprimée`);
      } catch (err) {
        console.log(`  ⚠️  Impossible de supprimer ${table_name}: ${err.message}`);
      }
    }
    
    console.log('🗑️  Toutes les tables supprimées');
    
    // Fermer la connexion actuelle
    await sequelize.close();
    
    // Créer une nouvelle connexion pour éviter les problèmes de cache
    sequelize = createDatabaseConnection(config);
    
    // Charger les modèles
    const models = loadModels(sequelize);
    console.log(`✅ ${Object.keys(models).length} modèles chargés.`);
    
    // Vérifier que les modèles critiques sont chargés
    const requiredModels = ['User', 'Lieu', 'Intervenant', 'Programme', 'Evenement', 'Specialite'];
    for (const modelName of requiredModels) {
      if (!models[modelName]) {
        console.error(`❌ Modèle requis manquant : ${modelName}`);
      }
    }
    
    // Initialiser les associations
    initializeAssociations(models);
    console.log('✅ Associations configurées.');
    
    // Désactiver à nouveau les FK pour la synchronisation
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    
    // Synchroniser avec force: true pour créer toutes les tables
    // Utiliser alter: false pour éviter les erreurs d'index
    await sequelize.sync({ force: true, alter: false });
    console.log('✅ Tables recréées.');
    
    // Réactiver les contraintes FK
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('🔧 Contraintes FK réactivées');
    
    // Insérer les données par défaut
    await insertDefaultData(models);
    console.log('✅ Données par défaut insérées.');
    
    console.log('🎉 Base de données réinitialisée avec succès !');
    
    return { sequelize, models };
    
  } catch (error) {
    console.error('❌ Erreur lors de la remise à zéro:', error);
    // Essayer de réactiver les FK en cas d'erreur
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    } catch (e) {
      // Ignorer si échec
    }
    throw error;
  }
};

module.exports = {
  initializeDatabase,
  resetDatabase,
  loadModels,
  initializeAssociations,
  insertDefaultData,
  importData // Export de la fonction importData pour utilisation séparée si nécessaire
};