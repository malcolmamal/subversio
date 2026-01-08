import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'warn',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out-tsc/**',
      '**/build/**',
      '**/.angular/**',
      '**/example/**',
      '**/.git/**',
    ],
  },
);
