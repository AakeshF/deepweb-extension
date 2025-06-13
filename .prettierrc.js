/**
 * Prettier configuration for consistent code formatting
 */

module.exports = {
  // Line length
  printWidth: 100,
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Semicolons
  semi: true,
  
  // Quotes
  singleQuote: true,
  quoteProps: 'as-needed',
  
  // Trailing commas
  trailingComma: 'none',
  
  // Brackets
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'always',
  
  // Line endings
  endOfLine: 'lf',
  
  // HTML whitespace sensitivity
  htmlWhitespaceSensitivity: 'css',
  
  // Markdown
  proseWrap: 'preserve',
  
  // Embedded language formatting
  embeddedLanguageFormatting: 'auto',
  
  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        proseWrap: 'always'
      }
    }
  ]
};