// seed-all-data.js - Script complet de génération de données de test
require('dotenv').config();
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker/locale/fr');

// Configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'actionculture',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false
  }
);

// Import des données de référence
const DATA = require('./seed-data-reference');

// Utilitaires
const hashPassword = async (pwd) => bcrypt.hash(pwd, 10);
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Chargement des modèles
async function loadModels() {
  const models = {};
  console.log('📦 Chargement des modèles...');
  
  // Géographie
  models.Wilaya = require('../models/geography/Wilaya')(sequelize);
  models.Daira = require('../models/geography/Daira')(sequelize);
  models.Commune = require('../models/geography/Commune')(sequelize);
  
  // Users
  models.Role = require('../models/users/Role')(sequelize);
  models.User = require('../models/users/User')(sequelize);
  models.UserRole = require('../models/users/UserRole')(sequelize);
  
  // Classifications
  models.TypeUser = require('../models/classifications/TypeUser')(sequelize);
  models.TypeOeuvre = require('../models/classifications/TypeOeuvre')(sequelize);
  models.Langue = require('../models/classifications/Langue')(sequelize);
  models.Genre = require('../models/classifications/Genre')(sequelize);
  models.Categorie = require('../models/classifications/Categorie')(sequelize);
  models.Materiau = require('../models/classifications/Materiau')(sequelize);
  models.Technique = require('../models/classifications/Technique')(sequelize);
  models.TagMotCle = require('../models/classifications/TagMotCle')(sequelize);
  
  // Lieux & Organisations
  models.Lieu = require('../models/places/Lieu')(sequelize);
  models.TypeOrganisation = require('../models/organisations/TypeOrganisation')(sequelize);
  models.Organisation = require('../models/organisations/Organisation')(sequelize);
  models.Editeur = require('../models/organisations/Editeur')(sequelize);
  
  // Événements
  models.TypeEvenement = require('../models/events/TypeEvenement')(sequelize);
  models.Evenement = require('../models/events/Evenement')(sequelize);
  models.Programme = require('../models/events/Programme')(sequelize);
  
  // Œuvres
  models.Oeuvre = require('../models/oeuvres/Oeuvre')(sequelize);
  models.Livre = require('../models/oeuvres/Livre')(sequelize);
  models.Film = require('../models/oeuvres/Film')(sequelize);
  models.AlbumMusical = require('../models/oeuvres/AlbumMusical')(sequelize);
  models.Artisanat = require('../models/oeuvres/Artisanat')(sequelize);
  
  // Associations
  models.EvenementUser = require('../models/associations/EvenementUser')(sequelize);
  models.ProgrammeIntervenant = require('../models/associations/ProgrammeIntervenant')(sequelize);
  
  console.log(`✅ ${Object.keys(models).length} modèles chargés\n`);
  return models;
}

// Fonctions de seed
async function seedSimpleTable(model, data, keyField, label) {
  console.log(`\n${label}...`);
  const map = {};
  for (const item of data) {
    const [record] = await model.findOrCreate({
      where: { [keyField]: item[keyField] },
      defaults: item
    });
    map[item[keyField]] = record[model.primaryKeyAttribute];
  }
  console.log(`  ✅ ${Object.keys(map).length} créés`);
  return map;
}

async function seedUsers(models, typeUserMap, roleMap) {
  console.log('\n👥 Création des utilisateurs...');
  const userMap = {};
  
  for (const user of DATA.UTILISATEURS) {
    const hashedPassword = await hashPassword(user.password);
    const [record, created] = await models.User.findOrCreate({
      where: { email: user.email },
      defaults: {
        nom: user.nom, prenom: user.prenom, email: user.email,
        password: hashedPassword,
        id_type_user: typeUserMap[user.type] || 1,
        wilaya_residence: user.wilaya,
        statut: 'actif', accepte_conditions: true
      }
    });
    userMap[user.email] = record.id_user;
    
    if (roleMap[user.role]) {
      await models.UserRole.findOrCreate({
        where: { id_user: record.id_user, id_role: roleMap[user.role] }
      });
    }
    console.log(`  ${created ? '✅' : '⚠️ '} ${user.email}`);
  }
  return userMap;
}

