/**
 * Configuration PM2 pour Action Culture Backend
 * Usage: pm2 start ecosystem.config.js --env production
 */

module.exports = {
  apps: [{
    name: 'actionculture-api',
    script: 'server.js',

    // Mode cluster pour utiliser tous les CPU
    instances: 'max',
    exec_mode: 'cluster',

    // Environnement production
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },

    // Environnement développement
    env_development: {
      NODE_ENV: 'development',
      PORT: 3001
    },

    // Logs
    error_file: './logs/pm2-err.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Redémarrage automatique
    max_memory_restart: '500M',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s',

    // Watch (désactivé en production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],

    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
