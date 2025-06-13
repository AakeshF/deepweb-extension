# DeepWeb Firefox Extension - Development Guide

## 🛠️ Development Infrastructure

This document provides comprehensive information about the development infrastructure set up for the DeepWeb Firefox extension.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Build Process](#build-process)
- [CI/CD Pipeline](#cicd-pipeline)
- [Development Workflow](#development-workflow)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- Firefox Developer Edition (recommended)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/deepweb-extension.git
cd deepweb-extension

# Install dependencies
npm install

# Set up git hooks
npm run prepare
```

### Development Setup

1. **Build the extension:**
   ```bash
   npm run build:dev
   ```

2. **Start Firefox with the extension:**
   ```bash
   npm run start:firefox
   ```

3. **Watch for changes:**
   ```bash
   npm run watch
   ```

## 📁 Project Structure

```
deepweb-extension/
├── src/                    # Source code (to be migrated)
│   ├── background/        # Background script modules
│   ├── content/          # Content script modules
│   ├── popup/            # Popup UI modules
│   ├── utils/            # Shared utilities
│   ├── api/              # API integration
│   └── components/       # Reusable components
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   ├── e2e/              # End-to-end tests
│   ├── fixtures/         # Test fixtures
│   └── utils/            # Test utilities
├── scripts/              # Build and utility scripts
├── dist/                 # Built extension (gitignored)
├── artifacts/            # Packaged extensions (gitignored)
└── docs/                 # Generated documentation (gitignored)
```

## 🧪 Testing

### Test Framework

We use **Jest** for unit testing and **Puppeteer** with Firefox for E2E testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Structure

#### Unit Tests
- Located in `tests/unit/`
- Mock browser APIs using `jest-webextension-mock`
- Test individual functions and modules
- Coverage threshold: 70%

#### E2E Tests
- Located in `tests/e2e/`
- Test full extension functionality in Firefox
- Use Puppeteer for browser automation
- Run in headless mode in CI

### Writing Tests

Example unit test:
```javascript
const { createMockBrowser } = require('../utils/mock-browser');

describe('MyModule', () => {
  let browser;
  
  beforeEach(() => {
    browser = createMockBrowser();
    global.browser = browser;
  });
  
  test('should do something', () => {
    // Your test here
  });
});
```

## 🔍 Code Quality

### ESLint

We use ESLint with Firefox extension-specific rules:

```bash
# Lint all files
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

Configuration includes:
- Mozilla's recommended rules for Firefox extensions
- Security-focused rules
- Consistent code style enforcement

### Prettier

Code formatting is handled by Prettier:

```bash
# Check formatting
npm run format:check

# Format all files
npm run format
```

### JSDoc

Generate documentation:
```bash
npm run docs
```

### Pre-commit Hooks

Husky and lint-staged ensure code quality before commits:
- Runs ESLint on staged files
- Formats code with Prettier
- Runs related tests
- Validates manifest.json

## 🏗️ Build Process

### Webpack Configuration

The build process uses Webpack to:
- Bundle modules
- Copy static assets
- Generate source maps (dev only)
- Optimize for production

### Build Commands

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Watch mode
npm run watch
```

### Packaging

Create a `.xpi` file for distribution:
```bash
npm run package
```

### Validation

Validate the extension:
```bash
npm run validate
```

## 🚢 CI/CD Pipeline

### GitHub Actions Workflows

#### Main CI Pipeline (`ci.yml`)
Runs on every push and PR:

1. **Lint** - Code quality checks
2. **Test** - Unit tests with coverage
3. **Build** - Extension compilation
4. **Security** - Vulnerability scanning
5. **E2E** - Full functionality tests
6. **Release** - Automated releases (main branch only)

#### Security Scanning (`codeql.yml`)
- Runs CodeQL analysis
- Scheduled weekly scans
- Security vulnerability detection

### Pipeline Features

- ✅ Multi-Firefox version testing
- ✅ Automated dependency audits
- ✅ Code coverage reporting
- ✅ Build artifact storage
- ✅ Automated releases
- ✅ Security scanning

## 💻 Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and test
npm run watch
npm test

# Commit changes (pre-commit hooks run automatically)
git add .
git commit -m "feat: add new feature"
```

### 2. Testing

```bash
# Run unit tests
npm test

# Run E2E tests locally
HEADLESS=false npm run test:e2e

# Check coverage
npm run test:coverage
```

### 3. Code Quality

```bash
# Lint and format
npm run lint:fix
npm run format

# Validate manifest
node scripts/validate-manifest.js
```

### 4. Building

```bash
# Build for testing
npm run build:dev

# Test in Firefox
npm run start:firefox

# Production build
npm run build
```

### 5. Pull Request

1. Push feature branch
2. CI pipeline runs automatically
3. Review test results and coverage
4. Address any issues
5. Request code review

## 🔧 Configuration Files

### `.eslintrc.js`
- ESLint rules for Firefox extensions
- Security-focused linting
- Jest plugin for tests

### `.prettierrc.js`
- Consistent code formatting
- 100 character line width
- Single quotes, semicolons

### `jest.config.js`
- Unit test configuration
- Coverage thresholds
- Module mappings

### `webpack.config.js`
- Build configuration
- Entry points for each script
- Asset copying

### `.github/workflows/`
- CI/CD pipeline definitions
- Automated testing and deployment

## 📚 Additional Resources

### Firefox Extension Development
- [Firefox Extension Workshop](https://extensionworkshop.com/)
- [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V2 Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)

### Testing Resources
- [Jest Documentation](https://jestjs.io/)
- [Puppeteer Firefox](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions)
- [web-ext Documentation](https://github.com/mozilla/web-ext)

### Tools Used
- **Jest** - Testing framework
- **Puppeteer** - E2E testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Webpack** - Module bundling
- **web-ext** - Firefox extension tools
- **Husky** - Git hooks
- **GitHub Actions** - CI/CD

## 🐛 Troubleshooting

### Common Issues

1. **Tests failing locally but passing in CI**
   - Check Node.js version matches CI
   - Clear Jest cache: `npx jest --clearCache`
   - Ensure Firefox is installed

2. **Extension not loading in Firefox**
   - Run `npm run validate`
   - Check browser console for errors
   - Ensure manifest.json is valid

3. **Build failures**
   - Delete `node_modules` and reinstall
   - Clear webpack cache
   - Check for syntax errors

### Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run build:dev
```

## 🤝 Contributing

1. Follow the established code style
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass
5. Keep commits atomic and well-described

## 📄 License

See LICENSE file in the repository root.