async function seedLieux(models) {
  console.log('\n📍 Création des lieux...');
  const lieuMap = {};
  for (const lieu of DATA.LIEUX) {
    const [record, created] = await models.Lieu.findOrCreate({
      where: { latitude: lieu.latitude, longitude: lieu.longitude },
      defaults: lieu
    });
    lieuMap[lieu.nom.fr] = record.id_lieu;
    console.log(`  ${created ? '✅' : '⚠️ '} ${lieu.nom.fr}`);
  }
  return lieuMap;
}

async function seedEvenements(models, typeEventMap, lieuMap, userMap) {
  console.log('\n🎭 Création des événements...');
  const eventMap = {};
  const lieuIds = Object.values(lieuMap);
  const userIds = Object.values(userMap);
  
  for (const event of DATA.EVENEMENTS) {
    const [record, created] = await models.Evenement.findOrCreate({
      where: { nom_evenement: event.nom },
      defaults: {
        nom_evenement: event.nom, description: event.description,
        date_debut: new Date(event.dateDebut), date_fin: new Date(event.dateFin),
        id_type_evenement: typeEventMap[event.type],
        id_lieu: getRandomElement(lieuIds),
        id_user: userIds[1] || userIds[0],
        capacite_max: event.capacite, tarif: event.tarif,
        inscription_requise: event.inscriptionRequise,
        statut: 'planifie', contact_email: 'contact@actionculture.dz'
      }
    });
    eventMap[event.nom.fr] = record.id_evenement;
    console.log(`  ${created ? '✅' : '⚠️ '} ${event.nom.fr}`);
  }
  return eventMap;
}

async function seedProgrammes(models, eventMap, lieuMap) {
  console.log('\n📅 Création des programmes...');
  let count = 0;
  const lieuIds = Object.values(lieuMap);
  
  for (const [eventName, eventId] of Object.entries(eventMap)) {
    for (let i = 0; i < 3; i++) {
      const progType = getRandomElement(DATA.PROGRAMMES_TYPES);
      await models.Programme.create({
        titre: { fr: `${progType.titre.fr} - Session ${i+1}`, ar: progType.titre.ar },
        description: { fr: `Programme ${i+1}`, ar: `البرنامج ${i+1}` },
        id_evenement: eventId, id_lieu: getRandomElement(lieuIds),
        date_programme: new Date('2025-07-15'),
        heure_debut: `${(9+i*2).toString().padStart(2,'0')}:00:00`,
        heure_fin: `${(11+i*2).toString().padStart(2,'0')}:00:00`,
        ordre: i+1, statut: 'planifie', type_activite: progType.type,
        duree_estimee: 120, nb_participants_max: 50
      });
      count++;
    }
  }
  console.log(`  ✅ ${count} programmes créés`);
}

async function seedParticipants(models, eventMap, userMap) {
  console.log('\n👥 Inscription des participants...');
  let count = 0;
  const userIds = Object.values(userMap);
  const eventIds = Object.values(eventMap);
  
  for (const userId of userIds) {
    const events = [...eventIds].sort(() => 0.5 - Math.random()).slice(0, 3);
    for (const eventId of events) {
      try {
        await models.EvenementUser.findOrCreate({
          where: { id_user: userId, id_evenement: eventId },
          defaults: {
            role_participation: getRandomElement(['participant', 'intervenant']),
            statut_participation: 'inscrit', date_inscription: new Date()
          }
        });
        count++;
      } catch (e) {}
    }
  }
  console.log(`  ✅ ${count} inscriptions créées`);
}

