// seeders/seed-evenements.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const UPLOADS_DIR = path.join(__dirname, '../uploads/images/evenements');

// Données d'événements culturels algériens
const evenementsData = [
  {
    nom_evenement: "Festival International de Timgad",
    description: "Le Festival International de Timgad est l'un des plus anciens et prestigieux festivals de musique et de théâtre en Afrique. Organisé dans le théâtre antique romain de Timgad, classé au patrimoine mondial de l'UNESCO, ce festival accueille des artistes nationaux et internationaux dans un cadre historique exceptionnel.",
    type: "festival",
    lieu: { nom: "Théâtre Antique de Timgad", wilaya: "Batna", adresse: "Site archéologique de Timgad" },
    capacite_max: 5000,
    tarif: 500,
    inscription_requise: true,
    duree_jours: 7,
    mois_habituel: 7,
    contact_email: "info@festival-timgad.dz",
    contact_telephone: "+213 33 12 34 56",
    age_minimum: 0,
    accessibilite: "Accès PMR partiel, places réservées disponibles"
  },
  {
    nom_evenement: "Festival National de la Musique Diwane",
    description: "Célébration de la musique Diwane, patrimoine spirituel et culturel ancestral d'Algérie. Le festival rassemble les meilleurs groupes de Diwane du pays pour des performances envoûtantes mêlant musique, danse et spiritualité.",
    type: "festival",
    lieu: { nom: "Dar Aziza", wilaya: "Alger", adresse: "Casbah d'Alger" },
    capacite_max: 800,
    tarif: 0,
    inscription_requise: false,
    duree_jours: 4,
    mois_habituel: 8,
    contact_email: "diwane.festival@culture.dz",
    contact_telephone: "+213 21 45 67 89",
    age_minimum: 0,
    accessibilite: "Bâtiment historique, accès limité pour PMR"
  },
  {
    nom_evenement: "Festival International du Raï d'Oran",
    description: "Le rendez-vous incontournable des amateurs de musique Raï ! Ce festival emblématique d'Oran réunit les plus grandes stars du Raï ainsi que les jeunes talents émergents.",
    type: "festival",
    lieu: { nom: "Théâtre de Verdure Hasni Chekroun", wilaya: "Oran", adresse: "Boulevard de l'ALN" },
    capacite_max: 10000,
    tarif: 1000,
    inscription_requise: true,
    duree_jours: 5,
    mois_habituel: 8,
    contact_email: "festival.rai@oran.dz",
    contact_telephone: "+213 41 33 22 11",
    age_minimum: 0,
    accessibilite: "Accessible PMR, interprètes LSF disponibles"
  },
  {
    nom_evenement: "Salon International du Livre d'Alger (SILA)",
    description: "Le plus grand événement littéraire du Maghreb ! Le SILA accueille plus de 1000 exposants venus de 50 pays. Au programme : ventes-dédicaces, conférences, tables rondes, ateliers d'écriture.",
    type: "salon",
    lieu: { nom: "Palais des Expositions SAFEX", wilaya: "Alger", adresse: "Pins Maritimes" },
    capacite_max: 50000,
    tarif: 100,
    inscription_requise: false,
    duree_jours: 10,
    mois_habituel: 10,
    contact_email: "contact@sila.dz",
    contact_telephone: "+213 23 50 60 70",
    age_minimum: 0,
    accessibilite: "Entièrement accessible PMR, parkings réservés",
    certificat_delivre: false
  },
  {
    nom_evenement: "Festival de la Poterie de Maâtkas",
    description: "Célébration de l'art ancestral de la poterie kabyle. Le festival met en lumière le savoir-faire des artisans potiers de la région avec démonstrations en direct.",
    type: "festival",
    lieu: { nom: "Village de Maâtkas", wilaya: "Tizi Ouzou", adresse: "Centre du village" },
    capacite_max: 3000,
    tarif: 0,
    inscription_requise: false,
    duree_jours: 3,
    mois_habituel: 5,
    contact_email: "poterie.maatkas@artisanat.dz",
    contact_telephone: "+213 26 11 22 33",
    age_minimum: 0,
    accessibilite: "Terrain naturel, accompagnement PMR disponible",
    certificat_delivre: true
  },
  {
    nom_evenement: "Festival International de la BD d'Alger (FIBDA)",
    description: "Le plus grand festival de bande dessinée d'Afrique ! Rencontres avec des auteurs internationaux, séances de dédicaces, ateliers de dessin, expositions.",
    type: "festival",
    lieu: { nom: "Esplanade de Riadh El Feth", wilaya: "Alger", adresse: "El Madania" },
    capacite_max: 20000,
    tarif: 200,
    inscription_requise: false,
    duree_jours: 5,
    mois_habituel: 10,
    contact_email: "info@fibda.dz",
    contact_telephone: "+213 21 67 89 01",
    age_minimum: 0,
    accessibilite: "Accessible PMR, programme en braille disponible"
  },
  {
    nom_evenement: "Festival du Tapis de Ghardaïa",
    description: "Immersion dans l'univers du tissage traditionnel du M'Zab. Exposition de tapis anciens et contemporains, démonstrations de tissage, marché artisanal.",
    type: "festival",
    lieu: { nom: "Place du Marché", wilaya: "Ghardaïa", adresse: "Centre historique" },
    capacite_max: 5000,
    tarif: 0,
    inscription_requise: false,
    duree_jours: 4,
    mois_habituel: 3,
    contact_email: "tapis.festival@ghardaia.dz",
    contact_telephone: "+213 29 88 77 66",
    age_minimum: 0,
    accessibilite: "Places PMR disponibles, parcours adapté"
  },
  {
    nom_evenement: "Festival de la Datte de Biskra",
    description: "Célébration de la 'Reine des oasis' avec exposition de plus de 300 variétés de dattes, concours de la meilleure datte Deglet Nour.",
    type: "festival",
    lieu: { nom: "Jardin 5 Juillet", wilaya: "Biskra", adresse: "Centre-ville" },
    capacite_max: 15000,
    tarif: 0,
    inscription_requise: false,
    duree_jours: 5,
    mois_habituel: 10,
    contact_email: "festival.dattes@biskra.dz",
    contact_telephone: "+213 33 73 50 50",
    age_minimum: 0,
    accessibilite: "Allées larges, accessible PMR"
  },
  {
    nom_evenement: "Festival National du Théâtre Professionnel",
    description: "Vitrine du théâtre algérien contemporain avec les meilleures troupes du pays. Compétition officielle, représentations hors-compétition.",
    type: "festival",
    lieu: { nom: "Théâtre National Algérien", wilaya: "Alger", adresse: "Place Mustapha Kateb" },
    capacite_max: 700,
    tarif: 300,
    inscription_requise: true,
    duree_jours: 12,
    mois_habituel: 6,
    contact_email: "fntp@tna.dz",
    contact_telephone: "+213 21 63 32 45",
    age_minimum: 12,
    accessibilite: "Bâtiment entièrement accessible, audiodescription disponible",
    certificat_delivre: true
  },
  {
    nom_evenement: "Journées Cinématographiques d'Alger",
    description: "Festival de cinéma mettant en avant le cinéma algérien et maghrébin. Projections en avant-première, rétrospectives.",
    type: "festival",
    lieu: { nom: "Cinémathèque Algérienne", wilaya: "Alger", adresse: "Rue Larbi Ben M'hidi" },
    capacite_max: 400,
    tarif: 150,
    inscription_requise: false,
    duree_jours: 7,
    mois_habituel: 12,
    contact_email: "jca@cinematheque.dz",
    contact_telephone: "+213 21 73 82 02",
    age_minimum: 0,
    accessibilite: "Salles accessibles PMR, sous-titrage SME"
  },
  {
    nom_evenement: "Marathon International d'Alger",
    description: "Course à pied dans les rues d'Alger avec parcours passant par les sites emblématiques. Marathon complet, semi-marathon, et courses populaires.",
    type: "competition",
    lieu: { nom: "Place des Martyrs", wilaya: "Alger", adresse: "Départ Place des Martyrs" },
    capacite_max: 10000,
    tarif: 1500,
    inscription_requise: true,
    duree_jours: 1,
    mois_habituel: 11,
    contact_email: "marathon@alger-sport.dz",
    contact_telephone: "+213 21 45 00 00",
    age_minimum: 18,
    accessibilite: "Parcours handisport disponible",
    certificat_delivre: true
  },
  {
    nom_evenement: "Festival des Musiques du Monde de Taghit",
    description: "Dans l'oasis de Taghit, rencontre entre musiques traditionnelles du Sahara et musiques du monde. Concerts sous les étoiles dans les dunes.",
    type: "festival",
    lieu: { nom: "Oasis de Taghit", wilaya: "Béchar", adresse: "Dunes de Taghit" },
    capacite_max: 3000,
    tarif: 2000,
    inscription_requise: true,
    duree_jours: 4,
    mois_habituel: 10,
    contact_email: "festival@taghit.dz",
    contact_telephone: "+213 49 80 60 40",
    age_minimum: 0,
    accessibilite: "Terrain sablonneux, assistance disponible"
  }
];

