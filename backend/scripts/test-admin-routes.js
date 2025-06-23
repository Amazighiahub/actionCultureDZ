// test-admin-routes.js
// Exécutez ce fichier pour tester si vos routes s'importent correctement

const path = require('path');

console.log('🧪 Test d\'importation des routes admin...\n');

// Fonction pour tester l'import d'un module
function testRouteImport(routeName, routePath) {
  console.log(`📁 Test de ${routeName}...`);
  
  try {
    // Essayer d'importer le module
    const routeModule = require(routePath);
    
    // Vérifier que c'est une fonction
    if (typeof routeModule === 'function') {
      console.log(`✅ ${routeName} importé avec succès (function)`);
      
      // Essayer de l'initialiser avec un objet models vide
      try {
        const mockModels = {
          Evenement: {},
          Oeuvre: { rawAttributes: {} },
          Lieu: { rawAttributes: {} },
          Service: { rawAttributes: {} },
          Artisanat: { rawAttributes: {} },
          User: {},
          sequelize: { fn: () => {}, col: () => {}, literal: () => {} }
        };
        
        const router = routeModule(mockModels);
        
        if (router && router.stack) {
          console.log(`✅ ${routeName} initialisé avec succès`);
          console.log(`   Routes définies: ${router.stack.length}`);
        } else {
          console.log(`⚠️ ${routeName} n'a pas retourné un router Express valide`);
        }
      } catch (initError) {
        console.log(`❌ Erreur lors de l'initialisation de ${routeName}:`, initError.message);
      }
    } else {
      console.log(`❌ ${routeName} n'est pas une fonction (type: ${typeof routeModule})`);
    }
  } catch (importError) {
    console.log(`❌ Impossible d'importer ${routeName}:`, importError.message);
  }
  
  console.log('');
}

// Ajustez les chemins selon votre structure
const routesToTest = [
  { name: 'adminEvenementsRoutes', path: './routes/admin/adminEvenementsRoutes' },
  { name: 'adminOeuvresRoutes', path: './routes/admin/adminOeuvresRoutes' },
  { name: 'adminPatrimoineRoutes', path: './routes/admin/adminPatrimoineRoutes' },
  { name: 'adminServicesRoutes', path: './routes/admin/adminServicesRoutes' }
];

// Tester chaque route
routesToTest.forEach(route => {
  testRouteImport(route.name, route.path);
});

console.log('\n🔍 Recherche de middleware bloquant...\n');

// Chercher des patterns communs de middleware bloquant
const fs = require('fs');

function searchForBlockingMiddleware(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      searchForBlockingMiddleware(filePath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Patterns à rechercher
      const patterns = [
        /Module non implémenté/i,
        /modulesImplementes.*\[.*evenements/i,
        /allowedModules.*\[.*evenements/i,
        /501.*json.*module.*développement/i
      ];
      
      patterns.forEach((pattern, index) => {
        if (pattern.test(content)) {
          console.log(`⚠️ Pattern trouvé dans ${filePath}:`);
          const lines = content.split('\n');
          lines.forEach((line, lineIndex) => {
            if (pattern.test(line)) {
              console.log(`   Ligne ${lineIndex + 1}: ${line.trim()}`);
            }
          });
        }
      });
    }
  });
}

// Rechercher dans le répertoire courant
console.log('Recherche de middleware bloquant dans les fichiers...\n');
try {
  searchForBlockingMiddleware('.');
} catch (err) {
  console.log('Erreur lors de la recherche:', err.message);
}

console.log('\n✅ Test terminé');
console.log('\nPour corriger le problème :');
console.log('1. Cherchez "Module non implémenté" dans tous vos fichiers');
console.log('2. Cherchez "modulesImplementes" ou "allowedModules"');
console.log('3. Assurez-vous que "oeuvres" et "patrimoine" sont dans la liste des modules autorisés');
console.log('4. Ou commentez/supprimez le middleware de vérification');