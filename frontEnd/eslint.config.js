import importPlugin from 'eslint-plugin-import';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    plugins: {
      import: importPlugin,
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
      // autres règles...
    },
  },
];