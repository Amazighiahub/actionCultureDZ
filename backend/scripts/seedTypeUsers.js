// seedTypeUsers.js
const db = require('../models'); // Ajustez le chemin selon votre structure

// Types d'utilisateurs par type d'œuvre
const typesUtilisateursParOeuvre = {
  1: { // Livre
    types: ['auteur', 'traducteur', 'illustrateur', 'prefacier'],
    nom_oeuvre: 'Livre'
  },
  2: { // Film
    types: ['realisateur', 'acteur', 'producteur', 'scenariste', 'directeur_photo', 'monteur'],
    nom_oeuvre: 'Film'
  },
  3: { // Album Musical
    types: ['compositeur', 'interprete', 'arrangeur', 'parolier', 'producteur'],
    nom_oeuvre: 'Album Musical'
  },
  4: { // Article
    types: ['auteur', 'journaliste', 'redacteur'],
    nom_oeuvre: 'Article'
  },
  5: { // Article Scientifique
    types: ['chercheur', 'auteur'],
    nom_oeuvre: 'Article Scientifique'
  },
  6: { // Artisanat
    types: ['artisan', 'designer'],
    nom_oeuvre: 'Artisanat'
  },
  7: { // Œuvre d'Art
    types: ['artiste', 'designer'],
    nom_oeuvre: 'Œuvre d\'Art'
  }
};

// Générer la liste complète des types uniques avec descriptions
function genererTypesUniques() {
  const typesMap = new Map();
  
  // Descriptions pour chaque type
  const descriptions = {
    'auteur': 'Auteur d\'œuvres littéraires ou d\'articles',
    'traducteur': 'Traducteur d\'œuvres littéraires',
    'illustrateur': 'Illustrateur de livres et publications',
    'prefacier': 'Auteur de préfaces',
    'realisateur': 'Réalisateur de films',
    'acteur': 'Acteur/Actrice de cinéma',
    'producteur': 'Producteur de films ou d\'albums musicaux',
    'scenariste': 'Scénariste de films',
    'directeur_photo': 'Directeur de la photographie',
    'monteur': 'Monteur de films',
    'compositeur': 'Compositeur de musique',
    'interprete': 'Interprète musical',
    'arrangeur': 'Arrangeur musical',
    'parolier': 'Auteur de paroles de chansons',
    'journaliste': 'Journaliste et rédacteur d\'articles',
    'redacteur': 'Rédacteur de contenus',
    'chercheur': 'Chercheur scientifique',
    'artisan': 'Artisan créateur',
    'designer': 'Designer et concepteur',
    'artiste': 'Artiste plasticien'
  };
  
  // Parcourir tous les types et les ajouter à la Map pour éviter les doublons
  Object.values(typesUtilisateursParOeuvre).forEach(config => {
    config.types.forEach(type => {
      if (!typesMap.has(type)) {
        typesMap.set(type, {
          nom_type: type,
          description: descriptions[type] || `${type} professionnel`
        });
      }
    });
  });
  
  return Array.from(typesMap.values());
}

async function seedTypeUsers() {
  try {
    console.log('Création des types d\'utilisateurs...\n');
    
    const typesUniques = genererTypesUniques();
    
    // Créer chaque type unique
    for (const typeData of typesUniques) {
      const [typeUser, created] = await db.TypeUser.findOrCreate({
        where: { nom_type: typeData.nom_type },
        defaults: typeData
      });
      
      if (created) {
        console.log(`✓ Type créé: ${typeData.nom_type}`);
      } else {
        console.log(`- Type existant: ${typeData.nom_type}`);
      }
    }
    
    console.log('\n✅ Types d\'utilisateurs initialisés avec succès!');
    console.log(`Total: ${typesUniques.length} types`);
    
    // Afficher le mapping pour référence
    console.log('\n📋 Mapping des types par œuvre:');
    Object.entries(typesUtilisateursParOeuvre).forEach(([id, config]) => {
      console.log(`\n${config.nom_oeuvre} (ID: ${id}):`);
      console.log(`  → ${config.types.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des types:', error);
    throw error;
  }
}

// Fonction pour obtenir les types d'utilisateurs pour un type d'œuvre
async function getTypesForOeuvreType(typeOeuvreId) {
  const config = typesUtilisateursParOeuvre[typeOeuvreId];
  if (!config) return [];
  
  const types = await db.TypeUser.findAll({
    where: {
      nom_type: config.types
    }
  });
  
  return types;
}

// Exporter les fonctions utiles
module.exports = {
  seedTypeUsers,
  getTypesForOeuvreType,
  typesUtilisateursParOeuvre
};

// Exécuter si appelé directement
if (require.main === module) {
  seedTypeUsers()
    .then(() => {
      console.log('\n✨ Terminé');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erreur:', error);
      process.exit(1);
    });
}