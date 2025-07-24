# DeepWeb Firefox Extension 🦊

A powerful AI assistant for Firefox that enhances your web browsing experience with DeepSeek AI integration.

## ✨ Features

- **Intelligent Web Assistant**: Get AI-powered insights about any webpage
- **Smart Context Extraction**: Advanced algorithms analyze page structure for optimal AI understanding
- **Context-Aware Responses**: AI understands the content you're viewing with intelligent relevance scoring
- **Multiple AI Models**: Choose between DeepSeek Chat and DeepSeek Reasoner
- **Privacy-Focused**: Your data stays local, only queries are sent to AI
- **Firefox-Optimized**: Built specifically for Firefox with Manifest V2

## 🚀 Quick Start

### Installation

1. **From Firefox Add-ons Store** (Recommended)
   - Visit [Firefox Add-ons](#) (link pending)
   - Click "Add to Firefox"

2. **Manual Installation** (Development)
   ```bash
   git clone https://github.com/AakeshF/deepweb-extension.git
   cd deepweb-extension
   npm install
   npm run build
   npm run start:firefox
   ```

### Setup

1. Click the DeepWeb icon in your toolbar
2. Enter your DeepSeek API key (get one at [DeepSeek](https://platform.deepseek.com/))
3. Start chatting with AI about any webpage!

## 🎯 Usage

### Basic Usage

1. **Toggle Chat**: Click the extension icon or press `Ctrl+Shift+Y`
2. **Ask Questions**: Type your question about the current page
3. **Select Text**: Right-click selected text and choose "Ask DeepWeb AI"

### Features

- **Model Selection**: Choose between different AI models
- **Context Integration**: AI automatically understands page content
- **Minimize/Maximize**: Keep the chat open while browsing
- **Keyboard Shortcuts**: Quick access with customizable shortcuts

## 🛠️ Development

### Prerequisites

- Node.js >= 16.0.0
- Firefox Developer Edition
- DeepSeek API key

### Development Setup

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run watch

# Run tests
npm test

# Start Firefox with extension
npm run start:firefox
```

### Project Structure

```
deepweb-extension/
├── src/              # Source code
├── tests/            # Test files
├── manifest.json     # Extension manifest
├── icons/            # Extension icons
└── docs/             # Documentation
```

For detailed development instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Lint code
npm run lint
```

## 🔒 Security & Privacy

- **Local Processing**: Page content is processed locally
- **Secure API Communication**: All API calls use HTTPS
- **No Data Storage**: No browsing data is permanently stored
- **Minimal Permissions**: Only essential permissions requested
- **Open Source**: Full code transparency

See [SECURITY_PATCHES.md](SECURITY_PATCHES.md) for security details.

## 📋 Requirements

- Firefox 78.0 or higher
- DeepSeek API key
- Active internet connection

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

See [CONTRIBUTING.md](#) for detailed guidelines.

## 📚 Documentation

- [Development Guide](DEVELOPMENT.md) - Complete development setup
- [API Documentation](docs/api.md) - Extension API reference
- [Security Guide](SECURITY_PATCHES.md) - Security best practices
- [Firefox README](README-FIREFOX.md) - Firefox-specific information

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**
   - Ensure you're using Firefox (not Chrome)
   - Check manifest.json is valid
   - Verify all files are present

2. **API errors**
   - Check your API key is valid
   - Ensure you have API credits
   - Verify internet connection

3. **Chat not appearing**
   - Refresh the page
   - Check browser console for errors
   - Disable conflicting extensions

### Getting Help

- Check [Issues](https://github.com/AakeshF/deepweb-extension/issues)
- Read the [FAQ](#)
- Contact support

## 🎉 Features Roadmap

- [ ] Conversation history
- [ ] Custom prompt templates
- [ ] Theme customization
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Export conversations

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- DeepSeek for providing the AI API
- Firefox Extension Workshop for documentation
- Open source community for tools and libraries

---

**Note**: This extension requires a DeepSeek API key. Get yours at [platform.deepseek.com](https://platform.deepseek.com/)

Made with ❤️ for the Firefox community