// Types d'événements
const typesEvenements = {
  'festival': 1,
  'concert': 2,
  'exposition': 3,
  'theatre': 4,
  'salon': 5,
  'conference': 6,
  'atelier': 7,
  'competition': 8,
  'symposium': 9,
  'spectacle': 10
};

// Fonction pour créer une image placeholder avec du contenu SVG
async function createPlaceholderImage(filename, title) {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    
    // Créer un SVG simple comme placeholder
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#48C9B0'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const svgContent = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="${color}"/>
      <text x="400" y="280" font-family="Arial" font-size="32" fill="white" text-anchor="middle">${title}</text>
      <text x="400" y="320" font-family="Arial" font-size="20" fill="white" text-anchor="middle">Image placeholder</text>
    </svg>`;
    
    const placeholderPath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(placeholderPath, svgContent);
    
    console.log(`✅ Image placeholder créée: ${filename}`);
    return `/uploads/images/evenements/${filename}`;
  } catch (error) {
    console.error(`❌ Erreur création placeholder: ${error.message}`);
    return `/uploads/images/evenements/default-event.jpg`;
  }
}

// Fonction pour générer des dates d'événement
function generateEventDates(moisHabituel, dureeJours) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const eventYear = moisHabituel < new Date().getMonth() + 1 ? nextYear : currentYear;
  const dateDebut = new Date(eventYear, moisHabituel - 1, Math.floor(Math.random() * 20) + 5);
  const dateFin = new Date(dateDebut);
  dateFin.setDate(dateFin.getDate() + dureeJours - 1);
  
  const dateLimiteInscription = new Date(dateDebut);
  dateLimiteInscription.setDate(dateLimiteInscription.getDate() - 7);
  
  return {
    date_debut: dateDebut,
    date_fin: dateFin,
    date_limite_inscription: dateLimiteInscription
  };
}

// Fonction pour hasher un mot de passe
async function hashPassword(password) {
  const bcrypt = require('bcrypt');
  return await bcrypt.hash(password, 10);
}

// Fonction principale de seed
async function seedEvenements(models) {
  const { Evenement, User, Lieu, TypeEvenement, Wilaya } = models;
  
  try {
    console.log('🌱 Début du seeding des événements culturels algériens...\n');
    
    // 1. Créer ou récupérer un utilisateur organisateur
    let organisateur = await User.findOne({ where: { email: 'organisateur@culture.dz' } });
    if (!organisateur) {
      const hashedPassword = await hashPassword('ActionCulture2024!');
      organisateur = await User.create({
        nom: 'Direction',
        prenom: 'Culture',
        email: 'organisateur@culture.dz',
        password: hashedPassword,
        telephone: '+213 21 00 00 00',
        id_type_utilisateur: 3, // Professionnel
        statut_professionnel: 'valide',
        date_validation_pro: new Date()
      });
      console.log('✅ Utilisateur organisateur créé');
    }
    
    // 2. Créer les types d'événements
    for (const [nom, id] of Object.entries(typesEvenements)) {
      await TypeEvenement.findOrCreate({
        where: { id_type_evenement: id },
        defaults: { 
          id_type_evenement: id, 
          nom_type: nom.charAt(0).toUpperCase() + nom.slice(1) 
        }
      });
    }
    console.log('✅ Types d\'événements créés/vérifiés');
    
    // 3. Vérifier/créer les wilayas nécessaires
    const wilayasNecessaires = [
      { nom: 'Batna', code: 5 },
      { nom: 'Alger', code: 16 },
      { nom: 'Oran', code: 31 },
      { nom: 'Tizi Ouzou', code: 15 },
      { nom: 'Ghardaïa', code: 47 },
      { nom: 'Biskra', code: 7 },
      { nom: 'Béchar', code: 8 }
    ];
    
    for (const wilayaData of wilayasNecessaires) {
      await Wilaya.findOrCreate({
        where: { nom_wilaya: wilayaData.nom },
        defaults: { 
          nom_wilaya: wilayaData.nom,
          codeW: wilayaData.code,
          wilaya_name_ascii: wilayaData.nom
        }
      });
    }
    console.log('✅ Wilayas créées/vérifiées\n');
    
    // 4. Créer les événements
    console.log('📌 Création des événements culturels...\n');
    
    let eventCount = 0;
    for (const eventData of evenementsData) {
      try {
        // Trouver la wilaya
        const wilaya = await Wilaya.findOne({ where: { nom_wilaya: eventData.lieu.wilaya } });
        if (!wilaya) {
          console.error(`❌ Wilaya non trouvée: ${eventData.lieu.wilaya}`);
          continue;
        }
        
        // Créer ou trouver le lieu
        const [lieu] = await Lieu.findOrCreate({
          where: { nom: eventData.lieu.nom },
          defaults: {
            nom: eventData.lieu.nom,
            adresse: eventData.lieu.adresse,
            id_wilaya: wilaya.id_wilaya,
            capacite: eventData.capacite_max,
            type_lieu: 'culturel',
            latitude: 35.0 + Math.random() * 2, // Coordonnées approximatives pour l'Algérie
            longitude: 1.0 + Math.random() * 7
          }
        });
        
        // Type d'événement
        const typeId = typesEvenements[eventData.type] || 1;
        
        // Générer les dates
        const dates = generateEventDates(eventData.mois_habituel, eventData.duree_jours);
        
        // Générer un nom de fichier unique pour l'image
        const imageFilename = `event-${eventData.nom_evenement.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.svg`;
        const imageUrl = await createPlaceholderImage(imageFilename, eventData.nom_evenement);
        
        // Créer l'événement
        const evenement = await Evenement.create({
          nom_evenement: eventData.nom_evenement,
          description: eventData.description,
          date_debut: dates.date_debut,
          date_fin: dates.date_fin,
          contact_email: eventData.contact_email,
          contact_telephone: eventData.contact_telephone,
          image_url: imageUrl,
          id_lieu: lieu.id_lieu,
          id_user: organisateur.id_user,
          id_type_evenement: typeId,
          statut: 'planifie',
          capacite_max: eventData.capacite_max,
          tarif: eventData.tarif,
          inscription_requise: eventData.inscription_requise,
          age_minimum: eventData.age_minimum || 0,
          accessibilite: eventData.accessibilite,
          certificat_delivre: eventData.certificat_delivre || false,
          date_limite_inscription: eventData.inscription_requise ? dates.date_limite_inscription : null
        });
        
        eventCount++;
        console.log(`✅ Événement créé: ${eventData.nom_evenement}`);
        
      } catch (error) {
        console.error(`❌ Erreur création événement ${eventData.nom_evenement}:`, error.message);
      }
    }
    
    // 5. Créer quelques événements supplémentaires
    console.log('\n📌 Création d\'événements supplémentaires...');
    
    const eventNames = [
      'Festival de Musique Chaâbi', 'Salon de l\'Artisanat Traditionnel', 
      'Exposition d\'Art Contemporain', 'Concert de Musique Andalouse',
      'Festival de Danse Folklorique', 'Journées du Patrimoine',
      'Salon du Tourisme Saharien', 'Festival de Musique Gnawa'
    ];
    
    const lieux = await Lieu.findAll();
    const types = await TypeEvenement.findAll();
    
    for (let i = 0; i < 8 && i < eventNames.length; i++) {
      try {
        const lieu = lieux[i % lieux.length];
        const type = types[i % types.length];
        const mois = Math.floor(Math.random() * 12) + 1;
        const duree = Math.floor(Math.random() * 5) + 1;
        const dates = generateEventDates(mois, duree);
        
        const imageFilename = `event-extra-${i}-${Date.now()}.svg`;
        const imageUrl = await createPlaceholderImage(imageFilename, eventNames[i]);
        
        await Evenement.create({
          nom_evenement: eventNames[i],
          description: `${eventNames[i]} - Un événement culturel majeur célébrant le riche patrimoine algérien. Venez découvrir les traditions, l'art et la culture de notre pays dans une ambiance festive et conviviale.`,
          date_debut: dates.date_debut,
          date_fin: dates.date_fin,
          contact_email: `contact@${eventNames[i].toLowerCase().replace(/\s+/g, '-')}.dz`,
          contact_telephone: `+213 ${Math.floor(Math.random() * 50) + 20} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`,
          image_url: imageUrl,
          id_lieu: lieu.id_lieu,
          id_user: organisateur.id_user,
          id_type_evenement: type.id_type_evenement,
          statut: 'planifie',
          capacite_max: Math.floor(Math.random() * 5000) + 500,
          tarif: [0, 100, 200, 300, 500][Math.floor(Math.random() * 5)],
          inscription_requise: Math.random() > 0.5,
          age_minimum: 0,
          accessibilite: 'Accessible PMR',
          certificat_delivre: false
        });
        
        eventCount++;
      } catch (error) {
        console.error(`❌ Erreur création événement supplémentaire:`, error.message);
      }
    }
    
    console.log(`\n🎉 Seeding terminé avec succès !`);
    console.log(`📊 Total événements créés: ${eventCount}`);
    console.log(`📁 Images placeholders créées dans: ${UPLOADS_DIR}`);
    
  } catch (error) {
    console.error('❌ Erreur générale lors du seeding:', error);
    throw error;
  }
}

// Script exécutable
if (require.main === module) {
  const { initializeDatabase } = require('../models');
  const { createDatabase } = require('../config/database');
  
  (async () => {
    try {
      // Configuration de la base de données
      const dbConfig = {
        database: process.env.DB_NAME || 'actionculture',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: process.env.DB_DIALECT || 'mysql'
      };
      
      console.log('🔧 Configuration de la base de données...');
      
      // Créer la base de données si nécessaire
      await createDatabase(dbConfig);
      
      // Initialiser la connexion et les modèles
      const { sequelize, models } = await initializeDatabase(dbConfig);
      
      // Ajouter sequelize aux modèles
      models.sequelize = sequelize;
      models.Sequelize = require('sequelize');
      
      // Synchroniser les modèles
      console.log('🔄 Synchronisation des modèles...');
      await sequelize.sync({ alter: true });
      
      // Lancer le seeding
      await seedEvenements(models);
      
      // Fermer la connexion
      await sequelize.close();
      console.log('✅ Connexion fermée');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    }
  })();
}

module.exports = { seedEvenements, evenementsData };