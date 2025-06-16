const { RedisMemoryServer } = require('redis-memory-server');
const redis = require('redis');

async function startRedisServer() {
  console.log('🚀 Démarrage du serveur Redis en mémoire...');
  
  try {
    // Créer une instance de Redis en mémoire
    const redisServer = new RedisMemoryServer({
      instance: {
        port: 6379, // Port par défaut
        ip: '127.0.0.1'
      }
    });

    // Démarrer le serveur
    const host = await redisServer.getHost();
    const port = await redisServer.getPort();
    
    console.log(`✅ Redis démarré sur ${host}:${port}`);
    
    // Tester la connexion
    const client = redis.createClient({
      socket: { host, port }
    });
    
    await client.connect();
    await client.ping();
    console.log('✅ Test de connexion réussi');
    await client.quit();
    
    // Garder le serveur actif
    console.log('\n📌 Redis est prêt. Appuyez sur Ctrl+C pour arrêter.\n');
    
    // Gestion de l'arrêt propre
    process.on('SIGINT', async () => {
      console.log('\n🛑 Arrêt du serveur Redis...');
      await redisServer.stop();
      console.log('✅ Redis arrêté');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage de Redis:', error);
    process.exit(1);
  }
}

// Démarrer le serveur
startRedisServer();