// scripts/seedFinalCorrected.js - Version finale corrigée
const { Sequelize } = require('sequelize');

// Configuration de la base de données
const sequelize = new Sequelize('actionculture', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false // Mettre à true pour voir les requêtes SQL
});

// Import des modèles nécessaires
const models = {};

console.log('📦 Chargement des modèles...\n');

try {
  // Modèles de base
  models.Wilaya = require('../models/geography/Wilaya')(sequelize);
  models.Role = require('../models/users/Role')(sequelize);
  models.User = require('../models/users/User')(sequelize);
  models.UserRole = require('../models/users/UserRole')(sequelize);
  models.TypeUser = require('../models/classifications/TypeUser')(sequelize);
  models.Evenement = require('../models/events/Evenement')(sequelize);
  models.TypeEvenement = require('../models/events/TypeEvenement')(sequelize);
  models.Lieu = require('../models/places/Lieu')(sequelize);
  models.Organisation = require('../models/organisations/Organisation')(sequelize);
  models.TypeOrganisation = require('../models/organisations/TypeOrganisation')(sequelize);
  
  console.log('✅ Modèles essentiels chargés');
} catch (error) {
  console.error('❌ Erreur chargement modèles:', error.message);
}

// Fonction principale de seed
async function seedDatabase() {
  try {
    console.log('\n🌱 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✅ Connexion établie !\n');

    // ========== ÉTAPE 1: Créer les rôles ==========
    console.log('🔐 Insertion des rôles...');
    const rolesData = [
      { nom_role: "User", description: "Utilisateur standard (visiteur)" },
      { nom_role: "Professionnel", description: "Professionnel de la culture" },
      { nom_role: "Administrateur", description: "Administrateur du système" }
    ];
    
    const roleMap = {};
    for (const role of rolesData) {
      try {
        const [record, created] = await models.Role.findOrCreate({
          where: { nom_role: role.nom_role },
          defaults: role
        });
        roleMap[role.nom_role] = record.id_role;
        console.log(`${created ? '✅' : '⚠️ '} Rôle: ${role.nom_role} (ID: ${record.id_role})`);
      } catch (e) {
        console.log(`❌ Erreur rôle: ${e.message}`);
      }
    }

    // ========== ÉTAPE 2: Types d'utilisateurs (métiers) ==========
    console.log('\n👤 Insertion des types d\'utilisateurs...');
    const typesUserData = [
      { nom_type: "visiteur", description: "Visiteur standard" },
      { nom_type: "auteur", description: "Auteur de livres" },
      { nom_type: "traducteur", description: "Traducteur littéraire" },
      { nom_type: "illustrateur", description: "Illustrateur" },
      { nom_type: "prefacier", description: "Préfacier" },
      { nom_type: "realisateur", description: "Réalisateur de films" },
      { nom_type: "acteur", description: "Acteur/Actrice" },
      { nom_type: "producteur", description: "Producteur" },
      { nom_type: "scenariste", description: "Scénariste" },
      { nom_type: "directeur_photo", description: "Directeur de la photographie" },
      { nom_type: "monteur", description: "Monteur" },
      { nom_type: "compositeur", description: "Compositeur musical" },
      { nom_type: "interprete", description: "Interprète musical" },
      { nom_type: "arrangeur", description: "Arrangeur musical" },
      { nom_type: "parolier", description: "Parolier" },
      { nom_type: "journaliste", description: "Journaliste culturel" },
      { nom_type: "redacteur", description: "Rédacteur" },
      { nom_type: "chercheur", description: "Chercheur" },
      { nom_type: "artiste", description: "Artiste plasticien" },
      { nom_type: "artisan", description: "Artisan d'art" },
      { nom_type: "designer", description: "Designer" },
      { nom_type: "administrateur", description: "Administrateur système" }
    ];
    
    const typeUserMap = {};
    for (const type of typesUserData) {
      try {
        const [record, created] = await models.TypeUser.findOrCreate({
          where: { nom_type: type.nom_type },  // Utiliser nom_type et non nom_type_user
          defaults: type
        });
        typeUserMap[type.nom_type] = record.id_type_user;
        console.log(`${created ? '✅' : '⚠️ '} Type user: ${type.nom_type}`);
      } catch (e) {
        console.log(`❌ Erreur type: ${e.message}`);
      }
    }

    // ========== ÉTAPE 3: Types d'événements ==========
    console.log('\n📋 Insertion des types d\'événements...');
    const typesEventData = [
      { nom_type: "Festival", description: "Festival culturel ou artistique" },
      { nom_type: "Exposition", description: "Exposition d'art ou de patrimoine" },
      { nom_type: "Conférence", description: "Conférence ou colloque" },
      { nom_type: "Théâtre", description: "Représentation théâtrale" },
      { nom_type: "Atelier", description: "Atelier pratique ou formation" },
      { nom_type: "Concert", description: "Concert ou soirée musicale" },
      { nom_type: "Projection", description: "Projection cinématographique" },
      { nom_type: "Salon", description: "Salon du livre ou de l'artisanat" }
    ];
    
    const typeEventMap = {};
    for (const type of typesEventData) {
      try {
        const [record, created] = await models.TypeEvenement.findOrCreate({
          where: { nom_type: type.nom_type },
          defaults: type
        });
        typeEventMap[type.nom_type] = record.id_type_evenement;
        console.log(`${created ? '✅' : '⚠️ '} Type événement: ${type.nom_type}`);
      } catch (e) {
        console.log(`❌ Erreur: ${e.message}`);
      }
    }

    // ========== ÉTAPE 4: Utilisateurs avec acceptation des conditions ==========
    console.log('\n👥 Insertion des utilisateurs...');
    const usersData = [
      {
        nom: "Admin",
        prenom: "System",
        email: "admin@actionculture.dz",
        password: "admin123",
        id_type_user: typeUserMap["administrateur"],
        date_naissance: "1980-01-01",
        telephone: "0555000001",
        wilaya_residence: 16,
        statut: true,
        accepte_conditions: true  // IMPORTANT: Ajout de ce champ
      },
      {
        nom: "Benali",
        prenom: "Mohamed",
        email: "m.benali@test.dz",
        password: "password123",
        id_type_user: typeUserMap["auteur"],
        date_naissance: "1985-05-15",
        telephone: "0555000002",
        wilaya_residence: 16,
        statut: true,
        accepte_conditions: true
      },
      {
        nom: "Saidi",
        prenom: "Fatima",
        email: "f.saidi@test.com",
        password: "password123",
        id_type_user: typeUserMap["visiteur"],
        date_naissance: "1990-03-20",
        telephone: "0555000003",
        wilaya_residence: 31,
        statut: true,
        accepte_conditions: true
      },
      {
        nom: "Khedda",
        prenom: "Amina",
        email: "a.khedda@musee.dz",
        password: "password123",
        id_type_user: typeUserMap["artiste"],
        date_naissance: "1988-07-10",
        telephone: "0555000004",
        wilaya_residence: 31,
        statut: true,
        accepte_conditions: true
      },
      {
        nom: "Mammeri",
        prenom: "Karim",
        email: "k.mammeri@cinema.dz",
        password: "password123",
        id_type_user: typeUserMap["realisateur"],
        date_naissance: "1983-11-22",
        telephone: "0555000005",
        wilaya_residence: 16,
        statut: true,
        accepte_conditions: true
      },
      {
        nom: "Boudiaf",
        prenom: "Sarah",
        email: "s.boudiaf@music.dz",
        password: "password123",
        id_type_user: typeUserMap["compositeur"],
        date_naissance: "1992-04-15",
        telephone: "0555000006",
        wilaya_residence: 25,
        statut: true,
        accepte_conditions: true
      },
      {
        nom: "Ziani",
        prenom: "Ahmed",
        email: "a.ziani@journal.dz",
        password: "password123",
        id_type_user: typeUserMap["journaliste"],
        date_naissance: "1987-09-30",
        telephone: "0555000007",
        wilaya_residence: 16,
        statut: true,
        accepte_conditions: true
      }
    ];
    
    const userMap = {};
    for (const user of usersData) {
      try {
        const [record, created] = await models.User.findOrCreate({
          where: { email: user.email },
          defaults: user
        });
        userMap[user.email] = record.id_user;
        console.log(`${created ? '✅' : '⚠️ '} User: ${user.email} (ID: ${record.id_user})`);
      } catch (e) {
        console.log(`❌ Erreur user ${user.email}: ${e.message}`);
      }
    }

    // ========== ÉTAPE 5: Associer les utilisateurs aux rôles ==========
    console.log('\n🔗 Association des utilisateurs aux rôles...');
    const userRoleAssociations = [
      { email: "admin@actionculture.dz", role: "Administrateur" },
      { email: "m.benali@test.dz", role: "Professionnel" },
      { email: "f.saidi@test.com", role: "User" },
      { email: "a.khedda@musee.dz", role: "Professionnel" },
      { email: "k.mammeri@cinema.dz", role: "Professionnel" },
      { email: "s.boudiaf@music.dz", role: "Professionnel" },
      { email: "a.ziani@journal.dz", role: "Professionnel" }
    ];

    for (const assoc of userRoleAssociations) {
      try {
        const userId = userMap[assoc.email];
        const roleId = roleMap[assoc.role];
        
        if (userId && roleId) {
          const [userRole, created] = await models.UserRole.findOrCreate({
            where: { 
              id_user: userId,
              id_role: roleId
            }
          });
          console.log(`${created ? '✅' : '⚠️ '} Association: ${assoc.email} → ${assoc.role}`);
        } else {
          console.log(`⚠️  Impossible d'associer ${assoc.email} au rôle ${assoc.role}`);
        }
      } catch (e) {
        console.log(`❌ Erreur association: ${e.message}`);
      }
    }

    // ========== ÉTAPE 6: Types d'organisations ==========
    if (models.TypeOrganisation) {
      console.log('\n🏢 Insertion des types d\'organisations...');
      const typesOrgData = [
        { nom: "Association" },
        { nom: "Entreprise" },
        { nom: "Institution publique" },
        { nom: "ONG" }
      ];
      
      for (const type of typesOrgData) {
        try {
          const [record, created] = await models.TypeOrganisation.findOrCreate({
            where: { nom: type.nom },
            defaults: type
          });
          console.log(`${created ? '✅' : '⚠️ '} Type organisation: ${type.nom}`);
        } catch (e) {
          console.log(`❌ Erreur: ${e.message}`);
        }
      }
    }

    // ========== ÉTAPE 7: Lieux ==========
    console.log('\n📍 Insertion des lieux...');
    const lieuxData = [
      {
        nom: "Palais de la Culture Moufdi-Zakaria",
        adresse: "Plateau des Annassers, Kouba, Alger",
        latitude: 36.7167,
        longitude: 3.0500,
        typeLieu: "Commune",
        wilayaId: 16,
        dairaId: 2,
        communeId: 583
      },
      {
        nom: "Musée National Ahmed Zabana",
        adresse: "Boulevard de l'ALN, Oran",
        latitude: 35.6969,
        longitude: -0.6331,
        typeLieu: "Commune",
        wilayaId: 31,
        dairaId: 6,
        communeId: 863
      },
      {
        nom: "Théâtre National Algérien",
        adresse: "2 Rue Zighout Youcef, Alger Centre",
        latitude: 36.7525,
        longitude: 3.0420,
        typeLieu: "Commune",
        wilayaId: 16,
        dairaId: 1,
        communeId: 579
      },
      {
        nom: "Centre Culturel Français",
        adresse: "7 Rue Hassiba Ben Bouali, Alger",
        latitude: 36.7650,
        longitude: 3.0450,
        typeLieu: "Commune",
        wilayaId: 16,
        dairaId: 1,
        communeId: 579
      }
    ];
    
    const lieuMap = {};
    for (const lieu of lieuxData) {
      try {
        const [record, created] = await models.Lieu.findOrCreate({
          where: { nom: lieu.nom },
          defaults: lieu
        });
        lieuMap[lieu.nom] = record.id_lieu;
        console.log(`${created ? '✅' : '⚠️ '} Lieu: ${lieu.nom}`);
      } catch (e) {
        console.log(`❌ Erreur lieu ${lieu.nom}: ${e.message}`);
      }
    }

    // ========== ÉTAPE 8: Événements ==========
    console.log('\n🎭 Insertion des événements...');
    const evenementsData = [
      {
        nom_evenement: "Festival de Musique Andalouse 2025",
        description: "Le Festival de Musique Andalouse d'Alger revient pour sa 15ème édition avec des artistes renommés venus de tout le Maghreb.",
        date_debut: new Date("2025-07-15"),
        date_fin: new Date("2025-07-20"),
        contact_email: "contact@festival-andalou.dz",
        contact_telephone: "021456789",
        id_lieu: lieuMap["Palais de la Culture Moufdi-Zakaria"] || 1,
        id_user: userMap["m.benali@test.dz"] || 2,
        id_type_evenement: typeEventMap["Festival"] || 1,
        statut: "planifie",
        capacite_max: 500,
        tarif: 1500,
        inscription_requise: true,
        accessibilite: "Accès PMR disponible, places réservées"
      },
      {
        nom_evenement: "Exposition Art Contemporain - Visions d'Algérie",
        description: "Une exposition collective présentant les œuvres de 20 artistes algériens contemporains.",
        date_debut: new Date("2025-06-01"),
        date_fin: new Date("2025-06-30"),
        contact_email: "expo@musee-zabana.dz",
        contact_telephone: "041332211",
        id_lieu: lieuMap["Musée National Ahmed Zabana"] || 2,
        id_user: userMap["a.khedda@musee.dz"] || 4,
        id_type_evenement: typeEventMap["Exposition"] || 2,
        statut: "planifie",
        capacite_max: 200,
        tarif: 0,
        inscription_requise: false,
        accessibilite: "Musée entièrement accessible, ascenseurs disponibles"
      },
      {
        nom_evenement: "Projection - Cinéma Algérien Contemporain",
        description: "Projection de films algériens récents suivie d'un débat avec les réalisateurs.",
        date_debut: new Date("2025-08-10"),
        date_fin: new Date("2025-08-10"),
        contact_email: "cine@culture.dz",
        contact_telephone: "021345678",
        id_lieu: lieuMap["Théâtre National Algérien"] || 3,
        id_user: userMap["k.mammeri@cinema.dz"] || 5,
        id_type_evenement: typeEventMap["Projection"] || 7,
        statut: "planifie",
        capacite_max: 150,
        tarif: 500,
        inscription_requise: false
      },
      {
        nom_evenement: "Atelier d'Écriture Créative",
        description: "Atelier pratique d'écriture créative animé par des auteurs confirmés.",
        date_debut: new Date("2025-09-05"),
        date_fin: new Date("2025-09-07"),
        contact_email: "atelier@culture.dz",
        contact_telephone: "021567890",
        id_lieu: lieuMap["Centre Culturel Français"] || 4,
        id_user: userMap["m.benali@test.dz"] || 2,
        id_type_evenement: typeEventMap["Atelier"] || 5,
        statut: "planifie",
        capacite_max: 20,
        tarif: 2000,
        inscription_requise: true,
        certificat_delivre: true
      }
    ];
    
    for (const event of evenementsData) {
      try {
        const created = await models.Evenement.create(event);
        console.log(`✅ Événement créé: ${event.nom_evenement}`);
      } catch (e) {
        console.log(`❌ Erreur événement ${event.nom_evenement}: ${e.message}`);
      }
    }

    console.log('\n🎉 Seed terminé avec succès !');
    console.log('\n📊 Résumé:');
    console.log(`- ${Object.keys(roleMap).length} rôles`);
    console.log(`- ${Object.keys(typeUserMap).length} types d'utilisateurs`);
    console.log(`- ${Object.keys(typeEventMap).length} types d'événements`);
    console.log(`- ${Object.keys(userMap).length} utilisateurs`);
    console.log(`- ${Object.keys(lieuMap).length} lieux`);
    console.log(`- ${evenementsData.length} événements`);

  } catch (error) {
    console.error('\n❌ Erreur générale:', error);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n👋 Connexion fermée');
  }
}

// Exécuter
seedDatabase();