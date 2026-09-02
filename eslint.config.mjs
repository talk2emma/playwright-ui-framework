import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'reports/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      '**/*-snapshots/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/require-await': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    files: ['tests/**/*.ts', 'src/fixtures/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      /*
       * Conditional skips are allowed. `test.skip(condition, reason)` is how a
       * suite says "this cannot run right now, and here is why" — a persona
       * with only one page of history, a browser without a feature, an
       * environment without credentials. An *unconditional* skip is still
       * flagged, because that is a disabled test pretending to be a passing
       * one.
       */
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
      'playwright/expect-expect': 'off',
    },
  },
  {
    files: ['src/reporters/**/*.ts', 'scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    // The flat config and the docs generator are not part of the TS program,
    // so type-aware rules cannot run against them.
    files: ['**/*.mjs', '**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Node scripts: console output is their interface, and they are plain JS.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  prettier,
);
