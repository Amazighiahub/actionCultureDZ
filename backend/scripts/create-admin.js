// scripts/create-admin.js
// Script pour créer un compte administrateur

const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:3001/api';

// Interface pour lire les entrées utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createAdmin() {
  console.log('🔐 CRÉATION D\'UN COMPTE ADMINISTRATEUR\n');
  
  try {
    // 1. Vérifier le serveur
    console.log('Vérification du serveur...');
    try {
      await axios.get('http://localhost:3001/health');
      console.log('✅ Serveur accessible\n');
    } catch (e) {
      console.error('❌ Serveur non accessible. Lancez: npm start');
      process.exit(1);
    }
    
    // 2. Demander les informations
    console.log('Entrez les informations de l\'administrateur:\n');
    
    const nom = await question('Nom: ') || 'Admin';
    const prenom = await question('Prénom: ') || 'System';
    const email = await question('Email: ') || 'admin@actionculture.dz';
    const password = await question('Mot de passe (8+ caractères): ') || 'Admin123!';
    const telephone = await question('Téléphone: ') || '+213 21 00 00 00';
    
    rl.close();
    
    // 3. Créer l'utilisateur admin
    console.log('\nCréation du compte admin...');
    
    const adminData = {
      nom,
      prenom,
      email,
      password,
      telephone,
      type_user: 'admin', // Important !
      accepte_conditions: 'true',
      date_naissance: '1980-01-01',
      adresse: 'Siège Action Culture',
      code_postal: '16000',
      pays: 'Algérie'
    };
    
    try {
      const res = await axios.post(`${API_URL}/users/register`, adminData);
      console.log('\n✅ Compte administrateur créé avec succès!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', email);
      console.log('Mot de passe:', password);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // 4. Se connecter pour vérifier
      console.log('\nTest de connexion...');
      const loginRes = await axios.post(`${API_URL}/users/login`, {
        email,
        password
      });
      
      console.log('✅ Connexion réussie!');
      console.log('Rôle:', loginRes.data.user.type_user);
      
      // 5. Donner des instructions
      console.log('\n📋 PROCHAINES ÉTAPES:');
      console.log('1. Connectez-vous avec ces identifiants');
      console.log('2. Accédez au tableau de bord admin: /api/admin/dashboard');
      console.log('3. Validez les professionnels en attente: /api/users/admin/professionals/pending');
      
    } catch (error) {
      if (error.response?.data?.error?.includes('existe déjà')) {
        console.error('\n⚠️  Un utilisateur avec cet email existe déjà');
        console.log('💡 Essayez avec un autre email ou connectez-vous avec les identifiants existants');
      } else {
        console.error('\n❌ Erreur:', error.response?.data?.error || error.message);
        
        if (error.response?.data?.errors) {
          console.log('\nErreurs de validation:');
          error.response.data.errors.forEach(err => {
            console.log(`- ${err.param}: ${err.msg}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  }
}

// Lancer le script
createAdmin().catch(console.error);