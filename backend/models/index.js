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
  // 1. Après les modèles de base (User, Role) - Ajouter TypeUser
const typeUserModel = loadModelSafely('./classifications/TypeUser.js', 'TypeUser', sequelize);
if (typeUserModel) models.TypeUser = typeUserModel;

// 2. Après TypeOeuvre et Genre - Ajouter les tables de liaison pour la hiérarchie
const typeOeuvreGenreModel = loadModelSafely('./associations/TypeOeuvreGenre', 'TypeOeuvreGenre', sequelize);
if (typeOeuvreGenreModel) models.TypeOeuvreGenre = typeOeuvreGenreModel;

const genreCategorieModel = loadModelSafely('./associations/GenreCategorie', 'GenreCategorie', sequelize);
if (genreCategorieModel) models.GenreCategorie = genreCategorieModel;
  const localiteModel = loadModelSafely('./geography/Localite', 'Localite', sequelize);
  if (localiteModel) models.Localite = localiteModel;
const oeuvreIntervenantModel = loadModelSafely('./associations/OeuvreIntervenant', 'OeuvreIntervenant', sequelize);
if (oeuvreIntervenantModel) models.OeuvreIntervenant = oeuvreIntervenantModel;
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
const emailVerificationModel = loadModelSafely('./misc/EmailVerification', 'EmailVerification', sequelize);
if (emailVerificationModel) models.EmailVerification = emailVerificationModel;
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
      { nom_role: 'User', description: 'Utilisateur standard' },
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
     const typesUtilisateurs = [
      { nom_type: 'visiteur', description: 'Utilisateur standard du site' },
      { nom_type: 'ecrivain', description: 'Auteur de livres et œuvres littéraires' },
      { nom_type: 'journaliste', description: 'Professionnel de l\'information et des médias' },
      { nom_type: 'scientifique', description: 'Chercheur ou académique' },
      { nom_type: 'acteur', description: 'Professionnel du cinéma et du théâtre' },
      { nom_type: 'artiste', description: 'Créateur d\'œuvres artistiques' },
      { nom_type: 'artisan', description: 'Créateur d\'objets artisanaux' },
      { nom_type: 'realisateur', description: 'Professionnel de la réalisation audiovisuelle' },
      { nom_type: 'musicien', description: 'Compositeur ou interprète musical' },
      { nom_type: 'photographe', description: 'Professionnel de la photographie' },
      { nom_type: 'danseur', description: 'Professionnel de la danse' },
      { nom_type: 'sculpteur', description: 'Créateur de sculptures' },
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

    // =====================================================
    // 2. TYPES D'ŒUVRES
    // =====================================================
    console.log('📚 Création des types d\'œuvres...');
    
    const typesOeuvres = [
      { nom_type: 'Livre', description: 'Œuvres littéraires écrites' },
      { nom_type: 'Film', description: 'Œuvres cinématographiques' },
      { nom_type: 'Album Musical', description: 'Œuvres musicales' },
      { nom_type: 'Article', description: 'Articles de presse et blog' },
      { nom_type: 'Article Scientifique', description: 'Publications académiques' },
      { nom_type: 'Œuvre d\'Art', description: 'Peintures, dessins, installations' },
      { nom_type: 'Artisanat', description: 'Créations artisanales traditionnelles' }
    ];

    const typeOeuvreMap = {};
    for (const typeData of typesOeuvres) {
      const [type] = await models.TypeOeuvre.findOrCreate({
        where: { nom_type: typeData.nom_type },
        defaults: typeData
      });
      typeOeuvreMap[typeData.nom_type] = type.id_type_oeuvre;
    }

    // =====================================================
    // 3. GENRES
    // =====================================================
    console.log('🎭 Création des genres...');
    
    const genres = [
      // Genres littéraires (1-10)
      { nom: 'Roman', description: 'Récit long en prose', slug: 'roman' },
      { nom: 'Nouvelle', description: 'Récit court', slug: 'nouvelle' },
      { nom: 'Essai', description: 'Texte argumentatif', slug: 'essai' },
      { nom: 'Poésie', description: 'Œuvre en vers', slug: 'poesie' },
      { nom: 'Biographie', description: 'Récit de vie', slug: 'biographie' },
      { nom: 'Théâtre', description: 'Texte destiné à être joué', slug: 'theatre' },
      { nom: 'Bande Dessinée', description: 'Récit graphique', slug: 'bande-dessinee' },
      { nom: 'Conte', description: 'Récit merveilleux', slug: 'conte' },
      { nom: 'Chronique', description: 'Récits d\'événements', slug: 'chronique' },
      { nom: 'Mémoires', description: 'Souvenirs personnels', slug: 'memoires' },
      
      // Genres cinématographiques (11-25)
      { nom: 'Action', description: 'Films d\'action et d\'aventure', slug: 'action' },
      { nom: 'Comédie', description: 'Films humoristiques', slug: 'comedie' },
      { nom: 'Drame', description: 'Films dramatiques', slug: 'drame' },
      { nom: 'Thriller', description: 'Films à suspense', slug: 'thriller-film' },
      { nom: 'Science-Fiction', description: 'Films de SF', slug: 'science-fiction-film' },
      { nom: 'Fantastique', description: 'Films fantastiques', slug: 'fantastique-film' },
      { nom: 'Horreur', description: 'Films d\'épouvante', slug: 'horreur' },
      { nom: 'Documentaire', description: 'Films documentaires', slug: 'documentaire' },
      { nom: 'Animation', description: 'Films d\'animation', slug: 'animation' },
      { nom: 'Romance', description: 'Films romantiques', slug: 'romance-film' },
      { nom: 'Western', description: 'Films de western', slug: 'western' },
      { nom: 'Guerre', description: 'Films de guerre', slug: 'guerre' },
      { nom: 'Historique', description: 'Films historiques', slug: 'historique-film' },
      { nom: 'Musical', description: 'Films musicaux', slug: 'musical-film' },
      { nom: 'Policier', description: 'Films policiers', slug: 'policier-film' },
      
      // Genres musicaux (26-40)
      { nom: 'Rock', description: 'Musique rock', slug: 'rock' },
      { nom: 'Pop', description: 'Musique pop', slug: 'pop' },
      { nom: 'Jazz', description: 'Musique jazz', slug: 'jazz' },
      { nom: 'Classique', description: 'Musique classique', slug: 'classique' },
      { nom: 'Électronique', description: 'Musique électronique', slug: 'electronique' },
      { nom: 'Hip-Hop', description: 'Musique hip-hop', slug: 'hip-hop' },
      { nom: 'Folk', description: 'Musique folk', slug: 'folk' },
      { nom: 'Metal', description: 'Musique metal', slug: 'metal' },
      { nom: 'R&B', description: 'Rhythm and blues', slug: 'rnb' },
      { nom: 'Reggae', description: 'Musique reggae', slug: 'reggae' },
      { nom: 'Blues', description: 'Musique blues', slug: 'blues' },
      { nom: 'Country', description: 'Musique country', slug: 'country' },
      { nom: 'Raï', description: 'Musique raï algérienne', slug: 'rai' },
      { nom: 'Chaâbi', description: 'Musique chaâbi algérienne', slug: 'chaabi' },
      { nom: 'Andalou', description: 'Musique andalouse', slug: 'andalou' },
      
      // Genres pour Articles (41-50)
      { nom: 'Actualité', description: 'Articles d\'actualité', slug: 'actualite' },
      { nom: 'Opinion', description: 'Articles d\'opinion', slug: 'opinion' },
      { nom: 'Analyse', description: 'Articles d\'analyse', slug: 'analyse' },
      { nom: 'Interview', description: 'Interviews', slug: 'interview' },
      { nom: 'Reportage', description: 'Reportages', slug: 'reportage' },
      { nom: 'Éditorial', description: 'Éditoriaux', slug: 'editorial' },
      { nom: 'Critique', description: 'Critiques', slug: 'critique' },
      { nom: 'Portrait', description: 'Portraits', slug: 'portrait' },
      { nom: 'Enquête', description: 'Articles d\'enquête', slug: 'enquete' },
      { nom: 'Tribune', description: 'Tribunes', slug: 'tribune' },
      
      // Genres pour Articles Scientifiques (51-58)
      { nom: 'Recherche', description: 'Articles de recherche', slug: 'recherche' },
      { nom: 'Méta-analyse', description: 'Méta-analyses', slug: 'meta-analyse' },
      { nom: 'Revue systématique', description: 'Revues systématiques', slug: 'revue-systematique' },
      { nom: 'Étude de cas', description: 'Études de cas', slug: 'etude-de-cas' },
      { nom: 'Article de synthèse', description: 'Articles de synthèse', slug: 'article-synthese' },
      { nom: 'Communication courte', description: 'Communications courtes', slug: 'communication-courte' },
      { nom: 'Lettre à l\'éditeur', description: 'Lettres à l\'éditeur', slug: 'lettre-editeur' },
      { nom: 'Rapport technique', description: 'Rapports techniques', slug: 'rapport-technique' },
      
      // Genres pour Arts visuels (59-68)
      { nom: 'Peinture', description: 'Œuvres peintes', slug: 'peinture' },
      { nom: 'Sculpture', description: 'Œuvres sculptées', slug: 'sculpture' },
      { nom: 'Photographie', description: 'Œuvres photographiques', slug: 'photographie' },
      { nom: 'Dessin', description: 'Œuvres dessinées', slug: 'dessin' },
      { nom: 'Gravure', description: 'Œuvres gravées', slug: 'gravure' },
      { nom: 'Installation', description: 'Installations artistiques', slug: 'installation' },
      { nom: 'Art numérique', description: 'Œuvres numériques', slug: 'art-numerique' },
      { nom: 'Street Art', description: 'Art urbain', slug: 'street-art' },
      { nom: 'Calligraphie', description: 'Art de la calligraphie', slug: 'calligraphie' },
      { nom: 'Collage', description: 'Œuvres en collage', slug: 'collage' },
      
      // Genres pour Artisanat (69-80)
      { nom: 'Poterie', description: 'Poterie traditionnelle', slug: 'poterie' },
      { nom: 'Tissage', description: 'Tissage traditionnel', slug: 'tissage' },
      { nom: 'Bijouterie', description: 'Création de bijoux', slug: 'bijouterie' },
      { nom: 'Maroquinerie', description: 'Travail du cuir', slug: 'maroquinerie' },
      { nom: 'Vannerie', description: 'Travail de vannerie', slug: 'vannerie' },
      { nom: 'Ébénisterie', description: 'Travail du bois', slug: 'ebenisterie' },
      { nom: 'Ferronnerie', description: 'Travail du métal', slug: 'ferronnerie' },
      { nom: 'Céramique', description: 'Art de la céramique', slug: 'ceramique' },
      { nom: 'Broderie', description: 'Art de la broderie', slug: 'broderie' },
      { nom: 'Tapisserie', description: 'Art de la tapisserie', slug: 'tapisserie' },
      { nom: 'Dinanderie', description: 'Travail du cuivre', slug: 'dinanderie' },
      { nom: 'Zellige', description: 'Mosaïque traditionnelle', slug: 'zellige' }
    ];

    const genreMap = {};
    for (const genreData of genres) {
      const [genre] = await models.Genre.findOrCreate({
        where: { nom: genreData.nom },
        defaults: genreData
      });
      genreMap[genreData.nom] = genre.id_genre;
    }

    // =====================================================
    // 4. CATÉGORIES
    // =====================================================
    console.log('📁 Création des catégories...');
    
    const categories = [
      // Catégories littéraires (1-20)
      { nom: 'Romance', description: 'Histoires d\'amour' },
      { nom: 'Thriller', description: 'Suspense et tension' },
      { nom: 'Fantasy', description: 'Mondes imaginaires' },
      { nom: 'Science-Fiction', description: 'Futur et technologie' },
      { nom: 'Historique', description: 'Basé sur l\'histoire' },
      { nom: 'Policier', description: 'Enquêtes et mystères' },
      { nom: 'Horreur', description: 'Épouvante et terreur' },
      { nom: 'Contemporain', description: 'Époque actuelle' },
      { nom: 'Jeunesse', description: 'Pour les jeunes' },
      { nom: 'Young Adult', description: 'Jeunes adultes' },
      { nom: 'Dystopie', description: 'Sociétés futures sombres' },
      { nom: 'Aventure', description: 'Récits d\'aventures' },
      { nom: 'Guerre', description: 'Récits de guerre' },
      { nom: 'Espionnage', description: 'Histoires d\'espions' },
      { nom: 'Psychologique', description: 'Exploration psychologique' },
      { nom: 'Social', description: 'Questions sociales' },
      { nom: 'Philosophique', description: 'Réflexions philosophiques' },
      { nom: 'Satirique', description: 'Satire sociale' },
      { nom: 'Épistolaire', description: 'Roman par lettres' },
      { nom: 'Autobiographique', description: 'Basé sur la vie de l\'auteur' },
      
      // Catégories cinéma (21-40)
      { nom: 'Super-héros', description: 'Films de super-héros' },
      { nom: 'Arts martiaux', description: 'Films d\'arts martiaux' },
      { nom: 'Catastrophe', description: 'Films catastrophe' },
      { nom: 'Biographique', description: 'Biographies filmées' },
      { nom: 'Sport', description: 'Films de sport' },
      { nom: 'Road Movie', description: 'Films de voyage' },
      { nom: 'Film noir', description: 'Genre noir classique' },
      { nom: 'Néo-noir', description: 'Noir moderne' },
      { nom: 'Zombie', description: 'Films de zombies' },
      { nom: 'Vampire', description: 'Films de vampires' },
      { nom: 'Space Opera', description: 'Épopées spatiales' },
      { nom: 'Cyberpunk', description: 'Futur dystopique high-tech' },
      { nom: 'Steampunk', description: 'Rétro-futurisme vapeur' },
      { nom: 'Post-apocalyptique', description: 'Après l\'apocalypse' },
      { nom: 'Survival', description: 'Films de survie' },
      { nom: 'Slasher', description: 'Films slasher' },
      { nom: 'Found Footage', description: 'Faux documentaires' },
      { nom: 'Mockumentary', description: 'Faux documentaires comiques' },
      { nom: 'Anthologie', description: 'Films à sketches' },
      { nom: 'Expérimental', description: 'Cinéma expérimental' },
      
      // Catégories musique (41-60)
      { nom: 'Rock Alternatif', description: 'Rock alternatif' },
      { nom: 'Hard Rock', description: 'Rock dur' },
      { nom: 'Punk Rock', description: 'Punk rock' },
      { nom: 'Rock Progressif', description: 'Rock progressif' },
      { nom: 'Indie Rock', description: 'Rock indépendant' },
      { nom: 'Pop Rock', description: 'Pop rock' },
      { nom: 'Electro Pop', description: 'Pop électronique' },
      { nom: 'K-Pop', description: 'Pop coréenne' },
      { nom: 'Indie Pop', description: 'Pop indépendante' },
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
      
      // Catégories articles (61-80)
      { nom: 'Politique', description: 'Articles politiques' },
      { nom: 'Économie', description: 'Articles économiques' },
      { nom: 'Société', description: 'Articles de société' },
      { nom: 'International', description: 'Actualité internationale' },
      { nom: 'Sport', description: 'Articles sportifs' },
      { nom: 'Culture', description: 'Articles culturels' },
      { nom: 'Technologie', description: 'Articles tech' },
      { nom: 'Environnement', description: 'Articles environnement' },
      { nom: 'Santé', description: 'Articles santé' },
      { nom: 'Éducation', description: 'Articles éducation' },
      { nom: 'Sciences', description: 'Articles scientifiques' },
      { nom: 'Justice', description: 'Articles justice' },
      { nom: 'Faits divers', description: 'Faits divers' },
      { nom: 'Médias', description: 'Articles sur les médias' },
      { nom: 'Lifestyle', description: 'Art de vivre' },
      { nom: 'Gastronomie', description: 'Articles gastronomie' },
      { nom: 'Tourisme', description: 'Articles tourisme' },
      { nom: 'Mode', description: 'Articles mode' },
      { nom: 'People', description: 'Célébrités' },
      { nom: 'Gaming', description: 'Jeux vidéo' },
      
      // Catégories sciences (81-95)
      { nom: 'Biologie', description: 'Sciences de la vie' },
      { nom: 'Physique', description: 'Sciences physiques' },
      { nom: 'Chimie', description: 'Sciences chimiques' },
      { nom: 'Mathématiques', description: 'Sciences mathématiques' },
      { nom: 'Informatique', description: 'Sciences informatiques' },
      { nom: 'Médecine', description: 'Sciences médicales' },
      { nom: 'Psychologie', description: 'Sciences psychologiques' },
      { nom: 'Sociologie', description: 'Sciences sociales' },
      { nom: 'Anthropologie', description: 'Sciences anthropologiques' },
      { nom: 'Archéologie', description: 'Sciences archéologiques' },
      { nom: 'Géologie', description: 'Sciences de la Terre' },
      { nom: 'Astronomie', description: 'Sciences astronomiques' },
      { nom: 'Écologie', description: 'Sciences écologiques' },
      { nom: 'Génétique', description: 'Sciences génétiques' },
      { nom: 'Neurosciences', description: 'Sciences du cerveau' },
      
      // Catégories arts (96-110)
      { nom: 'Portrait', description: 'Portraits artistiques' },
      { nom: 'Paysage', description: 'Paysages' },
      { nom: 'Nature morte', description: 'Natures mortes' },
      { nom: 'Abstrait', description: 'Art abstrait' },
      { nom: 'Figuratif', description: 'Art figuratif' },
      { nom: 'Surréaliste', description: 'Art surréaliste' },
      { nom: 'Impressionniste', description: 'Style impressionniste' },
      { nom: 'Expressionniste', description: 'Style expressionniste' },
      { nom: 'Cubiste', description: 'Style cubiste' },
      { nom: 'Minimaliste', description: 'Art minimaliste' },
      { nom: 'Pop Art', description: 'Pop art' },
      { nom: 'Art Déco', description: 'Style art déco' },
      { nom: 'Art Nouveau', description: 'Style art nouveau' },
      { nom: 'Contemporain', description: 'Art contemporain' },
      { nom: 'Traditionnel', description: 'Art traditionnel' },
      
      // Catégories artisanat (111-125)
      { nom: 'Utilitaire', description: 'Objets utilitaires' },
      { nom: 'Décoratif', description: 'Objets décoratifs' },
      { nom: 'Rituel', description: 'Objets rituels' },
      { nom: 'Mobilier', description: 'Meubles artisanaux' },
      { nom: 'Vestimentaire', description: 'Vêtements artisanaux' },
      { nom: 'Accessoires', description: 'Accessoires artisanaux' },
      { nom: 'Instruments', description: 'Instruments artisanaux' },
      { nom: 'Jouets', description: 'Jouets artisanaux' },
      { nom: 'Cuisine', description: 'Ustensiles de cuisine' },
      { nom: 'Jardin', description: 'Objets de jardin' },
      { nom: 'Architecture', description: 'Éléments architecturaux' },
      { nom: 'Religieux', description: 'Objets religieux' },
      { nom: 'Festif', description: 'Objets festifs' },
      { nom: 'Traditionnel Algérien', description: 'Artisanat algérien' },
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

    // =====================================================
    // 5. ASSOCIATIONS TYPE_OEUVRE → GENRE
    // =====================================================
    console.log('🔗 Création des associations Type → Genre...');
    
    const typeGenreAssociations = [
      // Livre
      { type: 'Livre', genres: ['Roman', 'Nouvelle', 'Essai', 'Poésie', 'Biographie', 'Théâtre', 'Bande Dessinée', 'Conte', 'Chronique', 'Mémoires'] },
      
      // Film
      { type: 'Film', genres: ['Action', 'Comédie', 'Drame', 'Thriller', 'Science-Fiction', 'Fantastique', 'Horreur', 'Documentaire', 'Animation', 'Romance', 'Western', 'Guerre', 'Historique', 'Musical', 'Policier'] },
      
      // Album Musical
      { type: 'Album Musical', genres: ['Rock', 'Pop', 'Jazz', 'Classique', 'Électronique', 'Hip-Hop', 'Folk', 'Metal', 'R&B', 'Reggae', 'Blues', 'Country', 'Raï', 'Chaâbi', 'Andalou'] },
      
      // Article
      { type: 'Article', genres: ['Actualité', 'Opinion', 'Analyse', 'Interview', 'Reportage', 'Éditorial', 'Critique', 'Portrait', 'Enquête', 'Tribune'] },
      
      // Article Scientifique
      { type: 'Article Scientifique', genres: ['Recherche', 'Méta-analyse', 'Revue systématique', 'Étude de cas', 'Article de synthèse', 'Communication courte', 'Lettre à l\'éditeur', 'Rapport technique'] },
      
      // Œuvre d'Art
      { type: 'Œuvre d\'Art', genres: ['Peinture', 'Sculpture', 'Photographie', 'Dessin', 'Gravure', 'Installation', 'Art numérique', 'Street Art', 'Calligraphie', 'Collage'] },
      
      // Artisanat
      { type: 'Artisanat', genres: ['Poterie', 'Tissage', 'Bijouterie', 'Maroquinerie', 'Vannerie', 'Ébénisterie', 'Ferronnerie', 'Céramique', 'Broderie', 'Tapisserie', 'Dinanderie', 'Zellige'] }
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

    // =====================================================
    // 6. ASSOCIATIONS GENRE → CATÉGORIE
    // =====================================================
    console.log('🔗 Création des associations Genre → Catégorie...');
    
    const genreCategorieAssociations = [
      // Genres littéraires
      { genre: 'Roman', categories: ['Romance', 'Thriller', 'Fantasy', 'Science-Fiction', 'Historique', 'Policier', 'Horreur', 'Contemporain', 'Jeunesse', 'Young Adult', 'Dystopie', 'Aventure', 'Guerre', 'Espionnage', 'Psychologique', 'Social', 'Philosophique', 'Satirique', 'Épistolaire', 'Autobiographique'] },
      { genre: 'Nouvelle', categories: ['Fantasy', 'Science-Fiction', 'Policier', 'Horreur', 'Contemporain', 'Psychologique', 'Social'] },
      { genre: 'Essai', categories: ['Philosophique', 'Social', 'Politique', 'Économie', 'Culture', 'Sciences', 'Historique'] },
      { genre: 'Poésie', categories: ['Contemporain', 'Classique', 'Romance', 'Social', 'Philosophique'] },
      { genre: 'Biographie', categories: ['Historique', 'Politique', 'Culture', 'Sport', 'Sciences', 'Autobiographique'] },
      
      // Genres cinématographiques
      { genre: 'Action', categories: ['Super-héros', 'Arts martiaux', 'Espionnage', 'Guerre', 'Aventure', 'Catastrophe', 'Survival'] },
      { genre: 'Comédie', categories: ['Romance', 'Satirique', 'Mockumentary', 'Sport', 'Road Movie'] },
      { genre: 'Drame', categories: ['Psychologique', 'Social', 'Historique', 'Biographique', 'Guerre', 'Romance'] },
      { genre: 'Thriller', categories: ['Policier', 'Psychologique', 'Espionnage', 'Film noir', 'Néo-noir', 'Survival'] },
      { genre: 'Science-Fiction', categories: ['Space Opera', 'Cyberpunk', 'Steampunk', 'Post-apocalyptique', 'Dystopie', 'Super-héros'] },
      { genre: 'Horreur', categories: ['Zombie', 'Vampire', 'Slasher', 'Found Footage', 'Psychologique', 'Survival'] },
      
      // Genres musicaux
      { genre: 'Rock', categories: ['Rock Alternatif', 'Hard Rock', 'Punk Rock', 'Rock Progressif', 'Indie Rock', 'Pop Rock'] },
      { genre: 'Pop', categories: ['Pop Rock', 'Electro Pop', 'K-Pop', 'Indie Pop'] },
      { genre: 'Jazz', categories: ['Bebop', 'Smooth Jazz', 'Jazz Fusion', 'Free Jazz'] },
      { genre: 'Électronique', categories: ['House', 'Techno', 'Dubstep', 'Ambient'] },
      { genre: 'Hip-Hop', categories: ['Trap', 'Drill', 'Afrobeat'] },
      
      // Genres articles
      { genre: 'Actualité', categories: ['Politique', 'Économie', 'Société', 'International', 'Sport', 'Culture', 'Technologie', 'Environnement', 'Santé', 'Éducation', 'Justice', 'Faits divers'] },
      { genre: 'Opinion', categories: ['Politique', 'Société', 'Culture', 'Économie', 'International', 'Environnement'] },
      { genre: 'Analyse', categories: ['Politique', 'Économie', 'Société', 'International', 'Culture', 'Technologie', 'Sciences'] },
      { genre: 'Interview', categories: ['Politique', 'Culture', 'Sport', 'Sciences', 'Économie', 'People'] },
      { genre: 'Reportage', categories: ['International', 'Société', 'Environnement', 'Culture', 'Sport', 'Guerre'] },
      
      // Genres scientifiques
      { genre: 'Recherche', categories: ['Biologie', 'Physique', 'Chimie', 'Mathématiques', 'Informatique', 'Médecine', 'Psychologie', 'Sociologie', 'Anthropologie', 'Archéologie', 'Géologie', 'Astronomie', 'Écologie', 'Génétique', 'Neurosciences'] },
      { genre: 'Méta-analyse', categories: ['Médecine', 'Psychologie', 'Biologie', 'Sciences sociales'] },
      { genre: 'Étude de cas', categories: ['Médecine', 'Psychologie', 'Sociologie', 'Anthropologie', 'Éducation'] },
      
      // Genres arts visuels
      { genre: 'Peinture', categories: ['Portrait', 'Paysage', 'Nature morte', 'Abstrait', 'Figuratif', 'Surréaliste', 'Impressionniste', 'Expressionniste', 'Cubiste', 'Minimaliste', 'Pop Art', 'Contemporain', 'Traditionnel'] },
      { genre: 'Photographie', categories: ['Portrait', 'Paysage', 'Nature morte', 'Street Art', 'Documentaire', 'Abstrait', 'Contemporain'] },
      { genre: 'Sculpture', categories: ['Abstrait', 'Figuratif', 'Minimaliste', 'Contemporain', 'Traditionnel'] },
      
      // Genres artisanat
      { genre: 'Poterie', categories: ['Utilitaire', 'Décoratif', 'Rituel', 'Traditionnel Algérien', 'Moderne'] },
      { genre: 'Tissage', categories: ['Vestimentaire', 'Décoratif', 'Mobilier', 'Traditionnel Algérien'] },
      { genre: 'Bijouterie', categories: ['Accessoires', 'Décoratif', 'Rituel', 'Traditionnel Algérien', 'Moderne'] },
      { genre: 'Ébénisterie', categories: ['Mobilier', 'Décoratif', 'Utilitaire', 'Architecture'] },
      { genre: 'Céramique', categories: ['Utilitaire', 'Décoratif', 'Architecture', 'Traditionnel Algérien'] }
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
