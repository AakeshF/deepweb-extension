/**
 * Lint-staged configuration for pre-commit hooks
 */

module.exports = {
  '*.js': [
    'eslint --fix',
    'prettier --write',
    'jest --bail --findRelatedTests'
  ],
  '*.{json,html,css,md}': [
    'prettier --write'
  ],
  'manifest.json': [
    'node scripts/validate-manifest.js'
  ]
};