# DeepWeb AI Assistant for Firefox 🤖

<div align="center">
  <img src="icons/DeepWeb_128x128.png" alt="DeepWeb Logo" width="128" height="128">
  
  [![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange?logo=firefox)](https://addons.mozilla.org/firefox/addon/deepweb)
  [![Version](https://img.shields.io/badge/version-1.0-blue)](https://github.com/deepweb/releases)
  [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
  [![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/deepweb/actions)
  
  **Your AI-powered companion for browsing the web**
  
  [Install](#-installation) • [Features](#-features) • [Documentation](docs/index.md) • [Support](#-support)
</div>

---

## 🎯 What is DeepWeb?

DeepWeb brings the power of AI directly into your browser. Chat with advanced AI models about any webpage you're viewing - no copying, no tab switching, just seamless intelligence at your fingertips.

### 🌟 Key Benefits

- **💬 Instant AI Chat** - Press Ctrl+Shift+Y on any webpage
- **🧠 Smart Context** - AI automatically understands what you're viewing  
- **🚀 Multiple AI Models** - Choose from GPT-4, Claude, DeepSeek, and more
- **🔒 Complete Privacy** - All data stays on your device
- **✨ Free to Use** - Open source and free forever

## 📸 Screenshots

<div align="center">
  <img src="docs/images/deepweb-demo.gif" alt="DeepWeb Demo" width="600">
  
  *Chat with AI about any webpage instantly*
</div>

## 🚀 Installation

### From Mozilla Add-ons (Recommended)
1. Visit [DeepWeb on Firefox Add-ons](https://addons.mozilla.org/firefox/addon/deepweb)
2. Click "Add to Firefox"
3. Follow the [Quickstart Guide](docs/tutorials/quickstart.md)

### From Source
```bash
# Clone repository
git clone https://github.com/deepweb/deepweb-firefox
cd deepweb-firefox

# Install dependencies
npm install

# Build extension
npm run build:mozilla

# Load in Firefox
npm run start:firefox
```

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Smart Summaries** - Instantly summarize any article or document
- **Context-Aware Chat** - AI understands the page you're viewing
- **Multi-Model Support** - Choose between GPT-4, Claude, DeepSeek
- **Custom Templates** - Create reusable prompts for common tasks

### 🎨 Beautiful & Customizable
- **4 Theme Options** - Light, Dark, Sepia, High Contrast
- **Resizable Interface** - Adjust size and position to your preference
- **Smooth Animations** - 12+ animation presets
- **Mobile Responsive** - Works on all screen sizes

### 🔐 Privacy & Security
- **Local Storage Only** - Your data never leaves your device
- **Encrypted API Keys** - Military-grade AES-256 encryption
- **No Tracking** - Zero analytics or user tracking
- **Open Source** - Fully auditable codebase

### 🚄 Performance Optimized
- **Lazy Loading** - Fast initial load times
- **Smart Caching** - Efficient memory usage
- **Bundle Optimization** - Minimal extension size
- **Streaming Responses** - See AI responses in real-time

## 🎯 Use Cases

- **📚 Research** - Analyze and summarize research papers
- **💼 Productivity** - Draft emails based on webpage content
- **🌐 Language Learning** - Translate and explain foreign content
- **💻 Coding** - Get explanations for code snippets
- **📰 News Reading** - Get unbiased summaries of articles
- **🛍️ Shopping** - Compare products and read review summaries

## ⚡ Quick Start

1. **Install DeepWeb** from Firefox Add-ons
2. **Get API Key** from [DeepSeek](https://platform.deepseek.com) (free tier available)
3. **Configure** by clicking the DeepWeb icon
4. **Start Chatting** with Ctrl+Shift+Y on any webpage!

See the full [Quickstart Tutorial](docs/tutorials/quickstart.md) for details.

## 📖 Documentation

- [User Guide](docs/user-guide.md) - Complete feature documentation
- [FAQ](docs/FAQ.md) - Frequently asked questions
- [Templates Guide](docs/tutorials/templates-guide.md) - Master prompt templates
- [Troubleshooting](docs/tutorials/troubleshooting.md) - Fix common issues
- [Developer Docs](docs/DEVELOPMENT.md) - Contributing guide

## 🛡️ Security & Privacy

DeepWeb takes your privacy seriously:

- ✅ **No Data Collection** - We don't track, collect, or sell any user data
- ✅ **Local Storage** - All conversations stored encrypted on your device
- ✅ **Secure API Calls** - Direct communication with AI providers
- ✅ **Open Source** - Fully auditable code

Read our [Privacy Policy](docs/privacy-policy.md) for details.

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) to get started.

### Development Setup
```bash
# Clone repo
git clone https://github.com/deepweb/deepweb-firefox
cd deepweb-firefox

# Install dependencies
npm install

# Run tests
npm test

# Start development
npm run watch
```

### Areas to Contribute
- 🐛 Bug fixes
- ✨ New features
- 📖 Documentation
- 🌐 Translations
- 🎨 UI/UX improvements

## 📊 Project Status

- **Current Version**: 1.0
- **Development Stage**: Production Ready
- **Browser Support**: Firefox 78+
- **Test Coverage**: 11% (improving to 90%)
- **Bundle Size**: 174KB

## 🗺️ Roadmap

### Version 1.1 (Q1 2025)
- [ ] Chrome/Edge support
- [ ] Voice input/output
- [ ] Offline mode with local AI
- [ ] Team collaboration features

### Version 1.2 (Q2 2025)
- [ ] Mobile app
- [ ] Browser sync
- [ ] Custom AI training
- [ ] Plugin system

## 💬 Support

Need help? We're here for you:

- 📖 [Documentation](docs/index.md)
- 💬 [Community Forum](https://community.deepweb.ai)
- 🐛 [Bug Reports](https://github.com/deepweb/issues)
- 📧 [Email Support](mailto:support@deepweb.ai)

## 📜 License

DeepWeb is open source software licensed under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- [DeepSeek](https://deepseek.com) for AI infrastructure
- [Mozilla](https://mozilla.org) for Firefox platform
- All our [contributors](https://github.com/deepweb/graphs/contributors)
- You, for making the web more intelligent!

---

<div align="center">
  Made with ❤️ by the DeepWeb Team
  
  ⭐ Star us on GitHub to support the project!
</div>