// server.js - Point d'entrée principal de l'application
require('dotenv').config();
const http = require('http');
const App = require('./app');
const logger = require('./utils/logger');
const EnvironmentValidator = require('./config/envValidator');

// Configuration du port
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Fonction principale pour démarrer le serveur
async function startServer() {
  try {
    logger.info('🚀 Démarrage du serveur Action Culture...');
    
    // Valider la configuration d'environnement avant d'initialiser
    EnvironmentValidator.validate();
    EnvironmentValidator.printReport();

    // Créer et initialiser l'application
    const appInstance = new App();
    const app = await appInstance.initialize();
    
    // Créer le serveur HTTP
    const server = http.createServer(app);
    
    // Gérer les connexions WebSocket si nécessaire
    server.on('upgrade', (request, socket, head) => {
      logger.info('WebSocket connection attempt');
      // Implémenter la logique WebSocket si nécessaire
    });
    
    // Gérer la fermeture gracieuse
    const gracefulShutdown = async (signal) => {
      logger.info(`\n${signal} reçu, arrêt gracieux du serveur...`);
      
      server.close(async () => {
        logger.info('✅ Serveur HTTP fermé');
        
        try {
          // Fermer la base de données
          await appInstance.closeDatabase();
          
          logger.info('👋 Application arrêtée proprement');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Erreur lors de l\'arrêt:', error);
          process.exit(1);
        }
      });
      
      // Forcer l'arrêt après 30 secondes
      setTimeout(() => {
        logger.error('⚠️ Arrêt forcé après timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Écouter les signaux de fermeture
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Démarrer le serveur
    server.listen(PORT, HOST, () => {
      logger.info('═══════════════════════════════════════════════════');
      logger.info('🎉 Serveur Action Culture démarré avec succès !');
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`📍 Adresse locale: http://localhost:${PORT}`);
      logger.info(`📍 Adresse réseau: http://${HOST}:${PORT}`);
      logger.info(`📍 Documentation API: http://localhost:${PORT}/api`);
      logger.info(`📍 Santé: http://localhost:${PORT}/health`);
      logger.info('═══════════════════════════════════════════════════');
      logger.info(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🗄️  Base de données: ${process.env.DB_NAME || 'actionculture'}`);
      logger.info(`👤 Utilisateur DB: ${process.env.DB_USER || 'root'}`);
      logger.info('═══════════════════════════════════════════════════');
      
      // Afficher les routes disponibles en développement
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📋 Routes principales:');
        console.log('  - GET    /                    → Info API');
        console.log('  - GET    /health              → Santé du serveur');
        console.log('  - GET    /api                 → Documentation complète');
        console.log('  - POST   /api/users/register  → Inscription');
        console.log('  - POST   /api/users/login     → Connexion');
        console.log('  - GET    /api/metadata/all    → Toutes les métadonnées');
        console.log('  - GET    /api/oeuvres         → Liste des œuvres');
        console.log('  - GET    /api/evenements      → Liste des événements');
        console.log('  - POST   /api/upload/image/public → Upload public');
        console.log('\n💡 Consultez /api pour la liste complète des endpoints');
      }
      
      // Afficher les avertissements
      if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key-change-in-production') {
        logger.warn('\n⚠️  ATTENTION: JWT_SECRET n\'est pas configuré correctement !');
      }
      
      if (process.env.NODE_ENV === 'production' && !process.env.BASE_URL) {
        logger.warn('⚠️  ATTENTION: BASE_URL n\'est pas configuré pour la production !');
      }
    });
    
    // Gérer les erreurs du serveur
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      
      switch (error.code) {
        case 'EACCES':
          logger.error(`❌ Le port ${PORT} nécessite des privilèges élevés`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`❌ Le port ${PORT} est déjà utilisé`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
    
  } catch (error) {
    logger.error('❌ Erreur fatale lors du démarrage:', error);
    process.exit(1);
  }
}

// Vérifier la version de Node.js
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);

if (majorVersion < 14) {
  logger.error(`❌ Node.js version ${nodeVersion} détectée.`);
  logger.error('   Cette application nécessite Node.js 14.0.0 ou supérieur.');
  process.exit(1);
}

// Démarrer le serveur
startServer().catch(error => {
  logger.error('❌ Impossible de démarrer le serveur:', error);
  process.exit(1);
});