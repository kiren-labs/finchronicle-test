import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,

  // scripts/ — runs in Node.js
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // src/app.js — auto-generated from browser source, uses browser globals
  // Also uses `global` as a Node.js shim for localStorage in test environments
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // E2E tests — Node.js host process + browser globals used inside page.evaluate()
  {
    files: ['tests/e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },

  // Unit tests + setup — Vitest with happy-dom (provides browser globals)
  {
    files: ['tests/unit/**/*.js', 'tests/setup.js'],
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
    },
  },

  // Unused vars prefixed with _ are intentionally unused
  {
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
]

