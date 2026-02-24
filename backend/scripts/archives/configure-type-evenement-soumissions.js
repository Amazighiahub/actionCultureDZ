/**
 * Script pour configurer les types d'événements avec la soumission d'œuvres
 * Usage: node scripts/configure-type-evenement-soumissions.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Sequelize } = require('sequelize');

// Configuration de la connexion
const sequelize = new Sequelize(
  process.env.DB_NAME || 'actionculture',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// Configurations par type d'événement
const configurationsParType = {
  // Salon du livre - accepte des livres
  'salon': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['livre', 'book', 'roman', 'poésie', 'poème', 'poetry'],
      requis: false,
      max_soumissions: 5,
      label: { fr: 'Livres à présenter', ar: 'الكتب للعرض', en: 'Books to present' }
    }
  },
  'livre': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['livre', 'book', 'roman', 'poésie', 'poème', 'poetry'],
      requis: false,
      max_soumissions: 5,
      label: { fr: 'Livres à présenter', ar: 'الكتب للعرض', en: 'Books to present' }
    }
  },
  // Exposition d'art - accepte des œuvres d'art
  'exposition': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['peinture', 'sculpture', 'art', 'painting', 'dessin', 'drawing', 'photographie', 'photo'],
      requis: false,
      max_soumissions: 10,
      label: { fr: 'Œuvres à exposer', ar: 'الأعمال للعرض', en: 'Works to exhibit' }
    }
  },
  'art': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['peinture', 'sculpture', 'art', 'painting', 'dessin', 'drawing', 'photographie', 'photo'],
      requis: false,
      max_soumissions: 10,
      label: { fr: 'Œuvres à exposer', ar: 'الأعمال للعرض', en: 'Works to exhibit' }
    }
  },
  // Festival de musique - accepte de la musique
  'festival': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['musique', 'music', 'chanson', 'song', 'composition'],
      requis: false,
      max_soumissions: 3,
      label: { fr: 'Musiques à présenter', ar: 'الموسيقى للعرض', en: 'Music to present' }
    }
  },
  'musique': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['musique', 'music', 'chanson', 'song', 'composition'],
      requis: false,
      max_soumissions: 3,
      label: { fr: 'Musiques à présenter', ar: 'الموسيقى للعرض', en: 'Music to present' }
    }
  },
  // Festival de cinéma - accepte des films
  'cinema': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['film', 'video', 'documentaire', 'court-métrage', 'movie'],
      requis: true,
      max_soumissions: 2,
      label: { fr: 'Films à soumettre', ar: 'الأفلام للتقديم', en: 'Films to submit' }
    }
  },
  'film': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: ['film', 'video', 'documentaire', 'court-métrage', 'movie'],
      requis: true,
      max_soumissions: 2,
      label: { fr: 'Films à soumettre', ar: 'الأفلام للتقديم', en: 'Films to submit' }
    }
  },
  // Concours - accepte toutes les œuvres
  'concours': {
    accepte_soumissions: true,
    config_soumission: {
      type_oeuvre: [], // Tous les types acceptés
      requis: true,
      max_soumissions: 3,
      label: { fr: 'Œuvres en compétition', ar: 'الأعمال المتنافسة', en: 'Works in competition' }
    }
  }
};

async function configureTypesEvenements() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');

    // Récupérer tous les types d'événements
    const [types] = await sequelize.query('SELECT * FROM type_evenement');

    console.log(`📋 ${types.length} types d'événements trouvés:\n`);

    for (const type of types) {
      const nomType = typeof type.nom_type === 'string'
        ? JSON.parse(type.nom_type)
        : type.nom_type;

      const nomFr = nomType?.fr || nomType?.ar || 'Inconnu';
      console.log(`  - ID ${type.id_type_evenement}: ${nomFr}`);

      // Chercher une configuration correspondante
      let configTrouvee = null;
      const nomLower = nomFr.toLowerCase();

      for (const [motCle, config] of Object.entries(configurationsParType)) {
        if (nomLower.includes(motCle)) {
          configTrouvee = config;
          break;
        }
      }

      if (configTrouvee) {
        await sequelize.query(`
          UPDATE type_evenement
          SET accepte_soumissions = :accepte_soumissions,
              config_soumission = :config_soumission
          WHERE id_type_evenement = :id
        `, {
          replacements: {
            accepte_soumissions: configTrouvee.accepte_soumissions,
            config_soumission: JSON.stringify(configTrouvee.config_soumission),
            id: type.id_type_evenement
          }
        });
        console.log(`    ✅ Configuré avec soumission d'œuvres`);
      } else {
        console.log(`    ⏭️  Pas de soumission (type générique)`);
      }
    }

    console.log('\n✅ Configuration terminée!\n');

    // Afficher un résumé
    const [typesAvecSoumission] = await sequelize.query(
      'SELECT id_type_evenement, nom_type, config_soumission FROM type_evenement WHERE accepte_soumissions = 1'
    );

    console.log(`📊 ${typesAvecSoumission.length} types acceptent maintenant les soumissions d'œuvres\n`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Exécuter
configureTypesEvenements();
