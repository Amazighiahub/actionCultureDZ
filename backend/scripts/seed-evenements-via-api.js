// seed-evenements-simple.js
// Version simplifiée - Assurez-vous que le serveur est déjà lancé !

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const CONFIG = {
  API_URL: 'http://localhost:3001/api',
  TOKEN: null, // Sera défini après connexion
  IMAGES_DIR: './temp_images',
  LOGIN_CREDENTIALS: {
    email: 'admin@actionculture.dz',
    password: 'Admin123!' // Remplacez par votre mot de passe
  }
};

// Données des événements
const evenements = [
  {
    data: {
      nom_evenement: "Festival International du Raï d'Oran 2025",
      description: "Le plus grand festival de musique raï au monde revient à Oran !",
      date_debut: "2025-08-15T18:00:00",
      date_fin: "2025-08-17T23:59:00",
      id_lieu: 1,
      id_type_evenement: 1,
      capacite_max: 5000,
      tarif: 2500,
      inscription_requise: true,
      age_minimum: 16,
      accessibilite: "Site accessible PMR",
      contact_email: "festival.rai@oran2025.dz",
      contact_telephone: "041123456",
      image_url: "/uploads/images/rai.png"
    },
    image: 'rai.png'
  },
  {
    data: {
      nom_evenement: "Salon National de l'Artisanat",
      description: "Découvrez les trésors de l'artisanat algérien.",
      date_debut: "2025-09-20T09:00:00",
      date_fin: "2025-09-25T19:00:00",
      id_lieu: 2,
      id_type_evenement: 2,
      capacite_max: 1000,
      tarif: 200,
      inscription_requise: false,
      image_url: "/uploads/images/th.jpg"
    },
    image: 'th.jpg'
  },
  {
    data: {
      nom_evenement: "Festival du Film Amazigh",
      description: "Célébration du cinéma amazigh.",
      date_debut: "2025-10-10T14:00:00",
      date_fin: "2025-10-15T22:00:00",
      id_lieu: 3,
      id_type_evenement: 3,
      capacite_max: 300,
      tarif: 500,
      inscription_requise: true,
      certificat_delivre: true,
      image_url: "/uploads/images/cinema-default.jpg"
    },
    image: 'filmAmazigh.jpeg'
  },
  {
    data: {
      nom_evenement: "Journées du Patrimoine Timgad",
      description: "Visitez les ruines romaines de Timgad.",
      date_debut: "2025-09-15T08:00:00",
      date_fin: "2025-09-17T20:00:00",
      id_lieu: 4,
      id_type_evenement: 4,
      capacite_max: 2000,
      tarif: 300,
      inscription_requise: false,
      image_url: "/uploads/images/Timgad_la_ville.jpg"
    },
    image: 'Timgad_la_ville.jpg'
  },
  {
    data: {
      nom_evenement: "Tech Algeria 2025",
      description: "Conférence tech: IA, blockchain, startups.",
      date_debut: "2025-11-20T09:00:00",
      date_fin: "2025-11-22T18:00:00",
      id_lieu: 5,
      id_type_evenement: 5,
      capacite_max: 800,
      tarif: 5000,
      inscription_requise: true,
      age_minimum: 18,
      certificat_delivre: true,
      image_url: "/uploads/images/tech-default.jpg"
    },
    image: 'tech.jpg'
  }
];

// Se connecter
async function login() {
  try {
    console.log('🔐 Connexion...');
    const response = await axios.post(
      `${CONFIG.API_URL}/users/login`, 
      CONFIG.LOGIN_CREDENTIALS
    );
    
    if (response.data.success) {
      CONFIG.TOKEN = response.data.data.token;
      console.log('✅ Connecté avec succès !');
      console.log(`   Utilisateur: ${response.data.data.user.email}`);
      console.log(`   Rôle: ${response.data.data.user.Roles[0]?.nom_role}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur connexion:', error.response?.data || error.message);
    return false;
  }
}

// Créer événement avec image
async function createEventWithImage(eventData, imageName) {
  try {
    const form = new FormData();
    
    // Ajouter les données
    Object.keys(eventData).forEach(key => {
      if (eventData[key] !== undefined) {
        form.append(key, eventData[key].toString());
      }
    });
    
    // Ajouter l'image si elle existe
    if (imageName) {
      const imagePath = path.join(CONFIG.IMAGES_DIR, imageName);
      if (fs.existsSync(imagePath)) {
        form.append('image', fs.createReadStream(imagePath));
        console.log(`   📸 Avec image: ${imageName}`);
      }
    }
    
    const response = await axios.post(
      `${CONFIG.API_URL}/evenements`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${CONFIG.TOKEN}`
        }
      }
    );
    
    console.log(`   ✅ Créé avec ID: ${response.data.data?.id_evenement}`);
    return response.data;
    
  } catch (error) {
    console.error(`   ❌ Erreur:`, error.response?.data?.error || error.message);
    return null;
  }
}

// Créer événement sans image
async function createEventJSON(eventData) {
  try {
    const response = await axios.post(
      `${CONFIG.API_URL}/evenements`,
      eventData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.TOKEN}`
        }
      }
    );
    
    console.log(`   ✅ Créé avec ID: ${response.data.data?.id_evenement}`);
    return response.data;
    
  } catch (error) {
    console.error(`   ❌ Erreur:`, error.response?.data?.error || error.message);
    return null;
  }
}

// Programme principal
async function main() {
  console.log('═════════════════════════════════════');
  console.log('🎭 CRÉATION D\'ÉVÉNEMENTS');
  console.log('═════════════════════════════════════\n');
  
  // Vérifier connexion serveur
  try {
    await axios.get(`${CONFIG.API_URL.replace('/api', '')}/health`);
    console.log('✅ Serveur accessible\n');
  } catch (error) {
    console.error('❌ Serveur non accessible !');
    console.error('   Lancez d\'abord: npm start\n');
    process.exit(1);
  }
  
  // Se connecter
  if (!await login()) {
    console.error('Impossible de se connecter');
    process.exit(1);
  }
  
  // Créer dossier images
  if (!fs.existsSync(CONFIG.IMAGES_DIR)) {
    fs.mkdirSync(CONFIG.IMAGES_DIR);
    console.log(`\n📁 Dossier ${CONFIG.IMAGES_DIR} créé`);
  }
  
  console.log('\n🎬 Création des événements...\n');
  
  let success = 0, failed = 0;
  
  // Créer chaque événement
  for (const [index, event] of evenements.entries()) {
    console.log(`${index + 1}. ${event.data.nom_evenement}`);
    
    let result;
    const hasLocalImage = event.image && 
      fs.existsSync(path.join(CONFIG.IMAGES_DIR, event.image));
    
    if (hasLocalImage) {
      result = await createEventWithImage(event.data, event.image);
    } else {
      console.log(`   📝 Sans image locale`);
      result = await createEventJSON(event.data);
    }
    
    result?.success ? success++ : failed++;
    
    // Pause entre les créations
    if (index < evenements.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Résumé
  console.log('\n═════════════════════════════════════');
  console.log(`✅ Réussis: ${success}/${evenements.length}`);
  console.log(`❌ Échoués: ${failed}/${evenements.length}`);
  console.log('═════════════════════════════════════\n');
}

// Lancer
main().catch(console.error);