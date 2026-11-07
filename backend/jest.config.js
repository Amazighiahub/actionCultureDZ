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
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60
    }
  },
  verbose: true,
  testTimeout: 30000,
  modulePathIgnorePatterns: ["<rootDir>/node_modules/"],
  // sanitize-html 2.18 dépend de bibliothèques publiées seulement en modules ES : Node 22 les lit
  // directement, Jest non. Seules ces bibliothèques sont converties pour les tests.
  // (séparateurs / et \ : Linux et Windows)
  transform: {
    [String.raw`[/\\]node_modules[/\\](htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)[/\\].+\.js$`]: [
      "babel-jest", { configFile: false, babelrc: false, plugins: ["@babel/plugin-transform-export-namespace-from", "@babel/plugin-transform-modules-commonjs"] }
    ],
    // Règle par défaut de Jest, à garder : sans elle, jest.mock n'est plus remonté en tête des tests
    "\\.[jt]sx?$": "babel-jest"
  },
  transformIgnorePatterns: [String.raw`[/\\]node_modules[/\\](?!(htmlparser2|domhandler|domutils|dom-serializer|domelementtype|entities)[/\\])`]
};
