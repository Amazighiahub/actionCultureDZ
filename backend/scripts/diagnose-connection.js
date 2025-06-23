// scripts/diagnose-connection.js
// Script pour diagnostiquer les problèmes de connexion

const axios = require('axios');
const http = require('http');
const net = require('net');

// URLs possibles à tester
const urlsToTest = [
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://0.0.0.0:3001',
  'http://[::1]:3001', // IPv6
];

// Fonction pour tester un port
function testPort(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(2000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

// Fonction pour tester une URL
async function testUrl(url) {
  try {
    console.log(`\n🔍 Test de ${url}`);
    
    // Test 1: Ping basique
    const response = await axios.get(url, { 
      timeout: 3000,
      validateStatus: () => true // Accepter tous les codes de statut
    });
    
    console.log(`   ✅ Accessible! Status: ${response.status}`);
    
    // Test 2: Route /health
    try {
      const healthRes = await axios.get(`${url}/health`, { timeout: 3000 });
      console.log(`   ✅ /health accessible:`, healthRes.data.status || 'OK');
      return { url, success: true, health: true };
    } catch (e) {
      console.log(`   ⚠️  /health non accessible`);
      return { url, success: true, health: false };
    }
    
  } catch (error) {
    console.log(`   ❌ Non accessible:`, error.code || error.message);
    return { url, success: false };
  }
}

// Fonction principale
async function diagnose() {
  console.log('🔍 DIAGNOSTIC DE CONNEXION ACTION CULTURE');
  console.log('=========================================\n');
  
  // 1. Informations système
  console.log('1️⃣ Informations système:');
  console.log(`   OS: ${process.platform}`);
  console.log(`   Node: ${process.version}`);
  console.log(`   Dossier: ${process.cwd()}`);
  
  // 2. Variables d'environnement
  console.log('\n2️⃣ Configuration détectée:');
  console.log(`   PORT (env): ${process.env.PORT || 'non défini'}`);
  console.log(`   BASE_URL (env): ${process.env.BASE_URL || 'non défini'}`);
  console.log(`   API_URL (env): ${process.env.API_URL || 'non défini'}`);
  
  // 3. Test des ports courants
  console.log('\n3️⃣ Test des ports:');
  const ports = [3000, 3001, 8000, 8080, 5000];
  for (const port of ports) {
    const isOpen = await testPort('localhost', port);
    console.log(`   Port ${port}: ${isOpen ? '✅ OUVERT' : '❌ FERMÉ'}`);
  }
  
  // 4. Test des URLs
  console.log('\n4️⃣ Test des URLs:');
  const results = [];
  
  for (const url of urlsToTest) {
    const result = await testUrl(url);
    results.push(result);
  }
  
  // 5. URL personnalisée si définie
  if (process.env.BASE_URL) {
    console.log('\n5️⃣ Test de BASE_URL définie:');
    const customResult = await testUrl(process.env.BASE_URL);
    results.push(customResult);
  }
  
  // 6. Résumé et recommandations
  console.log('\n\n📊 RÉSUMÉ:');
  console.log('═══════════════════════════════════════');
  
  const working = results.find(r => r.success);
  
  if (working) {
    console.log(`\n✅ SERVEUR TROUVÉ: ${working.url}`);
    
    if (working.health) {
      console.log('   ✅ Route /health fonctionnelle');
    } else {
      console.log('   ⚠️  Route /health non accessible');
    }
    
    console.log('\n💡 SOLUTION:');
    console.log('   Mettez à jour vos scripts pour utiliser cette URL:');
    console.log(`   const BASE_URL = '${working.url}';`);
    
    console.log('\n   Ou créez un fichier .env dans le dossier scripts:');
    console.log(`   echo "BASE_URL=${working.url}" > scripts/.env`);
    
  } else {
    console.log('\n❌ AUCUN SERVEUR TROUVÉ');
    console.log('\n💡 VÉRIFICATIONS À FAIRE:');
    console.log('   1. Le serveur est-il vraiment lancé ?');
    console.log('      Vérifiez avec: ps aux | grep node (Linux/Mac)');
    console.log('      ou: tasklist | findstr node (Windows)');
    console.log('\n   2. Sur quel port écoute-t-il ?');
    console.log('      Vérifiez les logs du serveur');
    console.log('      Ou le fichier .env du backend');
    console.log('\n   3. Y a-t-il un firewall/antivirus qui bloque ?');
    console.log('      Essayez de désactiver temporairement');
  }
  
  // 7. Test direct avec http.get
  console.log('\n\n7️⃣ Test alternatif (http natif):');
  
  const testNative = (url) => {
    return new Promise((resolve) => {
      http.get(url, { timeout: 3000 }, (res) => {
        console.log(`   ✅ ${url} - Status: ${res.statusCode}`);
        resolve(true);
      }).on('error', (err) => {
        console.log(`   ❌ ${url} - Erreur: ${err.code}`);
        resolve(false);
      });
    });
  };
  
  await testNative('http://localhost:3001');
  await testNative('http://127.0.0.1:3001');
  
  console.log('\n✨ Diagnostic terminé');
}

// Lancer le diagnostic
if (require.main === module) {
  diagnose().catch(console.error);
}

module.exports = diagnose;