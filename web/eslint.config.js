import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactPerf from 'eslint-plugin-react-perf'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import unusedImports from 'eslint-plugin-unused-imports'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', '*.min.js', '*.config.js']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    plugins: {
      'react-perf': reactPerf,
      prettier: prettier,
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@', './src'],
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', { 
        vars: 'all', 
        varsIgnorePattern: '^[A-Z_]', 
        args: 'after-used', 
        argsIgnorePattern: '^_' 
      }],
      'no-use-before-define': ['error', { variables: true, functions: true, classes: true }],
      'react/prop-types': 'off', // Using TypeScript instead of prop-types
      'react/react-in-jsx-scope': 'off', // React 17+ doesn't require React in scope
      'react/jsx-filename-extension': ['error', { extensions: ['.jsx', '.tsx'] }], // Enforce JSX files to have .jsx or .tsx extension
      'import/no-unresolved': ['error', {
        commonjs: true,
        caseSensitive: true,
        ignore: [
          '@playwright/test', // Playwright is a dev dependency
          '@testing-library/react', // Testing library is a dev dependency
          'msw', // MSW is a dev dependency
          'msw/node', // MSW node is a dev dependency
          '@/features/authentication', // Alias path not resolved by ESLint
          '@/lib/http.js', // Alias path not resolved by ESLint
          '@/shared/components/AppForm', // Alias path not resolved by ESLint
          '@/shared/services/stepUpService', // Alias path not resolved by ESLint
        ]
      }],
      'import/named': 'error',
    },
  },
  // Node.js environment for config files and test setup
  {
    files: ['playwright.config.js', 'test.setup.js', '**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // Test files with Vitest globals
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', 'tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      parserOptions: {
        project: null, // Disable TypeScript project for JSX test files
      },
    },
  },
])
