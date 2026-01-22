/**
 * Configuration des tests - Jest Setup
 */

// Timeout plus long pour les tests d integration
jest.setTimeout(30000);

// Variables d environnement pour les tests
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-for-testing-only";
process.env.DB_NAME = "actionculture_test";

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
  statut_validation: "valide",
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

