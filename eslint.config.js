import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '.wrangler'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    settings: { react: { version: '18.3' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.strict.rules,
      'react/no-danger': 'error',
      // Labels often wrap their control with text in nested elements (radio cards).
      'jsx-a11y/label-has-associated-control': [
        'error',
        { assert: 'either', depth: 3, controlComponents: ['OwnerSelect'] },
      ],
      // APG: tab panels and scrollable regions may be focusable.
      'jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['tabpanel', 'region'] }],
      'react/jsx-no-target-blank': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: "MemberExpression[property.name='innerHTML']", message: 'Use text rendering.' },
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports (except lazy routes).',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    // CLAUDE.md §5: files ≤ ~200 lines, functions ≤ ~40 lines. Enforced, not just documented.
    files: ['src/**/*.{ts,tsx}', 'functions/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
    },
  },
  {
    // Components and hooks are mostly declarative markup / wiring; they get a looser line budget.
    files: ['src/**/*.tsx', 'src/**/use*.ts'],
    rules: {
      'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Tests read best as one describe block per unit; demo data is a fixture, not logic.
    files: ['**/*.test.{ts,tsx}', 'tests/**', 'src/data/**'],
    rules: { 'max-lines': 'off', 'max-lines-per-function': 'off', complexity: 'off' },
  },
  {
    // Route screens are lazy-loaded and config files require default exports.
    files: ['src/features/**/*Screen.tsx', '*.config.{ts,js}', 'eslint.config.js'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    files: ['*.config.{ts,js}', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
);
