// models/index.js - Version corrigée qui expose sequelize ET les modèles

const { createDatabaseConnection } = require('../config/database');

// Sauvegarder vos fonctions originales
const originalModule = require('./index-original');
const { loadModels, initializeAssociations, insertDefaultData, importData, resetDatabase } = originalModule;

// Initialiser Sequelize et les modèles au chargement du module
const env = process.env.NODE_ENV || 'development';
console.log(`📂 Initialisation des modèles pour l'environnement: ${env}`);

// Créer la connexion
const sequelize = createDatabaseConnection(env);

// Charger tous les modèles
const models = loadModels(sequelize);
console.log(`✅ ${Object.keys(models).length} modèles chargés`);

// Initialiser les associations
initializeAssociations(models);
console.log('🔗 Associations établies');

// Créer l'objet db compatible avec app.js ET les migrations
const db = {
  ...models,              // Tous vos modèles
  sequelize: sequelize,   // ✅ L'instance Sequelize (pour app.js)
  Sequelize: require('sequelize')  // ✅ La classe Sequelize
};

// Ajouter les fonctions utilitaires pour compatibilité
db.initializeDatabase = originalModule.initializeDatabase;
db.resetDatabase = resetDatabase;
db.insertDefaultData = insertDefaultData;
db.importData = importData;

// Export qui fonctionne pour app.js ET les migrations
module.exports = db;