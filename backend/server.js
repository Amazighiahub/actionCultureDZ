// server.js - Point d'entrée principal de l'application
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
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
    
    // Attacher Socket.IO au serveur HTTP
    const io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : undefined),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    app.set('io', io);

    // Authentification Socket.IO via JWT cookie
    const cookie = require('cookie');
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is required. Set it in your .env file.');
    }

    io.use((socket, next) => {
      try {
        // Priorité : cookie httpOnly > auth handshake (compatibilité frontend)
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies.token || cookies.access_token || socket.handshake.auth?.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        socket.userId = decoded.id_user || decoded.id;
        next();
      } catch (err) {
        next(new Error('Authentication failed'));
      }
    });

    // Rooms autorisées (préfixes whitelist) et limite par socket
    const ALLOWED_ROOM_PREFIXES = ['user_', 'evenement_', 'oeuvre_', 'notifications'];
    const MAX_ROOMS_PER_SOCKET = 10;

    io.on('connection', (socket) => {
      if (socket.userId) {
        socket.join(`user_${socket.userId}`);
      }

      socket.on('join_room', (room) => {
        // Validation du type
        if (typeof room !== 'string' || room.length > 100) return;

        // Whitelist de préfixes autorisés
        const isAllowed = ALLOWED_ROOM_PREFIXES.some(prefix => room.startsWith(prefix));
        if (!isAllowed) return;

        // Empêcher de rejoindre la room d'un autre utilisateur
        if (room.startsWith('user_') && room !== `user_${socket.userId}`) {
          return;
        }

        // Limiter le nombre de rooms par socket (éviter l'abus mémoire)
        if (socket.rooms.size >= MAX_ROOMS_PER_SOCKET) {
          return;
        }

        socket.join(room);
      });

      socket.on('leave_room', (room) => {
        if (typeof room === 'string') socket.leave(room);
      });

      socket.on('disconnect', () => {
        logger.debug(`Socket déconnecté: ${socket.id} (user: ${socket.userId || 'anonymous'})`);
      });
    });
    
    // Gérer la fermeture gracieuse
    let isShuttingDown = false;
    const gracefulShutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;

      logger.info(`${signal} reçu, arrêt gracieux du serveur...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('Serveur HTTP fermé');

        try {
          // Close Socket.IO connections
          io.close();
          logger.info('Socket.IO fermé');

          // Close database
          await appInstance.closeDatabase();
          logger.info('Base de données fermée');

          logger.info('Application arrêtée proprement');
          process.exit(0);
        } catch (error) {
          logger.error('Erreur lors de l\'arrêt:', error);
          process.exit(1);
        }
      });

      // Force exit after 30 seconds
      const forceTimeout = setTimeout(() => {
        logger.error('Arrêt forcé après timeout de 30s');
        process.exit(1);
      }, 30000);
      if (forceTimeout.unref) forceTimeout.unref();
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
      logger.info(`👤 Utilisateur DB: ***`);
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

if (majorVersion < 18) {
  logger.error(`❌ Node.js version ${nodeVersion} détectée.`);
  logger.error('   Cette application nécessite Node.js 18.0.0 ou supérieur.');
  process.exit(1);
}

// Démarrer le serveur
startServer().catch(error => {
  logger.error('❌ Impossible de démarrer le serveur:', error);
  process.exit(1);
});