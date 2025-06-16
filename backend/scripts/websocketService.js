// services/websocketService.js - Service WebSocket pour notifications temps réel
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

class WebSocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> [socketIds]
  }

  /**
   * Initialiser Socket.IO avec le serveur HTTP
   */
  initialize(server, options = {}) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling'],
      ...options
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('✅ Service WebSocket initialisé');
  }

  /**
   * Middleware d'authentification Socket.IO
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Token manquant'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Ajouter les infos utilisateur au socket
        socket.userId = decoded.id_user || decoded.id;
        socket.userEmail = decoded.email;
        
        next();
      } catch (err) {
        console.error('❌ Erreur auth WebSocket:', err.message);
        next(new Error('Authentification échouée'));
      }
    });
  }

  /**
   * Gestionnaires d'événements
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Nouvelle connexion WebSocket - User: ${socket.userId}`);
      
      // Ajouter le socket à la liste de l'utilisateur
      this.addUserSocket(socket.userId, socket.id);
      
      // Joindre la room de l'utilisateur
      socket.join(`user_${socket.userId}`);
      
      // Envoyer un message de bienvenue
      socket.emit('connected', {
        message: 'Connexion WebSocket établie',
        userId: socket.userId
      });

      // Gérer les événements personnalisés
      this.handleSocketEvents(socket);
      
      // Gérer la déconnexion
      socket.on('disconnect', () => {
        console.log(`🔌 Déconnexion WebSocket - User: ${socket.userId}`);
        this.removeUserSocket(socket.userId, socket.id);
      });

      // Gérer les erreurs
      socket.on('error', (error) => {
        console.error(`❌ Erreur WebSocket - User: ${socket.userId}:`, error);
      });
    });
  }

  /**
   * Gérer les événements du socket
   */
  handleSocketEvents(socket) {
    // Marquer une notification comme lue
    socket.on('notification:read', async (data) => {
      try {
        const { notificationId } = data;
        
        // Émettre à tous les clients de l'utilisateur
        this.io.to(`user_${socket.userId}`).emit('notification:updated', {
          id: notificationId,
          lu: true
        });
        
        socket.emit('notification:read:success', { notificationId });
      } catch (error) {
        socket.emit('notification:read:error', { 
          error: error.message 
        });
      }
    });

    // Marquer toutes les notifications comme lues
    socket.on('notifications:readAll', async () => {
      try {
        this.io.to(`user_${socket.userId}`).emit('notifications:allRead');
        socket.emit('notifications:readAll:success');
      } catch (error) {
        socket.emit('notifications:readAll:error', { 
          error: error.message 
        });
      }
    });

    // Rejoindre des rooms spécifiques (événements, œuvres, etc.)
    socket.on('join:room', (data) => {
      const { type, id } = data;
      const roomName = `${type}_${id}`;
      
      socket.join(roomName);
      socket.emit('joined:room', { room: roomName });
    });

    // Quitter une room
    socket.on('leave:room', (data) => {
      const { type, id } = data;
      const roomName = `${type}_${id}`;
      
      socket.leave(roomName);
      socket.emit('left:room', { room: roomName });
    });

    // Ping pour maintenir la connexion
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Gestion des sockets utilisateur
   */
  addUserSocket(userId, socketId) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
  }

  removeUserSocket(userId, socketId) {
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  /**
   * Obtenir le nombre d'utilisateurs connectés
   */
  getOnlineUsersCount() {
    return this.userSockets.size;
  }

  /**
   * Obtenir la liste des utilisateurs connectés
   */
  getOnlineUsers() {
    return Array.from(this.userSockets.keys());
  }

  // ========================================================================
  // MÉTHODES D'ÉMISSION
  // ========================================================================

  /**
   * Envoyer une notification à un utilisateur
   */
  sendNotification(userId, notification) {
    this.io.to(`user_${userId}`).emit('notification:new', notification);
    
    // Log pour debug
    console.log(`📤 Notification envoyée à user_${userId}:`, notification.titre);
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   */
  sendNotificationToMany(userIds, notification) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }

  /**
   * Broadcast à tous les utilisateurs connectés
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Envoyer un événement à une room spécifique
   */
  sendToRoom(roomName, event, data) {
    this.io.to(roomName).emit(event, data);
  }

  // ========================================================================
  // NOTIFICATIONS SPÉCIFIQUES
  // ========================================================================

  /**
   * Notifier un nouveau commentaire
   */
  notifyNewComment(oeuvreId, comment) {
    this.sendToRoom(`oeuvre_${oeuvreId}`, 'comment:new', {
      oeuvreId,
      comment
    });
  }

  /**
   * Notifier une modification d'événement
   */
  notifyEventUpdate(eventId, update) {
    this.sendToRoom(`event_${eventId}`, 'event:updated', {
      eventId,
      update
    });
  }

  /**
   * Notifier l'annulation d'un événement
   */
  notifyEventCancellation(eventId, reason) {
    this.sendToRoom(`event_${eventId}`, 'event:cancelled', {
      eventId,
      reason
    });
  }

  /**
   * Notifier un nouveau favori
   */
  notifyNewFavorite(userId, favorite) {
    this.sendNotification(userId, {
      type: 'favorite:new',
      data: favorite
    });
  }

  /**
   * Notifier la validation d'un compte professionnel
   */
  notifyProfessionalValidation(userId, isValidated, reason) {
    this.sendNotification(userId, {
      type: 'professional:validation',
      data: {
        validated: isValidated,
        reason
      }
    });
  }

  // ========================================================================
  // STATISTIQUES ET MONITORING
  // ========================================================================

  /**
   * Obtenir les statistiques de connexion
   */
  getStats() {
    const stats = {
      onlineUsers: this.getOnlineUsersCount(),
      totalSockets: this.io.sockets.sockets.size,
      rooms: []
    };

    // Lister toutes les rooms
    const rooms = this.io.sockets.adapter.rooms;
    rooms.forEach((sockets, roomName) => {
      if (!roomName.startsWith('user_')) {
        stats.rooms.push({
          name: roomName,
          members: sockets.size
        });
      }
    });

    return stats;
  }

  /**
   * Déconnecter un utilisateur (utile pour la sécurité)
   */
  disconnectUser(userId, reason = 'Déconnexion forcée') {
    const sockets = this.userSockets.get(userId);
    
    if (sockets) {
      sockets.forEach(socketId => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force:disconnect', { reason });
          socket.disconnect(true);
        }
      });
    }
  }

  /**
   * Envoyer un message système à tous
   */
  sendSystemMessage(message, type = 'info') {
    this.broadcast('system:message', {
      message,
      type,
      timestamp: new Date()
    });
  }
}

// Singleton
const websocketService = new WebSocketService();

module.exports = websocketService;