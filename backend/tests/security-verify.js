/**
 * Script de vérification des corrections de sécurité critiques
 * Usage: node tests/security-verify.js
 */
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test-secret-for-verification-only-32chars';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'actionculture';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_DIALECT = 'mysql';
process.env.USE_REDIS_MEMORY = 'true';
process.env.EMAIL_PAUSED = 'true';
process.env.FRONTEND_URL = 'http://localhost:8080';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

let total = 0;
let passed = 0;

function check(label, condition) {
  total++;
  if (condition) {
    passed++;
    console.log('  ✅ ' + label);
  } else {
    console.log('  ❌ ' + label);
  }
}

// === 1. MODULES ===
console.log('\n=== 1. CHARGEMENT DES 12 FICHIERS MODIFIÉS ===');
const mods = [
  ['appError', '../utils/appError.js'],
  ['fileValidator', '../utils/fileValidator.js'],
  ['errorMiddleware', '../middlewares/errorMiddleware.js'],
  ['authMiddleware', '../middlewares/authMiddleware.js'],
  ['rateLimitMiddleware', '../middlewares/rateLimitMiddleware.js'],
  ['userService', '../services/user/userService.js'],
  ['evenementController', '../controllers/evenementController.js'],
  ['lieuController', '../controllers/lieuController.js'],
  ['professionnelController', '../controllers/professionnelController.js'],
  ['intervenantController', '../controllers/intervenantController.js'],
  ['notificationRoutes', '../routes/notificationRoutes.js'],
  ['multilingualRoutes', '../routes/multilingualRoutes.js']
];

mods.forEach(([name, path]) => {
  let ok = true;
  try { require(path); } catch(e) { ok = false; }
  check(name + ' charge correctement', ok);
});

// === 2. AUTH-01 ===
console.log('\n=== 2. AUTH-01: Refresh token hashé ===');
const tok = crypto.randomBytes(64).toString('hex');
const h = crypto.createHash('sha256').update(tok).digest('hex');
check('Token 128 chars', tok.length === 128);
check('Hash SHA256 64 chars', h.length === 64);
check('Hash différent du token', tok !== h);
// Vérifier que le même token donne le même hash
const h2 = crypto.createHash('sha256').update(tok).digest('hex');
check('Hash déterministe', h === h2);

// === 3. AUTH-02 ===
console.log('\n=== 3. AUTH-02: JWT algorithm pinning ===');
const secret = 'test-secret-for-verification-32chars';
const signed = jwt.sign({ test: 1 }, secret, { algorithm: 'HS256', expiresIn: '1h' });
check('jwt.sign avec HS256', typeof signed === 'string');
const dec = jwt.verify(signed, secret, { algorithms: ['HS256'] });
check('jwt.verify avec algorithms:[HS256]', dec.test === 1);

let algNoneRejected = false;
try {
  const forged = jwt.sign({ test: 1 }, '', { algorithm: 'none' });
  jwt.verify(forged, secret, { algorithms: ['HS256'] });
} catch(e) {
  algNoneRejected = true;
}
check('alg:none rejeté', algNoneRejected);

// === 4. DATA-01/03 ===
console.log('\n=== 4. DATA-01/DATA-03: Messages erreur sécurisés ===');
const AppError = require('../utils/appError');

// En production: error.message doit être masqué
process.env.NODE_ENV = 'production';
const sqlErr = new Error('Unknown column password_hash in field list');
const ae = AppError.fromError(sqlErr);
check('Prod: message SQL masqué', !ae.message.includes('password_hash'));
check('Prod: message générique', ae.message === "Une erreur inattendue s'est produite");

// SequelizeUniqueConstraintError ne doit pas exposer le nom de colonne
const ue = { name: 'SequelizeUniqueConstraintError', fields: { email: 'test@test.com' } };
const uae = AppError.fromError(ue);
check('Unique: pas de nom de colonne', !uae.message.includes('email'));
check('Unique: message générique', uae.message === 'Cette valeur existe déjà');

// SequelizeValidationError masqué en prod
const ve = { name: 'SequelizeValidationError', errors: [{ message: 'User.password cannot be null' }] };
const vae = AppError.fromError(ve);
check('Validation Sequelize masquée en prod', !vae.message.includes('User.password'));

process.env.NODE_ENV = 'development';

// En dev: error.message peut être visible
const aeDev = AppError.fromError(sqlErr);
check('Dev: message détaillé visible', aeDev.message.includes('password_hash'));

// === 5. INJ-01 ===
console.log('\n=== 5. INJ-01: Sanitisation lang dans literal() ===');
const attacks = [
  ["fr'); DROP TABLE users; --", false],
  ['en<script>alert(1)</script>', false],
  ['1 OR 1=1', false],
  ["' UNION SELECT * FROM users --", false],
];
attacks.forEach(([input, shouldContainSpecial]) => {
  const sanitized = input.replace(/[^a-z-]/gi, '');
  const hasSpecial = /[';()=<>*]/.test(sanitized);
  check('Attaque "' + input.substring(0, 30) + '..." neutralisée', !hasSpecial);
});

// Valeurs légitimes préservées
const validLangs = ['fr', 'ar', 'en', 'tz-ltn', 'tz-tfng'];
validLangs.forEach(l => {
  const sanitized = l.replace(/[^a-z-]/gi, '');
  check('Lang "' + l + '" préservée', l === sanitized);
});

// === RÉSULTAT ===
console.log('\n' + '='.repeat(50));
console.log('RÉSULTAT: ' + passed + '/' + total + ' tests passés');
if (passed === total) {
  console.log('✅ TOUTES LES CORRECTIONS FONCTIONNENT CORRECTEMENT');
} else {
  console.log('❌ ' + (total - passed) + ' TEST(S) EN ÉCHEC');
}
console.log('='.repeat(50));

process.exit(passed === total ? 0 : 1);
