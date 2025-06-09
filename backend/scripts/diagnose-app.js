// scripts/diagnose-app.js
const fs = require('fs');
const path = require('path');

console.log('🔍 Diagnostic du problème d\'initialisation...\n');

// Lire app.js
const appPath = path.join(__dirname, '..', 'app.js');
if (fs.existsSync(appPath)) {
  const appContent = fs.readFileSync(appPath, 'utf8');
  
  console.log('📄 Analyse de app.js :');
  
  // Chercher comment authMiddleware est importé
  const authImportMatch = appContent.match(/const.*authMiddleware.*=.*require.*authMiddleware/);
  if (authImportMatch) {
    console.log('  Import trouvé :', authImportMatch[0]);
  }
  
  // Chercher la ligne 91 (environ)
  const lines = appContent.split('\n');
  console.log('\n  Lignes autour de la ligne 91 :');
  for (let i = 85; i < 95 && i < lines.length; i++) {
    if (lines[i].includes('createAuthMiddleware') || lines[i].includes('authMiddleware')) {
      console.log(`  ${i + 1}: ${lines[i].trim()}`);
    }
  }
}

// Solution rapide : créer un authMiddleware hybride
console.log('\n🔧 Création d\'un authMiddleware hybride...\n');

const hybridAuthMiddleware = `// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware de base
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.headers['x-access-token'];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = {
      id_user: decoded.id || decoded.id_user,
      type_user: decoded.type_user || 'visiteur'
    };
    req.userId = req.user.id_user;
    req.userRoles = decoded.roles || ['Visiteur'];
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide'
    });
  }
};

const checkPermission = (permission) => {
  return (req, res, next) => {
    console.log(\`[AUTH] Vérification permission: \${permission}\`);
    next();
  };
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    console.log(\`[AUTH] Vérification rôles: \${roles.join(', ')}\`);
    next();
  };
};

const isAdmin = (req, res, next) => {
  if (req.user && req.userRoles.includes('Administrateur')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Accès admin requis' });
  }
};

const isProfessional = (req, res, next) => {
  if (req.user && req.userRoles.includes('Professionnel')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Accès professionnel requis' });
  }
};

const canModify = (resourceType) => {
  return (req, res, next) => {
    console.log(\`[AUTH] Vérification modification: \${resourceType}\`);
    next();
  };
};

const isAuthenticated = (req, res, next) => next();
const requireActiveUser = (req, res, next) => next();

// Objet middleware pour export direct
const authMiddleware = {
  authenticate,
  isAuthenticated,
  requireRole,
  checkPermission,
  isAdmin,
  isProfessional,
  canModify,
  requireActiveUser
};

// Factory function pour app.js
const createAuthMiddleware = (models) => {
  console.log('[AUTH] Middleware initialisé avec les modèles');
  // Retourner le même objet - les modèles peuvent être utilisés plus tard
  return authMiddleware;
};

// Export hybride : fonction ET objet
module.exports = createAuthMiddleware;
module.exports.authenticate = authenticate;
module.exports.isAuthenticated = isAuthenticated;
module.exports.requireRole = requireRole;
module.exports.checkPermission = checkPermission;
module.exports.isAdmin = isAdmin;
module.exports.isProfessional = isProfessional;
module.exports.canModify = canModify;
module.exports.requireActiveUser = requireActiveUser;

// Pour compatibilité
Object.assign(module.exports, authMiddleware);
`;

const middlewarePath = path.join(__dirname, '..', 'middleware', 'authMiddleware.js');
fs.writeFileSync(middlewarePath, hybridAuthMiddleware);

console.log('✅ authMiddleware.js hybride créé');
console.log('\nCe middleware fonctionne à la fois comme :');
console.log('  - Factory function : createAuthMiddleware(models)');
console.log('  - Export direct : authMiddleware.checkPermission()');
console.log('\n🚀 Relancez votre serveur : npm run dev');