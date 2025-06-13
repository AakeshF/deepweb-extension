/**
 * ESLint configuration for Firefox WebExtension
 */

module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:mozilla/recommended',
    'plugin:jest/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  plugins: [
    'mozilla',
    'jest'
  ],
  globals: {
    browser: 'readonly',
    chrome: 'readonly'
  },
  rules: {
    // Best Practices
    'array-callback-return': 'error',
    'block-scoped-var': 'error',
    'consistent-return': 'error',
    'curly': ['error', 'all'],
    'default-case': 'error',
    'default-param-last': 'error',
    'dot-notation': 'error',
    'eqeqeq': ['error', 'always'],
    'guard-for-in': 'error',
    'no-alert': 'error',
    'no-caller': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-eval': 'error',
    'no-extend-native': 'error',
    'no-extra-bind': 'error',
    'no-floating-decimal': 'error',
    'no-implicit-coercion': 'error',
    'no-implied-eval': 'error',
    'no-invalid-this': 'error',
    'no-iterator': 'error',
    'no-labels': 'error',
    'no-lone-blocks': 'error',
    'no-loop-func': 'error',
    'no-multi-spaces': 'error',
    'no-multi-str': 'error',
    'no-new': 'error',
    'no-new-func': 'error',
    'no-new-wrappers': 'error',
    'no-param-reassign': 'error',
    'no-proto': 'error',
    'no-return-assign': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'no-void': 'error',
    'no-with': 'error',
    'prefer-promise-reject-errors': 'error',
    'radix': 'error',
    'require-await': 'error',
    'vars-on-top': 'error',
    'wrap-iife': ['error', 'inside'],
    'yoda': 'error',

    // Variables
    'no-shadow': 'error',
    'no-undef-init': 'error',
    'no-undefined': 'error',
    'no-use-before-define': ['error', { functions: false }],

    // Stylistic Issues
    'array-bracket-spacing': ['error', 'never'],
    'block-spacing': 'error',
    'brace-style': ['error', '1tbs'],
    'camelcase': 'error',
    'comma-dangle': ['error', 'never'],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'consistent-this': ['error', 'self'],
    'func-call-spacing': 'error',
    'indent': ['error', 2, { SwitchCase: 1 }],
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'linebreak-style': ['error', 'unix'],
    'max-len': ['error', { code: 100, ignoreUrls: true }],
    'new-cap': 'error',
    'new-parens': 'error',
    'no-array-constructor': 'error',
    'no-lonely-if': 'error',
    'no-mixed-operators': 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'no-nested-ternary': 'error',
    'no-new-object': 'error',
    'no-trailing-spaces': 'error',
    'no-unneeded-ternary': 'error',
    'no-whitespace-before-property': 'error',
    'object-curly-spacing': ['error', 'always'],
    'one-var': ['error', 'never'],
    'operator-linebreak': ['error', 'after'],
    'padded-blocks': ['error', 'never'],
    'quote-props': ['error', 'as-needed'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'semi-spacing': 'error',
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'spaced-comment': ['error', 'always'],

    // ES6
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-constructor': 'error',
    'no-useless-rename': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-destructuring': ['error', { array: false, object: true }],
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    'rest-spread-spacing': 'error',
    'template-curly-spacing': 'error',

    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',

    // Firefox Extension specific
    'mozilla/no-arbitrary-setTimeout': 'error',
    'mozilla/no-define-cc-etc': 'error',
    'mozilla/use-services': 'error'
  },
  overrides: [
    {
      files: ['*.test.js', '**/__tests__/**'],
      rules: {
        'no-undefined': 'off',
        'max-len': 'off'
      }
    }
  ]
};