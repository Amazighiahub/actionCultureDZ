module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["./tests/setup.js"],
  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.spec.js"
  ],
  collectCoverageFrom: [
    "controllers/**/*.js",
    "services/**/*.js",
    "repositories/**/*.js",
    "middlewares/**/*.js",
    "!**/node_modules/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  testTimeout: 30000,
  modulePathIgnorePatterns: ["<rootDir>/node_modules/"]
};
