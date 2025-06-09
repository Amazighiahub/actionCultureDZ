// backend/generateSecret.js - Script pour générer un JWT_SECRET sécurisé
const crypto = require('crypto');

// Générer un secret sécurisé
const generateSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

console.log('🔐 Génération d\'un JWT_SECRET sécurisé...\n');

const secret = generateSecret();

console.log('Ajoutez cette ligne à votre fichier .env :');
console.log('─'.repeat(80));
console.log(`JWT_SECRET=${secret}`);
console.log('─'.repeat(80));

console.log('\n⚠️  IMPORTANT :');
console.log('- Ne partagez JAMAIS ce secret');
console.log('- Ne le committez PAS dans git');
console.log('- Changez-le régulièrement en production');
console.log('- Utilisez un secret différent par environnement\n');

// Vérifier si .env existe
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('📄 Fichier .env détecté');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('JWT_SECRET=')) {
    console.log('⚠️  JWT_SECRET existe déjà dans .env');
    console.log('   Remplacez-le manuellement si nécessaire');
  } else {
    console.log('✅ Vous pouvez ajouter le JWT_SECRET à votre .env');
  }
} else {
  console.log('❌ Fichier .env non trouvé');
  console.log('   Créez-le d\'abord avec : cp .env.example .env');
}