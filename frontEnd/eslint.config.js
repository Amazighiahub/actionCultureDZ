import importPlugin from 'eslint-plugin-import';
import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'scripts/**',
      'cypress/**',
    ],
  },
  {
    // Sans ce motif, ESLint 9 ignorait tous les fichiers .ts/.tsx (« File ignored ») :
    // le lint passait sans rien vérifier
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
      // Déclarés pour que les commentaires eslint-disable existants soient reconnus
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parser: tsParser,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      'import/no-unresolved': 'error',
      // Hooks appelés conditionnellement ou hors composant : vrais bogues
      'react-hooks/rules-of-hooks': 'error',
      // Dépendances d'effets incomplètes : signalées sans bloquer
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Simulations de composants dans vi.mock(...) : pas de vrais composants React
    files: ['src/tests/**', '**/__tests__/**', '**/*.test.{ts,tsx}'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
];
