// scripts/validate-professionals.js
// Script pour valider les comptes professionnels en attente

const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Identifiants admin (à modifier selon votre configuration)
const ADMIN_CREDENTIALS = {
  email: 'admin@actionculture.dz',
  password: 'Admin123!'
};

async function validateProfessionals() {
  console.log('🔐 VALIDATION DES PROFESSIONNELS\n');
  
  try {
    // 1. Se connecter en tant qu'admin
    console.log('1. Connexion admin...');
    let adminToken;
    
    try {
      const loginRes = await axios.post(`${API_URL}/users/login`, ADMIN_CREDENTIALS);
      adminToken = loginRes.data.token;
      console.log('   ✅ Connecté comme:', loginRes.data.user.email);
      console.log('   👤 Type:', loginRes.data.user.type_user);
      
      if (loginRes.data.user.type_user !== 'admin') {
        console.error('   ❌ L\'utilisateur n\'est pas admin!');
        console.log('\n💡 Créez d\'abord un admin avec: node create-admin.js');
        return;
      }
    } catch (error) {
      console.error('   ❌ Connexion échouée:', error.response?.data?.error || error.message);
      console.log('\n💡 Solutions:');
      console.log('   1. Créez un admin: node create-admin.js');
      console.log('   2. Ou modifiez ADMIN_CREDENTIALS dans ce script');
      return;
    }
    
    const authHeaders = {
      'Authorization': `Bearer ${adminToken}`
    };
    
    // 2. Récupérer les professionnels en attente
    console.log('\n2. Récupération des professionnels en attente...');
    
    try {
      const pendingRes = await axios.get(`${API_URL}/users/admin/professionals/pending`, {
        headers: authHeaders
      });
      
      const pending = pendingRes.data.data || [];
      console.log(`   📋 ${pending.length} professionnel(s) en attente de validation`);
      
      if (pending.length === 0) {
        console.log('\n✅ Aucun professionnel en attente');
        
        // Afficher tous les professionnels
        console.log('\n3. Liste des professionnels existants:');
        const allUsersRes = await axios.get(`${API_URL}/users/admin/users?type_user=professionnel`, {
          headers: authHeaders
        });
        
        const professionals = allUsersRes.data.data || [];
        professionals.forEach(pro => {
          console.log(`   - ${pro.nom} ${pro.prenom} (${pro.email})`);
          console.log(`     Statut: ${pro.statut_validation_pro || 'non défini'}`);
        });
        
        return;
      }
      
      // 3. Valider chaque professionnel
      console.log('\n3. Validation des professionnels...\n');
      
      for (const pro of pending) {
        console.log(`   👤 ${pro.nom} ${pro.prenom}`);
        console.log(`      Email: ${pro.email}`);
        console.log(`      Type: ${pro.sous_type_user || 'non spécifié'}`);
        console.log(`      Inscrit le: ${new Date(pro.created_at).toLocaleDateString()}`);
        
        try {
          // Valider le professionnel
          const validateRes = await axios.patch(
            `${API_URL}/users/admin/users/${pro.id_user}/validate`,
            {
              valide: true,
              raison: 'Validation automatique pour tests'
            },
            { headers: authHeaders }
          );
          
          console.log(`      ✅ Validé avec succès!\n`);
        } catch (error) {
          console.error(`      ❌ Erreur:`, error.response?.data?.error || error.message);
        }
      }
      
      console.log('✅ Processus de validation terminé');
      
    } catch (error) {
      console.error('❌ Erreur lors de la récupération:', error.response?.data?.error || error.message);
      
      if (error.response?.status === 403) {
        console.log('\n⚠️  Accès refusé - Vérifiez que l\'utilisateur est bien admin');
      }
    }
    
    // 4. Afficher un résumé
    console.log('\n4. Résumé des professionnels validés:');
    
    try {
      const validatedRes = await axios.get(`${API_URL}/users/admin/users?type_user=professionnel&statut_validation_pro=valide`, {
        headers: authHeaders
      });
      
      const validated = validatedRes.data.data || [];
      console.log(`\n✅ Total des professionnels validés: ${validated.length}`);
      
      validated.forEach(pro => {
        console.log(`   - ${pro.nom} ${pro.prenom} (${pro.email})`);
        console.log(`     Type: ${pro.sous_type_user || 'non spécifié'}`);
      });
      
      if (validated.length > 0) {
        console.log('\n🎉 Ces professionnels peuvent maintenant créer des événements!');
      }
      
    } catch (error) {
      console.error('Erreur lors du résumé:', error.message);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
  }
}

// Option pour valider un professionnel spécifique par email
async function validateByEmail(email) {
  console.log(`🔍 Validation du professionnel: ${email}\n`);
  
  try {
    // Se connecter comme admin
    const loginRes = await axios.post(`${API_URL}/users/login`, ADMIN_CREDENTIALS);
    const adminToken = loginRes.data.token;
    
    // Rechercher l'utilisateur
    const usersRes = await axios.get(`${API_URL}/users/admin/users?email=${email}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const user = usersRes.data.data?.[0];
    if (!user) {
      console.error('❌ Utilisateur non trouvé');
      return;
    }
    
    // Valider
    await axios.patch(
      `${API_URL}/users/admin/users/${user.id_user}/validate`,
      { valide: true },
      { headers: { 'Authorization': `Bearer ${adminToken}` } }
    );
    
    console.log('✅ Professionnel validé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data?.error || error.message);
  }
}

// Gestion des arguments
const args = process.argv.slice(2);
if (args[0] === '--email' && args[1]) {
  validateByEmail(args[1]);
} else {
  // Instructions
  if (args.length > 0 && args[0] !== '--help') {
    console.log('⚠️  Argument non reconnu\n');
  }
  
  console.log('📖 UTILISATION:');
  console.log('   node validate-professionals.js           # Valider tous les professionnels en attente');
  console.log('   node validate-professionals.js --email user@example.com  # Valider un utilisateur spécifique');
  console.log('');
  
  // Lancer la validation générale
  validateProfessionals();
}

module.exports = { validateProfessionals, validateByEmail };