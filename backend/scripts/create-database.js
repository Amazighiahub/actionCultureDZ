require('dotenv').config();
const { createDatabase } = require('../config/database');

const main = async () => {
  try {
    console.log('🗄️  Création de la base de données...');
    
    const config = {
      database: process.env.DB_NAME || 'actionculture',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306
    };
    
    await createDatabase(config);
    console.log('✅ Base de données créée avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
};

main();

