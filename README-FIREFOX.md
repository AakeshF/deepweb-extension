# DeepWeb AI Assistant for Firefox 🦊

Your intelligent AI companion for browsing the web, powered by DeepSeek's advanced models.

## Why Firefox?

With Google's recent release of Gemini companion (which is Chrome-exclusive), Firefox users need a powerful AI assistant too! DeepWeb brings cutting-edge AI capabilities to Firefox with:

- 🤖 **Multiple AI Models**: Choose between Chat, Coder, and Reasoner models
- 🔒 **Privacy-First**: Your data stays with you, API keys stored locally
- 💰 **Cost-Effective**: DeepSeek's competitive pricing (as low as $0.14/million tokens)
- 🚀 **Firefox-Optimized**: Built specifically for Firefox's WebExtensions API

## Features

- **Smart Model Selection**: Automatically suggests the best model for your query
- **Context-Aware**: Understands the webpage you're viewing
- **Rate Limiting**: Prevents accidental overspending
- **Beautiful UI**: Modern, responsive design that works on any website
- **Keyboard Shortcuts**: Toggle with Ctrl+Shift+Y
- **Right-Click Integration**: Select text and ask AI about it

## Installation

### From Source (Temporary)

1. Clone this repository or download the ZIP
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension folder
6. The extension icon will appear in your toolbar

### For Permanent Installation

1. Package the extension:
   ```bash
   cd deepseek-chat-extension
   zip -r deepweb-firefox.xpi * -x "*.git*" "*.md"
   ```

2. Sign the extension at https://addons.mozilla.org/developers/

## Setup

1. **Get a DeepSeek API Key**:
   - Visit https://platform.deepseek.com/
   - Sign up and navigate to API Keys
   - Create a new API key

2. **Configure the Extension**:
   - Click the DeepWeb icon in Firefox toolbar
   - Enter your DeepSeek API key
   - Save settings

3. **Start Using**:
   - Visit any webpage
   - Press Ctrl+Shift+Y or click the extension icon
   - Ask questions about the page content

## Usage Tips

### Model Selection Guide

- **DeepSeek Chat** (General Purpose)
  - Best for: Summaries, explanations, general questions
  - Cost: $0.14/million tokens
  - Use when: You need quick, conversational responses

- **DeepSeek Coder** (Programming)
  - Best for: Code analysis, debugging, technical questions
  - Cost: $0.14/million tokens
  - Use when: On GitHub, StackOverflow, or discussing code

- **DeepSeek Reasoner** (Complex Analysis)
  - Best for: Math, logic, complex problem-solving
  - Cost: $0.55/million tokens
  - Use when: You need step-by-step reasoning

### Cost Management

- Rate limited to 1 request per 10 seconds
- Approximate costs shown after each response
- Daily spending visible in extension popup

## Keyboard Shortcuts

- `Ctrl+Shift+Y`: Toggle chat interface
- `Enter`: Send message
- `Escape`: Minimize chat

## Privacy & Security

- **No Data Collection**: We don't track or store your queries
- **Local Storage Only**: API keys stored encrypted in Firefox
- **Direct API Calls**: Communication only between you and DeepSeek
- **Open Source**: Audit the code yourself

## Troubleshooting

### Extension Not Appearing?
- Ensure you're using Firefox 78 or newer
- Check `about:debugging` for error messages
- Try reloading the extension

### "API Key Not Set" Error?
- Click the extension icon
- Navigate to API Settings tab
- Enter your DeepSeek API key
- Click Save Settings

### Responses Timing Out?
- Check your internet connection
- Verify API key is valid
- Try a simpler query first

## Development

### File Structure
```
deepweb-firefox/
├── manifest.json          # Firefox manifest v2
├── background-firefox.js  # Background script
├── content/
│   └── content-firefox.js # Content script
├── popup/
│   ├── popup.html        # Settings UI
│   └── popup-firefox.js  # Settings logic
└── icons/               # Extension icons
```

### Building from Source
```bash
# Install dependencies (none required!)
# Test locally
web-ext run

# Build for distribution
web-ext build
```

## Why We Switched from Chrome

Google's release of Gemini as a Chrome-exclusive companion made us realize Firefox users deserve powerful AI tools too. Rather than compete with Google's built-in solution, we're bringing the best of AI to the open web through Firefox.

## Contributing

We welcome contributions! Please:
- Test on different Firefox versions
- Report bugs via GitHub issues
- Submit PRs for enhancements

## License

MIT License - Use freely!

## Support

- **Issues**: GitHub Issues
- **Email**: support@deepweb.ai
- **Firefox Add-ons**: Coming soon!

---

Built with ❤️ for the Firefox community