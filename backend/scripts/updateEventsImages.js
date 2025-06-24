// scripts/updateImagesCorrectPath.js - Avec la bonne structure de dossiers
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const sequelize = new Sequelize('actionculture', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

// Import des modèles
const models = {};
models.Evenement = require('../models/events/Evenement')(sequelize);
models.Media = require('../models/misc/Media')(sequelize);

// Configuration des chemins
const UPLOAD_PATHS = {
  images: '/uploads/events/images/',
  audio: '/uploads/events/audio/',
  videos: '/uploads/events/videos/',
  documents: '/uploads/events/documents/'
};

// Chemins physiques pour créer les dossiers
const PHYSICAL_PATHS = {
  images: path.join(__dirname, '..', 'uploads', 'events', 'images'),
  audio: path.join(__dirname, '..', 'uploads', 'events', 'audio'),
  videos: path.join(__dirname, '..', 'uploads', 'events', 'videos'),
  documents: path.join(__dirname, '..', 'uploads', 'events', 'documents')
};

// Fonction pour créer la structure des dossiers
async function createFolderStructure() {
  console.log('📁 Création de la structure des dossiers...\n');
  
  for (const [type, folderPath] of Object.entries(PHYSICAL_PATHS)) {
    try {
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✅ Dossier créé: ${folderPath}`);
      } else {
        console.log(`⚠️  Dossier existant: ${folderPath}`);
      }
    } catch (error) {
      console.log(`❌ Erreur création dossier ${type}: ${error.message}`);
    }
  }
  
  console.log('\n📋 Structure créée:');
  console.log('uploads/');
  console.log('└── events/');
  console.log('    ├── images/');
  console.log('    ├── audio/');
  console.log('    ├── videos/');
  console.log('    └── documents/');
}

// Fonction pour mettre à jour les images
async function updateEventsImages() {
  try {
    console.log('\n🖼️  Mise à jour des images avec les bons chemins...\n');
    
    // Récupérer tous les événements
    const evenements = await models.Evenement.findAll({
      attributes: ['id_evenement', 'nom_evenement', 'image_url']
    });
    
    console.log(`📊 ${evenements.length} événements trouvés\n`);
    
    // Définir les images pour chaque événement
    const imagesData = [
      {
        nom_evenement: "Festival de Musique Andalouse 2025",
        image_url: `${UPLOAD_PATHS.images}festival-andalouse-2025.jpg`,
        medias: [
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}festival-andalouse-affiche.jpg`,
            titre: "Affiche officielle",
            description: "Affiche du Festival de Musique Andalouse 2025"
          },
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}festival-andalouse-scene.jpg`,
            titre: "Scène principale",
            description: "Vue de la scène du festival"
          },
          {
            type: "audio",
            url: `${UPLOAD_PATHS.audio}festival-andalouse-teaser.mp3`,
            titre: "Teaser audio",
            description: "Extrait musical du festival"
          },
          {
            type: "video",
            url: `${UPLOAD_PATHS.videos}festival-andalouse-promo.mp4`,
            titre: "Vidéo promotionnelle",
            description: "Présentation vidéo du festival"
          }
        ]
      },
      {
        nom_evenement: "Exposition Art Contemporain - Visions d'Algérie",
        image_url: `${UPLOAD_PATHS.images}expo-art-contemporain-2025.jpg`,
        medias: [
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}expo-art-affiche.jpg`,
            titre: "Affiche de l'exposition",
            description: "Design officiel de l'exposition"
          },
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}expo-art-oeuvre-1.jpg`,
            titre: "Œuvre principale",
            description: "Une des œuvres phares"
          },
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}expo-art-galerie.jpg`,
            titre: "Vue de la galerie",
            description: "Espace d'exposition"
          },
          {
            type: "document",
            url: `${UPLOAD_PATHS.documents}expo-art-catalogue.pdf`,
            titre: "Catalogue de l'exposition",
            description: "Catalogue PDF des œuvres exposées"
          }
        ]
      },
      {
        nom_evenement: "Projection - Cinéma Algérien Contemporain",
        image_url: `${UPLOAD_PATHS.images}projection-cinema-2025.jpg`,
        medias: [
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}cinema-affiche-film.jpg`,
            titre: "Affiche du film",
            description: "Affiche officielle"
          },
          {
            type: "video",
            url: `${UPLOAD_PATHS.videos}cinema-bande-annonce.mp4`,
            titre: "Bande-annonce",
            description: "Bande-annonce officielle"
          },
          {
            type: "document",
            url: `${UPLOAD_PATHS.documents}cinema-dossier-presse.pdf`,
            titre: "Dossier de presse",
            description: "Informations pour la presse"
          }
        ]
      },
      {
        nom_evenement: "Atelier d'Écriture Créative",
        image_url: `${UPLOAD_PATHS.images}atelier-ecriture-2025.jpg`,
        medias: [
          {
            type: "image",
            url: `${UPLOAD_PATHS.images}atelier-ecriture-salle.jpg`,
            titre: "Salle d'atelier",
            description: "Espace de travail"
          },
          {
            type: "document",
            url: `${UPLOAD_PATHS.documents}atelier-ecriture-programme.pdf`,
            titre: "Programme détaillé",
            description: "Programme complet de l'atelier"
          },
          {
            type: "document",
            url: `${UPLOAD_PATHS.documents}atelier-ecriture-exercices.pdf`,
            titre: "Exercices pratiques",
            description: "Exercices d'écriture créative"
          }
        ]
      }
    ];
    
    // Mettre à jour les événements
    for (const data of imagesData) {
      const event = evenements.find(e => e.nom_evenement === data.nom_evenement);
      
      if (!event) {
        console.log(`⚠️  Événement non trouvé: ${data.nom_evenement}`);
        continue;
      }
      
      try {
        // Mettre à jour l'image principale
        await event.update({ image_url: data.image_url });
        console.log(`✅ ${data.nom_evenement}`);
        console.log(`   Image principale: ${data.image_url}`);
        
        // Ajouter les médias supplémentaires
        if (data.medias && data.medias.length > 0) {
          console.log(`   📎 Ajout de ${data.medias.length} médias:`);
          
          for (let i = 0; i < data.medias.length; i++) {
            const media = data.medias[i];
            
            try {
              // Vérifier si le média existe
              const exists = await models.Media.findOne({
                where: {
                  id_evenement: event.id_evenement,
                  url: media.url
                }
              });
              
              if (!exists) {
                await models.Media.create({
                  id_evenement: event.id_evenement,
                  type_media: media.type,
                  url: media.url,
                  titre: media.titre,
                  nom: media.titre,
                  description: media.description,
                  ordre: i + 1,
                  visible_public: true
                });
                console.log(`      ✅ ${media.type}: ${media.titre}`);
              } else {
                console.log(`      ⚠️  ${media.type}: ${media.titre} (existe déjà)`);
              }
            } catch (error) {
              console.log(`      ❌ Erreur: ${error.message}`);
            }
          }
        }
        console.log('');
        
      } catch (error) {
        console.log(`❌ Erreur pour ${data.nom_evenement}: ${error.message}\n`);
      }
    }
    
    // Générer des images par défaut pour les événements sans image
    console.log('🎨 Images par défaut pour les événements restants...\n');
    
    const defaultImages = {
      'festival': `${UPLOAD_PATHS.images}default-festival.jpg`,
      'exposition': `${UPLOAD_PATHS.images}default-exposition.jpg`,
      'conference': `${UPLOAD_PATHS.images}default-conference.jpg`,
      'theatre': `${UPLOAD_PATHS.images}default-theatre.jpg`,
      'atelier': `${UPLOAD_PATHS.images}default-atelier.jpg`,
      'concert': `${UPLOAD_PATHS.images}default-concert.jpg`,
      'projection': `${UPLOAD_PATHS.images}default-projection.jpg`,
      'salon': `${UPLOAD_PATHS.images}default-salon.jpg`,
      'default': `${UPLOAD_PATHS.images}default-event.jpg`
    };
    
    // Requête SQL pour mettre à jour avec les images par défaut
    await sequelize.query(`
      UPDATE evenement e
      JOIN type_evenement te ON e.id_type_evenement = te.id_type_evenement
      SET e.image_url = CASE
        WHEN LOWER(te.nom_type) LIKE '%festival%' THEN '${defaultImages.festival}'
        WHEN LOWER(te.nom_type) LIKE '%exposition%' THEN '${defaultImages.exposition}'
        WHEN LOWER(te.nom_type) LIKE '%conference%' THEN '${defaultImages.conference}'
        WHEN LOWER(te.nom_type) LIKE '%theatre%' THEN '${defaultImages.theatre}'
        WHEN LOWER(te.nom_type) LIKE '%atelier%' THEN '${defaultImages.atelier}'
        WHEN LOWER(te.nom_type) LIKE '%concert%' THEN '${defaultImages.concert}'
        WHEN LOWER(te.nom_type) LIKE '%projection%' THEN '${defaultImages.projection}'
        WHEN LOWER(te.nom_type) LIKE '%salon%' THEN '${defaultImages.salon}'
        ELSE '${defaultImages.default}'
      END
      WHERE e.image_url IS NULL OR e.image_url = ''
    `);
    
    console.log('✅ Images par défaut appliquées\n');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Fonction pour afficher le résumé
async function showSummary() {
  try {
    console.log('📊 RÉSUMÉ DES MÉDIAS\n');
    
    // Statistiques par type de média
    const [stats] = await sequelize.query(`
      SELECT 
        type_media,
        COUNT(*) as nombre,
        COUNT(DISTINCT id_evenement) as nb_evenements
      FROM media
      GROUP BY type_media
    `);
    
    console.log('📈 Médias par type:');
    stats.forEach(s => {
      console.log(`   ${s.type_media}: ${s.nombre} fichiers (${s.nb_evenements} événements)`);
    });
    
    // Événements et leurs médias
    const [events] = await sequelize.query(`
      SELECT 
        e.nom_evenement,
        e.image_url,
        COUNT(m.id_media) as nb_medias,
        GROUP_CONCAT(DISTINCT m.type_media) as types_media
      FROM evenement e
      LEFT JOIN media m ON e.id_evenement = m.id_evenement
      GROUP BY e.id_evenement
      ORDER BY e.date_creation DESC
    `);
    
    console.log('\n📋 Événements et leurs médias:\n');
    events.forEach(e => {
      console.log(`• ${e.nom_evenement}`);
      console.log(`  Image: ${e.image_url || 'Aucune'}`);
      console.log(`  Médias: ${e.nb_medias} ${e.types_media ? `(${e.types_media})` : ''}\n`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Configuration Express pour servir les fichiers
function showExpressConfig() {
  console.log('\n⚙️  CONFIGURATION EXPRESS\n');
  console.log('Ajoutez ces lignes dans votre app.js ou server.js:\n');
  console.log(`// Servir les fichiers uploadés
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ou avec plus de contrôle:
app.use('/uploads/events/images', express.static(path.join(__dirname, 'uploads/events/images')));
app.use('/uploads/events/videos', express.static(path.join(__dirname, 'uploads/events/videos')));
app.use('/uploads/events/audio', express.static(path.join(__dirname, 'uploads/events/audio')));
app.use('/uploads/events/documents', express.static(path.join(__dirname, 'uploads/events/documents')));
`);
}

// Menu principal
async function main() {
  console.log('📁 GESTION DES MÉDIAS - STRUCTURE CORRECTE');
  console.log('═══════════════════════════════════════════\n');
  console.log('Structure des dossiers:');
  console.log('  uploads/events/images/');
  console.log('  uploads/events/audio/');
  console.log('  uploads/events/videos/');
  console.log('  uploads/events/documents/\n');
  
  console.log('Options:');
  console.log('1. Créer la structure des dossiers');
  console.log('2. Mettre à jour les images et médias');
  console.log('3. Tout faire (1 + 2)');
  console.log('4. Voir le résumé');
  console.log('5. Voir la configuration Express\n');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Votre choix (1-5): ', async (answer) => {
    console.log('');
    
    await sequelize.authenticate();
    
    switch(answer) {
      case '1':
        await createFolderStructure();
        break;
      case '2':
        await updateEventsImages();
        await showSummary();
        break;
      case '3':
        await createFolderStructure();
        console.log('');
        await updateEventsImages();
        await showSummary();
        break;
      case '4':
        await showSummary();
        break;
      case '5':
        showExpressConfig();
        break;
      default:
        console.log('❌ Choix invalide');
    }
    
    await sequelize.close();
    rl.close();
  });
}

// Exécuter
if (require.main === module) {
  main();
}