async function seedOeuvres(models, typeOeuvreMap, langueMap, genreMap, userMap) {
  console.log('\n📚 Création des œuvres...');
  const adminId = Object.values(userMap)[0];
  let count = 0;
  
  for (const livre of DATA.LIVRES) {
    const oeuvre = await models.Oeuvre.create({
      titre: livre.titre, description: livre.description,
      id_type_oeuvre: typeOeuvreMap['Livre'], id_langue: langueMap['fr'],
      annee_creation: livre.annee, saisi_par: adminId,
      statut: 'publie', date_validation: new Date(), validateur_id: adminId
    });
    await models.Livre.create({
      id_oeuvre: oeuvre.id_oeuvre,
      isbn: faker.helpers.replaceSymbols('978-####-##-###-#'),
      nb_pages: 250, id_genre: genreMap[livre.genre] || genreMap['Roman']
    });
    count++;
  }
  
  for (const film of DATA.FILMS) {
    const oeuvre = await models.Oeuvre.create({
      titre: film.titre, description: film.description,
      id_type_oeuvre: typeOeuvreMap['Film'], id_langue: langueMap['fr'],
      annee_creation: film.annee, saisi_par: adminId,
      statut: 'publie', date_validation: new Date(), validateur_id: adminId
    });
    await models.Film.create({
      id_oeuvre: oeuvre.id_oeuvre, duree_minutes: 120,
      realisateur: film.realisateur, id_genre: genreMap[film.genre]
    });
    count++;
  }
  
  for (const album of DATA.ALBUMS) {
    const oeuvre = await models.Oeuvre.create({
      titre: album.titre, description: album.description,
      id_type_oeuvre: typeOeuvreMap['Album Musical'], id_langue: langueMap['ar'],
      annee_creation: album.annee, saisi_par: adminId,
      statut: 'publie', date_validation: new Date(), validateur_id: adminId
    });
    await models.AlbumMusical.create({
      id_oeuvre: oeuvre.id_oeuvre, duree: 45,
      id_genre: genreMap[album.genre], label: 'Production Nationale'
    });
    count++;
  }
  
  for (const art of DATA.ARTISANAT) {
    await models.Oeuvre.create({
      titre: art.titre, description: art.description,
      id_type_oeuvre: typeOeuvreMap['Artisanat'], id_langue: langueMap['fr'],
      annee_creation: 2023, prix: 15000, saisi_par: adminId,
      statut: 'publie', date_validation: new Date(), validateur_id: adminId
    });
    count++;
  }
  
  console.log(`  ✅ ${count} œuvres créées`);
}

// Fonction principale
async function seedAll() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     🌱 SEED COMPLET - ACTION CULTURE DATABASE            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion établie!\n');
    
    const models = await loadModels();
    
    // Seed des tables de référence
    const roleMap = await seedSimpleTable(models.Role, DATA.ROLES, 'nom_role', '🔐 Rôles');
    const typeUserMap = await seedSimpleTable(models.TypeUser, DATA.TYPES_USER, 'nom_type', '👤 Types user');
    const typeEventMap = await seedSimpleTable(models.TypeEvenement, DATA.TYPES_EVENEMENT, 'nom_type', '📋 Types événement');
    const typeOrgMap = await seedSimpleTable(models.TypeOrganisation, DATA.TYPES_ORGANISATION, 'nom', '🏢 Types organisation');
    const langueMap = await seedSimpleTable(models.Langue, DATA.LANGUES, 'nom', '🌍 Langues');
    const typeOeuvreMap = await seedSimpleTable(models.TypeOeuvre, DATA.TYPES_OEUVRE, 'nom_type', '📚 Types œuvre');
    const genreMap = await seedSimpleTable(models.Genre, DATA.GENRES, 'nom', '🎭 Genres');
    await seedSimpleTable(models.Categorie, DATA.CATEGORIES, 'nom', '📂 Catégories');
    await seedSimpleTable(models.Materiau, DATA.MATERIAUX, 'nom', '🏺 Matériaux');
    await seedSimpleTable(models.Technique, DATA.TECHNIQUES, 'nom', '🔧 Techniques');
    
    // Seed des entités principales
    const userMap = await seedUsers(models, typeUserMap, roleMap);
    const lieuMap = await seedLieux(models);
    const eventMap = await seedEvenements(models, typeEventMap, lieuMap, userMap);
    await seedProgrammes(models, eventMap, lieuMap);
    await seedParticipants(models, eventMap, userMap);
    await seedOeuvres(models, typeOeuvreMap, langueMap, genreMap, userMap);
    
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                 ✅ SEED TERMINÉ AVEC SUCCÈS              ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n🔑 Identifiants de connexion:');
    console.log('   Email: admin@actionculture.dz | Password: admin123');
    console.log('   Email: m.benali@test.dz | Password: password123\n');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('🔌 Connexion fermée');
  }
}

seedAll();
