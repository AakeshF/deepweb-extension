/**
 * Example usage of the Markdown Renderer
 * This demonstrates how to integrate the renderer with the message display system
 */

import MarkdownRenderer from './markdown-renderer.js';
import { DOMSecurity } from '../../src/security/DOMSecurity.js';

// Example 1: Basic usage with default options
const basicRenderer = new MarkdownRenderer();

const basicMarkdown = `
# Hello World

This is a **bold** text and this is *italic*.

## Features

- Secure HTML sanitization
- Syntax highlighting
- Table support
- Auto-linking

### Code Example

\`\`\`javascript
function greet(name) {
    console.log(\`Hello, \${name}!\`);
    return true;
}
\`\`\`

### Table Example

| Feature | Status | Notes |
|---------|--------|-------|
| XSS Protection | ✓ | Built-in sanitization |
| Syntax Highlighting | ✓ | Multiple languages |
| Copy Button | ✓ | For code blocks |
`;

// Render to HTML
const basicHtml = basicRenderer.render(basicMarkdown);

// Example 2: Custom configuration
const customRenderer = new MarkdownRenderer({
    sanitize: true,
    breaks: true,
    linkify: true,
    typographer: true,
    highlightCode: true,
    addCopyButtons: true
});

// Example 3: Integration with message display
class MessageRenderer {
    constructor() {
        this.markdownRenderer = new MarkdownRenderer({
            sanitize: true,
            addCopyButtons: true,
            customRenderers: {
                // Custom link renderer to add icons
                link: (href, title, text) => {
                    const isExternal = href.startsWith('http');
                    const icon = isExternal ? ' 🔗' : '';
                    return `<a href="${href}" ${title ? `title="${title}"` : ''} ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''}>${text}${icon}</a>`;
                },
                // Post-process to wrap in message container
                postProcess: (html) => {
                    return `<div class="md-content message-content">${html}</div>`;
                }
            }
        });
    }

    renderMessage(content, isUser = false) {
        // Skip rendering for user messages (they're usually plain text)
        if (isUser) {
            return `<div class="message-content user-message">${this.escapeHtml(content)}</div>`;
        }

        // Render assistant messages with markdown
        const rendered = this.markdownRenderer.render(content);
        return `<div class="message-wrapper assistant-message">${rendered}</div>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Example 4: Advanced markdown with all features
const advancedMarkdown = `
# Advanced Markdown Example

## Text Formatting

This text includes **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

You can also use __double underscores__ for bold and _single underscores_ for italic.

## Links and Images

Here's a [link to GitHub](https://github.com "GitHub Homepage").

Auto-linking: https://www.example.com

## Lists

### Unordered List
* First item
* Second item
  * Nested item
  * Another nested item
* Third item

### Ordered List
1. First step
2. Second step
3. Third step

## Blockquotes

> This is a blockquote.
> It can span multiple lines.
>
> > And can be nested.

## Code Blocks

### JavaScript
\`\`\`javascript
// Async function with error handling
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}
\`\`\`

### Python
\`\`\`python
# Decorator example
def timer(func):
    import time
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "Done!"
\`\`\`

### SQL
\`\`\`sql
SELECT 
    u.username,
    COUNT(p.id) as post_count,
    AVG(p.score) as avg_score
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.username
HAVING COUNT(p.id) > 5
ORDER BY avg_score DESC
LIMIT 10;
\`\`\`

## Tables

### Basic Table
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Aligned Table
| Left | Center | Right |
|:-----|:------:|------:|
| A    |   B    |     C |
| D    |   E    |     F |

## Horizontal Rule

---

## Typography

Three dots... become ellipsis.
Two dashes -- become em dash.
(c) (r) (tm) become © ® ™

## XSS Prevention

The following should be sanitized:
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
<a href="javascript:alert('XSS')">Malicious Link</a>
`;

// Example 5: Usage in a chat interface
function integrateWithChat() {
    const renderer = new MarkdownRenderer();
    
    // Add styles to the document
    const styleElement = document.createElement('style');
    styleElement.textContent = MarkdownRenderer.getDefaultStyles();
    document.head.appendChild(styleElement);
    
    // Function to render messages
    function renderChatMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        if (message.role === 'assistant') {
            // Use DOMSecurity to safely append rendered markdown
            const renderedContent = renderer.render(message.content);
            DOMSecurity.appendHTML(messageElement, renderedContent, false); // Already sanitized by renderer
        } else {
            // User messages - just escape HTML
            messageElement.textContent = message.content;
        }
        
        return messageElement;
    }
    
    // Function to handle code copying
    window.markdownRenderer = renderer;
    
    return renderChatMessage;
}

// Export examples
export {
    MessageRenderer,
    integrateWithChat,
    basicMarkdown,
    advancedMarkdown
};