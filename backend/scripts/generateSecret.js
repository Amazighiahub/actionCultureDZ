// backend/generateSecret.js - Script pour générer un JWT_SECRET sécurisé
const crypto = require('crypto');

// Générer un secret sécurisé
const generateSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

console.log('🔐 Génération d\'un JWT_SECRET sécurisé...\n');

const secret = generateSecret();

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Écrire le secret dans .env si présent et non défini
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('JWT_SECRET=')) {
    logger.warn('⚠️  JWT_SECRET existe déjà dans .env — aucune modification effectuée');
    logger.info('Si vous souhaitez remplacer le secret, modifiez .env manuellement.');
  } else {
    fs.appendFileSync(envPath, `\nJWT_SECRET=${secret}\n`);
    logger.info('✅ JWT_SECRET ajouté à votre fichier .env (ne le committez pas)');
  }
} else {
  // Créer un .env.example si besoin
  const examplePath = path.join(__dirname, '..', '.env.example');
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    fs.appendFileSync(envPath, `\nJWT_SECRET=${secret}\n`);
    logger.info('✅ .env créé depuis .env.example et JWT_SECRET ajouté');
  } else {
    fs.writeFileSync(envPath, `JWT_SECRET=${secret}\n`);
    logger.info('✅ Fichier .env créé et JWT_SECRET ajouté');
  }

  logger.info('⚠️ IMPORTANT: Ne partagez jamais ce secret et ne le commitez pas dans git');
}