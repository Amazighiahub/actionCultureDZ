// test-dashboard.js - Script pour diagnostiquer le problème du dashboard

const DashboardController = require('../controllers/DashboardController');

// Mock des modèles pour le test
const mockModels = {
  sequelize: {
    authenticate: () => Promise.resolve(),
    fn: () => {},
    col: () => {},
    literal: () => {}
  },
  User: {
    count: () => Promise.resolve(0),
    findByPk: () => Promise.resolve(null),
    findAll: () => Promise.resolve([]),
    findAndCountAll: () => Promise.resolve({ rows: [], count: 0 })
  },
  Oeuvre: {
    count: () => Promise.resolve(0),
    findAll: () => Promise.resolve([]),
    findAndCountAll: () => Promise.resolve({ rows: [], count: 0 })
  },
  Evenement: {
    count: () => Promise.resolve(0),
    findAll: () => Promise.resolve([])
  },
  Lieu: {
    count: () => Promise.resolve(0),
    findAll: () => Promise.resolve([])
  },
  Commentaire: {
    count: () => Promise.resolve(0),
    findAll: () => Promise.resolve([])
  },
  Artisanat: {
    count: () => Promise.resolve(0)
  },
  Signalement: {
    count: () => Promise.resolve(0),
    findAll: () => Promise.resolve([]),
    findAndCountAll: () => Promise.resolve({ rows: [], count: 0 })
  },
  Vue: {
    count: () => Promise.resolve(0),
    findAll: () => Promise.resolve([])
  },
  Role: {},
  UserRole: {},
  AuditLog: {
    create: () => Promise.resolve(),
    findAndCountAll: () => Promise.resolve({ rows: [], count: 0 })
  }
};

console.log('🔍 Test du DashboardController...\n');

try {
  // Créer une instance du controller
  const controller = new DashboardController(mockModels);
  
  console.log('✅ Controller créé avec succès');
  
  // Lister toutes les méthodes
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(controller))
    .filter(method => method !== 'constructor' && typeof controller[method] === 'function');
  
  console.log('\n📋 Méthodes disponibles:');
  methods.forEach(method => {
    console.log(`  - ${method}: ${typeof controller[method]}`);
  });
  
  // Vérifier les méthodes critiques
  const criticalMethods = [
    'getOverview',
    'getDetailedStats',
    'getPatrimoineDashboard',
    'getPendingUsers',
    'getPendingOeuvres',
    'getReportedContent',
    'getModerationQueue',
    'performAdminAction',
    'getAdvancedAnalytics',
    'getAuditLogs',
    'getQRStats',
    'generateActivityReport'
  ];
  
  console.log('\n🔍 Vérification des méthodes critiques:');
  const missingMethods = [];
  
  criticalMethods.forEach(method => {
    if (typeof controller[method] === 'function') {
      console.log(`  ✅ ${method}`);
    } else {
      console.log(`  ❌ ${method} - MANQUANTE!`);
      missingMethods.push(method);
    }
  });
  
  if (missingMethods.length > 0) {
    console.log('\n❌ Méthodes manquantes:', missingMethods);
  } else {
    console.log('\n✅ Toutes les méthodes critiques sont présentes');
  }
  
  // Test de binding
  console.log('\n🔗 Test du binding des méthodes...');
  
  // Bind toutes les méthodes
  methods.forEach(method => {
    controller[method] = controller[method].bind(controller);
  });
  
  // Test d'appel d'une méthode
  console.log('\n📞 Test d\'appel de getOverview...');
  
  const mockReq = { user: { id_user: 1 } };
  const mockRes = {
    json: (data) => {
      console.log('  ✅ Réponse reçue:', JSON.stringify(data, null, 2));
    },
    status: (code) => {
      console.log('  📊 Status code:', code);
      return mockRes;
    }
  };
  
  // Attendre un peu pour l'initialisation de Redis
  setTimeout(async () => {
    try {
      await controller.getOverview(mockReq, mockRes);
    } catch (error) {
      console.error('  ❌ Erreur lors de l\'appel:', error.message);
    }
    
    // Nettoyer
    if (controller.cleanup) {
      await controller.cleanup();
    }
    
    console.log('\n✅ Test terminé');
    process.exit(0);
  }, 1000);
  
} catch (error) {
  console.error('❌ Erreur lors du test:', error);
  process.exit(1);
}