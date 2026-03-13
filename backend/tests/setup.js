/**
 * Configuration des tests - Jest Setup
 */

// Timeout plus long pour les tests d integration
jest.setTimeout(30000);

// Variables d environnement pour les tests
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-for-testing-only";
process.env.DB_NAME = process.env.DB_NAME_TEST || "actionculture_test";

// Mock du logger pour eviter les logs pendant les tests
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logRequest: jest.fn(),
  logError: jest.fn(),
  logDb: jest.fn()
}));

// Helper pour nettoyer les mocks apres chaque test
afterEach(() => {
  jest.clearAllMocks();
});

// Helper global pour creer des utilisateurs de test
global.createTestUser = (overrides = {}) => ({
  id_user: 1,
  nom: "Test",
  prenom: "User",
  email: "test@example.com",
  type_user: "visiteur",
  statut: "actif",
  est_actif: true,
  ...overrides
});

// Helper pour creer une oeuvre de test
global.createTestOeuvre = (overrides = {}) => ({
  id_oeuvre: 1,
  titre: { fr: "Test Oeuvre", ar: "اختبار", en: "Test Work" },
  description: { fr: "Description test", ar: "وصف اختبار", en: "Test description" },
  id_type_oeuvre: 1,
  id_createur: 1,
  statut: "publie",
  ...overrides
});

// Helper pour creer un evenement de test
global.createTestEvenement = (overrides = {}) => ({
  id_evenement: 1,
  nom_evenement: { fr: "Test Event", ar: "حدث اختبار", en: "Test Event" },
  date_debut: new Date("2025-03-15"),
  date_fin: new Date("2025-03-17"),
  id_organisateur: 1,
  statut: "publie",
  ...overrides
});

// ============================================================================
// Helpers pour les tests d'intégration (connexion DB réelle)
// ============================================================================

let _testSequelize = null;
let _testModels = null;

/**
 * Initialise une connexion à la base de données de test et charge les modèles.
 * Crée les tables via sync({ force: true }) pour partir d'un état propre.
 */
const setupTestDatabase = async () => {
  require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
  const { createDatabaseConnection } = require("../config/database");
  const { loadModels, initializeAssociations } = require("../models/index-original");

  _testSequelize = createDatabaseConnection("test");
  await _testSequelize.authenticate();

  _testModels = loadModels(_testSequelize);
  initializeAssociations(_testModels);

  return { sequelize: _testSequelize, models: _testModels };
};

/**
 * Ferme proprement la connexion à la base de données de test.
 */
const teardownTestDatabase = async () => {
  if (_testSequelize) {
    await _testSequelize.close();
    _testSequelize = null;
    _testModels = null;
  }
};

module.exports = { setupTestDatabase, teardownTestDatabase };

