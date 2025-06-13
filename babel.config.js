/**
 * Babel configuration for Jest and build process
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          firefox: '78'
        },
        modules: 'auto'
      }
    ]
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    }
  }
};