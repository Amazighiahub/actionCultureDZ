// i18next-parser.config.cjs - Version CommonJS
module.exports = {
  // Les langues de votre projet
  locales: ['ar', 'fr', 'en', 'tz-ltn', 'tz-tfng'],
  
  // Fichiers à analyser
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  
  // Où sauvegarder les fichiers - DANS I18N/LOCALES
  output: 'i18n/locales/$LOCALE/$NAMESPACE.json',
  
  // Namespace par défaut
  defaultNamespace: 'translation',
  
  // Valeur par défaut pour les nouvelles clés
  defaultValue: function(locale, namespace, key) {
    switch(locale) {
      case 'ar':
        return '{{' + key + '}}';
      case 'fr':
        return '{{' + key + '}}';
      case 'en':
        return key; // En anglais, la clé peut servir de valeur temporaire
      case 'tz-ltn':
        return '{{' + key + '}}';
      case 'tz-tfng':
        return '⵿⵿' + key + '⵿⵿';
      default:
        return '{{' + key + '}}';
    }
  },
  
  // Options de configuration
  keepRemoved: false,
  keySeparator: '.',
  namespaceSeparator: ':',
  indentation: 2,
  sort: true,
  
  // Lexers pour TypeScript/JavaScript
  lexers: {
    js: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    ts: ['JavascriptLexer'],
    tsx: ['JsxLexer'],
    default: ['JavascriptLexer']
  },
  
  // Fonctions à rechercher dans le code
  func: {
    list: ['t', 'i18next.t', 'i18n.t'],
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  },
  
  // Support des composants Trans
  trans: {
    component: 'Trans',
    i18nKey: 'i18nKey',
    defaultsKey: 'defaults',
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallbackKey: function(ns, value) {
      return value;
    }
  },
  
  // Créer la structure si elle n'existe pas
  createOldCatalogs: true,
  
  // Options avancées avec le bon chemin
  resource: {
    loadPath: 'i18n/locales/{{lng}}/{{ns}}.json',
    savePath: 'i18n/locales/{{lng}}/{{ns}}.json',
    jsonIndent: 2,
    lineEnding: '\n'
  },
  
  // Pour debug
  verbose: false,
  failOnWarnings: false,
  customValueTemplate: null
};