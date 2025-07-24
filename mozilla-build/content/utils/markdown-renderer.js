/**
 * Markdown Renderer Utility
 * A secure, lightweight markdown to HTML renderer with syntax highlighting
 * and XSS protection - no external dependencies required
 */

class MarkdownRenderer {
    constructor(options = {}) {
        this.options = {
            sanitize: true,
            breaks: true,
            linkify: true,
            typographer: true,
            highlightCode: true,
            addCopyButtons: true,
            customRenderers: {},
            ...options
        };

        // HTML entities map for escaping
        this.htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        // Allowed HTML tags and attributes for sanitization
        this.allowedTags = new Set([
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'a', 'em', 'strong', 'b', 'i', 'u', 's', 'del',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'span', 'div'
        ]);

        this.allowedAttributes = {
            'a': ['href', 'title', 'target', 'rel'],
            'code': ['class'],
            'pre': ['class'],
            'span': ['class'],
            'div': ['class', 'data-lang', 'data-copy']
        };

        // Code language aliases
        this.languageAliases = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'rb': 'ruby',
            'sh': 'bash',
            'yml': 'yaml',
            'md': 'markdown'
        };

        // Initialize syntax highlighting patterns
        this.initSyntaxHighlighting();
    }

    /**
     * Initialize syntax highlighting patterns for common languages
     */
    initSyntaxHighlighting() {
        this.syntaxPatterns = {
            javascript: {
                keywords: /\b(const|let|var|function|class|if|else|for|while|do|return|try|catch|finally|throw|async|await|import|export|from|default|new|this|super|extends|implements|interface|enum|type|namespace|module|declare|as|public|private|protected|static|readonly|abstract|override|yield|break|continue|switch|case|typeof|instanceof|in|of|void|null|undefined|true|false)\b/g,
                strings: /(["'`])(?:(?=(\\?))\2.)*?\1/g,
                comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
                numbers: /\b(\d+(\.\d+)?([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/g,
                functions: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
                operators: /([+\-*/%=<>!&|^~?:]|&&|\|\||==|!=|===|!==|<=|>=|<<|>>|>>>|\+\+|--|\.\.\.)/g
            },
            python: {
                keywords: /\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|pass|break|continue|raise|assert|del|in|is|not|and|or|None|True|False|self|super|global|nonlocal|async|await)\b/g,
                strings: /(["'])(?:(?=(\\?))\2.)*?\1|"""[\s\S]*?"""|'''[\s\S]*?'''|f["'](?:(?=(\\?))\3.)*?["']/g,
                comments: /(#.*$)/gm,
                numbers: /\b(\d+(\.\d+)?([eE][+-]?\d+)?|0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+)\b/g,
                functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g,
                decorators: /@[a-zA-Z_][a-zA-Z0-9_]*/g
            },
            html: {
                tags: /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z-]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s*\/?>/g,
                attributes: /\s([a-zA-Z-]+)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g,
                comments: /<!--[\s\S]*?-->/g,
                doctype: /<!DOCTYPE[^>]*>/gi
            },
            css: {
                selectors: /[.#]?[a-zA-Z][a-zA-Z0-9_-]*|:[a-zA-Z-]+(\([^)]*\))?|::[a-zA-Z-]+/g,
                properties: /([a-zA-Z-]+)\s*:/g,
                values: /:\s*([^;]+)/g,
                comments: /\/\*[\s\S]*?\*\//g,
                atRules: /@[a-zA-Z-]+[^{;]*/g
            },
            json: {
                strings: /"(?:[^"\\]|\\.)*"/g,
                numbers: /-?\b\d+(\.\d+)?([eE][+-]?\d+)?\b/g,
                booleans: /\b(true|false|null)\b/g,
                properties: /"([^"]+)"\s*:/g
            },
            sql: {
                keywords: /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|DELETE|CREATE|TABLE|DROP|ALTER|INDEX|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|VALUES|SET|PRIMARY|KEY|FOREIGN|REFERENCES|CASCADE|NULL|DEFAULT|AUTO_INCREMENT|UNIQUE|CONSTRAINT)\b/gi,
                strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
                comments: /(--.*$|\/\*[\s\S]*?\*\/)/gm,
                numbers: /\b\d+(\.\d+)?\b/g,
                functions: /\b(COUNT|SUM|AVG|MIN|MAX|ROUND|CEILING|FLOOR|ABS|NOW|DATE|TIME|YEAR|MONTH|DAY|HOUR|MINUTE|SECOND|CONCAT|SUBSTRING|LENGTH|TRIM|UPPER|LOWER|REPLACE)\b/gi
            },
            bash: {
                keywords: /\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|in|break|continue|exit|export|source|alias|unset|readonly|local|declare|typeset|shift|test|true|false)\b/g,
                builtins: /\b(echo|printf|read|cd|pwd|ls|cp|mv|rm|mkdir|rmdir|touch|cat|grep|sed|awk|find|sort|uniq|cut|paste|tr|head|tail|wc|date|sleep|kill|ps|top|df|du|tar|gzip|gunzip|zip|unzip|curl|wget|ssh|scp|git|npm|node|python|pip|apt|yum|brew|sudo|chmod|chown|ln|which|type|hash|help|man)\b/g,
                strings: /(["'])(?:(?=(\\?))\2.)*?\1/g,
                variables: /\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\}|\$\([^)]+\)/g,
                comments: /(#.*$)/gm
            }
        };
    }

    /**
     * Escape HTML entities to prevent XSS
     */
    escapeHtml(text) {
        return text.replace(/[&<>"'`=\/]/g, char => this.htmlEntities[char] || char);
    }

    /**
     * Sanitize HTML to prevent XSS attacks
     */
    sanitizeHtml(html) {
        if (!this.options.sanitize) return html;

        // Create a temporary container to parse HTML
        const temp = document.createElement('div');
        // Safe to use innerHTML here as this is part of the sanitization process
        // The content will be thoroughly cleaned before being returned
        temp.innerHTML = html;

        // Recursively sanitize all elements
        this.sanitizeElement(temp);

        return temp.innerHTML;
    }

    /**
     * Recursively sanitize DOM elements
     */
    sanitizeElement(element) {
        const toRemove = [];

        for (let child of element.children) {
            const tagName = child.tagName.toLowerCase();

            if (!this.allowedTags.has(tagName)) {
                toRemove.push(child);
            } else {
                // Remove disallowed attributes
                const allowedAttrs = this.allowedAttributes[tagName] || [];
                const attrs = Array.from(child.attributes);
                
                attrs.forEach(attr => {
                    if (!allowedAttrs.includes(attr.name)) {
                        child.removeAttribute(attr.name);
                    } else if (attr.name === 'href' || attr.name === 'src') {
                        // Sanitize URLs
                        const url = attr.value.trim();
                        if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('vbscript:')) {
                            child.removeAttribute(attr.name);
                        }
                    }
                });

                // Add security attributes to links
                if (tagName === 'a' && child.hasAttribute('href')) {
                    child.setAttribute('rel', 'noopener noreferrer');
                    if (!child.hasAttribute('target')) {
                        child.setAttribute('target', '_blank');
                    }
                }

                // Recursively sanitize children
                this.sanitizeElement(child);
            }
        }

        // Remove disallowed elements
        toRemove.forEach(child => child.remove());
    }

    /**
     * Apply syntax highlighting to code
     */
    highlightCode(code, language) {
        if (!this.options.highlightCode || !language || !this.syntaxPatterns[language]) {
            return this.escapeHtml(code);
        }

        let highlighted = this.escapeHtml(code);
        const patterns = this.syntaxPatterns[language];

        // Apply patterns in specific order to avoid conflicts
        const applyPattern = (pattern, className) => {
            highlighted = highlighted.replace(pattern, match => {
                // Don't highlight if already wrapped in a span
                if (match.includes('<span')) return match;
                return `<span class="md-${className}">${match}</span>`;
            });
        };

        // Order matters: comments and strings should be processed first
        if (patterns.comments) applyPattern(patterns.comments, 'comment');
        if (patterns.strings) applyPattern(patterns.strings, 'string');
        if (patterns.keywords) applyPattern(patterns.keywords, 'keyword');
        if (patterns.numbers) applyPattern(patterns.numbers, 'number');
        if (patterns.booleans) applyPattern(patterns.booleans, 'boolean');
        if (patterns.functions) applyPattern(patterns.functions, 'function');
        if (patterns.operators) applyPattern(patterns.operators, 'operator');
        if (patterns.decorators) applyPattern(patterns.decorators, 'decorator');
        if (patterns.builtins) applyPattern(patterns.builtins, 'builtin');
        if (patterns.variables) applyPattern(patterns.variables, 'variable');
        if (patterns.properties) applyPattern(patterns.properties, 'property');
        if (patterns.selectors) applyPattern(patterns.selectors, 'selector');
        if (patterns.tags) applyPattern(patterns.tags, 'tag');
        if (patterns.atRules) applyPattern(patterns.atRules, 'at-rule');

        return highlighted;
    }

    /**
     * Parse inline markdown elements
     */
    parseInline(text) {
        let html = this.escapeHtml(text);

        // Custom renderers for inline elements
        if (this.options.customRenderers.link) {
            // Allow custom link rendering
        } else {
            // Links: [text](url "title")
            html = html.replace(
                /\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g,
                (match, text, url, title) => {
                    const href = this.escapeHtml(url);
                    const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
                    return `<a href="${href}"${titleAttr}>${text}</a>`;
                }
            );
        }

        // Images: ![alt](url "title")
        html = html.replace(
            /!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g,
            (match, alt, url, title) => {
                const src = this.escapeHtml(url);
                const altAttr = alt ? ` alt="${this.escapeHtml(alt)}"` : '';
                const titleAttr = title ? ` title="${this.escapeHtml(title)}"` : '';
                return `<img src="${src}"${altAttr}${titleAttr}>`;
            }
        );

        // Bold: **text** or __text__
        html = html.replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (match, p1, p2) => {
            return `<strong>${p1 || p2}</strong>`;
        });

        // Italic: *text* or _text_
        html = html.replace(/\*([^*]+)\*|_([^_]+)_/g, (match, p1, p2) => {
            return `<em>${p1 || p2}</em>`;
        });

        // Strikethrough: ~~text~~
        html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

        // Inline code: `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Line breaks
        if (this.options.breaks) {
            html = html.replace(/\n/g, '<br>');
        }

        // Auto-linkify URLs
        if (this.options.linkify) {
            html = html.replace(
                /(https?:\/\/[^\s<]+)/g,
                '<a href="$1">$1</a>'
            );
        }

        // Typographic replacements
        if (this.options.typographer) {
            html = html
                .replace(/--/g, '—') // em dash
                .replace(/\.\.\./g, '…') // ellipsis
                .replace(/\(c\)/gi, '©')
                .replace(/\(r\)/gi, '®')
                .replace(/\(tm\)/gi, '™');
        }

        return html;
    }

    /**
     * Parse a table from markdown
     */
    parseTable(lines, startIndex) {
        const headerLine = lines[startIndex];
        const separatorLine = lines[startIndex + 1];
        
        if (!separatorLine || !separatorLine.match(/^\|?[\s-:|]+\|?$/)) {
            return null;
        }

        const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
        const alignments = separatorLine.split('|').map(cell => {
            cell = cell.trim();
            if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
            if (cell.endsWith(':')) return 'right';
            if (cell.startsWith(':')) return 'left';
            return null;
        }).filter((_, i) => i < headers.length);

        let html = '<table>\n<thead>\n<tr>\n';
        headers.forEach((header, i) => {
            const align = alignments[i] ? ` style="text-align: ${alignments[i]}"` : '';
            html += `<th${align}>${this.parseInline(header)}</th>\n`;
        });
        html += '</tr>\n</thead>\n<tbody>\n';

        let rowIndex = startIndex + 2;
        while (rowIndex < lines.length && lines[rowIndex].includes('|')) {
            const cells = lines[rowIndex].split('|').map(c => c.trim()).filter(c => c !== undefined);
            if (cells.length === 0) break;
            
            html += '<tr>\n';
            cells.forEach((cell, i) => {
                if (i < headers.length) {
                    const align = alignments[i] ? ` style="text-align: ${alignments[i]}"` : '';
                    html += `<td${align}>${this.parseInline(cell)}</td>\n`;
                }
            });
            html += '</tr>\n';
            rowIndex++;
        }

        html += '</tbody>\n</table>';
        return { html, endIndex: rowIndex - 1 };
    }

    /**
     * Create a copy button for code blocks
     */
    createCopyButton(code) {
        const id = 'code-' + Math.random().toString(36).substr(2, 9);
        return `
            <div class="md-code-block" data-copy="${id}">
                <button class="md-copy-button" onclick="this.markdownRenderer.copyCode('${id}')">
                    Copy
                </button>
                <pre id="${id}"><code>${code}</code></pre>
            </div>
        `;
    }

    /**
     * Copy code to clipboard
     */
    copyCode(id) {
        const codeElement = document.getElementById(id);
        if (!codeElement) return;

        const text = codeElement.textContent;
        navigator.clipboard.writeText(text).then(() => {
            const button = document.querySelector(`[data-copy="${id}"] .md-copy-button`);
            if (button) {
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    /**
     * Main render method
     */
    render(markdown) {
        if (!markdown) return '';

        // Store reference for copy functionality
        window.markdownRenderer = this;

        const lines = markdown.split('\n');
        let html = '';
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Code blocks with ``` or ~~~
            if (line.match(/^```|^~~~/)) {
                const fence = line.match(/^(```|~~~)([a-zA-Z0-9_+-]*)/);
                const endFence = fence[1];
                let language = fence[2] || '';
                language = this.languageAliases[language] || language;
                
                let code = '';
                i++;
                while (i < lines.length && !lines[i].startsWith(endFence)) {
                    code += lines[i] + '\n';
                    i++;
                }
                code = code.trimEnd();

                const highlighted = this.highlightCode(code, language);
                const langClass = language ? ` class="language-${language}"` : '';
                
                if (this.options.addCopyButtons) {
                    html += this.createCopyButton(`<code${langClass}>${highlighted}</code>`);
                } else {
                    html += `<pre><code${langClass}>${highlighted}</code></pre>\n`;
                }
                i++;
                continue;
            }

            // Tables
            if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^\|?[\s-:|]+\|?$/)) {
                const table = this.parseTable(lines, i);
                if (table) {
                    html += table.html + '\n';
                    i = table.endIndex + 1;
                    continue;
                }
            }

            // Headings
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const text = this.parseInline(headingMatch[2]);
                html += `<h${level}>${text}</h${level}>\n`;
                i++;
                continue;
            }

            // Horizontal rules
            if (line.match(/^[-*_]{3,}$/)) {
                html += '<hr>\n';
                i++;
                continue;
            }

            // Blockquotes
            if (line.startsWith('>')) {
                let quote = '';
                while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
                    quote += lines[i].replace(/^>\s?/, '') + '\n';
                    i++;
                }
                const quotedHtml = this.render(quote.trim());
                html += `<blockquote>${quotedHtml}</blockquote>\n`;
                continue;
            }

            // Lists
            const listMatch = line.match(/^(\s*)([*+-]|\d+\.)\s+(.+)$/);
            if (listMatch) {
                const indent = listMatch[1].length;
                const marker = listMatch[2];
                const isOrdered = /^\d+\./.test(marker);
                const listType = isOrdered ? 'ol' : 'ul';
                
                html += `<${listType}>\n`;
                
                while (i < lines.length) {
                    const currentLine = lines[i];
                    const currentMatch = currentLine.match(/^(\s*)([*+-]|\d+\.)\s+(.+)$/);
                    
                    if (!currentMatch || currentMatch[1].length !== indent) {
                        break;
                    }
                    
                    html += `<li>${this.parseInline(currentMatch[3])}</li>\n`;
                    i++;
                }
                
                html += `</${listType}>\n`;
                continue;
            }

            // Paragraphs
            if (line.trim()) {
                let paragraph = line;
                i++;
                while (i < lines.length && lines[i].trim() && !lines[i].match(/^(#{1,6}|```|~~~|[*+-]|\d+\.|\||>)/)) {
                    paragraph += '\n' + lines[i];
                    i++;
                }
                html += `<p>${this.parseInline(paragraph)}</p>\n`;
                continue;
            }

            i++;
        }

        // Apply custom renderers
        if (this.options.customRenderers.postProcess) {
            html = this.options.customRenderers.postProcess(html);
        }

        // Sanitize the final HTML
        return this.sanitizeHtml(html);
    }

    /**
     * Add custom renderer for specific elements
     */
    addCustomRenderer(element, renderer) {
        this.options.customRenderers[element] = renderer;
    }

    /**
     * Get default styles for markdown content
     */
    static getDefaultStyles() {
        return `
            .md-content {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            .md-content h1, .md-content h2, .md-content h3,
            .md-content h4, .md-content h5, .md-content h6 {
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 600;
                line-height: 1.25;
            }
            .md-content h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
            .md-content h2 { font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
            .md-content h3 { font-size: 1.25em; }
            .md-content h4 { font-size: 1em; }
            .md-content h5 { font-size: 0.875em; }
            .md-content h6 { font-size: 0.85em; color: #666; }
            
            .md-content p { margin-bottom: 16px; }
            .md-content blockquote {
                margin: 0 0 16px 0;
                padding: 0 1em;
                color: #666;
                border-left: 4px solid #dfe2e5;
            }
            
            .md-content code {
                background-color: rgba(27, 31, 35, 0.05);
                border-radius: 3px;
                font-size: 85%;
                margin: 0;
                padding: 0.2em 0.4em;
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            }
            
            .md-content pre {
                background-color: #f6f8fa;
                border-radius: 6px;
                font-size: 85%;
                line-height: 1.45;
                overflow: auto;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .md-content pre code {
                background-color: transparent;
                border: 0;
                display: inline;
                line-height: inherit;
                margin: 0;
                overflow: visible;
                padding: 0;
                word-wrap: normal;
            }
            
            .md-code-block {
                position: relative;
                margin-bottom: 16px;
            }
            
            .md-copy-button {
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 4px 8px;
                font-size: 12px;
                line-height: 1;
                color: #666;
                background-color: #fff;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .md-copy-button:hover {
                color: #333;
                background-color: #f6f8fa;
                border-color: #bbb;
            }
            
            .md-content ul, .md-content ol {
                margin-bottom: 16px;
                padding-left: 2em;
            }
            
            .md-content li { margin-bottom: 4px; }
            
            .md-content table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 16px;
            }
            
            .md-content table th,
            .md-content table td {
                border: 1px solid #dfe2e5;
                padding: 6px 13px;
            }
            
            .md-content table th {
                background-color: #f6f8fa;
                font-weight: 600;
            }
            
            .md-content table tr:nth-child(even) {
                background-color: #f6f8fa;
            }
            
            .md-content a {
                color: #0366d6;
                text-decoration: none;
            }
            
            .md-content a:hover {
                text-decoration: underline;
            }
            
            .md-content hr {
                border: 0;
                border-bottom: 1px solid #dfe2e5;
                margin: 24px 0;
            }
            
            /* Syntax highlighting */
            .md-keyword { color: #d73a49; font-weight: bold; }
            .md-string { color: #032f62; }
            .md-comment { color: #6a737d; font-style: italic; }
            .md-number { color: #005cc5; }
            .md-boolean { color: #005cc5; }
            .md-function { color: #6f42c1; }
            .md-operator { color: #d73a49; }
            .md-variable { color: #e36209; }
            .md-property { color: #005cc5; }
            .md-decorator { color: #6f42c1; }
            .md-builtin { color: #005cc5; }
            .md-tag { color: #22863a; }
            .md-selector { color: #6f42c1; }
            .md-at-rule { color: #d73a49; }
            
            /* Dark theme support */
            @media (prefers-color-scheme: dark) {
                .md-content { color: #e1e4e8; }
                .md-content h6 { color: #959da5; }
                .md-content blockquote { color: #959da5; border-left-color: #444d56; }
                .md-content code { background-color: rgba(110, 118, 129, 0.15); }
                .md-content pre { background-color: #2f363d; }
                .md-copy-button {
                    color: #e1e4e8;
                    background-color: #2f363d;
                    border-color: #444d56;
                }
                .md-copy-button:hover {
                    background-color: #444d56;
                    border-color: #586069;
                }
                .md-content table th { background-color: #2f363d; }
                .md-content table tr:nth-child(even) { background-color: #2f363d; }
                .md-content table th,
                .md-content table td { border-color: #444d56; }
                .md-content a { color: #58a6ff; }
                .md-content hr { border-bottom-color: #444d56; }
                
                /* Dark theme syntax highlighting */
                .md-keyword { color: #ff7b72; }
                .md-string { color: #a5d6ff; }
                .md-comment { color: #8b949e; }
                .md-number { color: #79c0ff; }
                .md-boolean { color: #79c0ff; }
                .md-function { color: #d2a8ff; }
                .md-operator { color: #ff7b72; }
                .md-variable { color: #ffa657; }
                .md-property { color: #79c0ff; }
                .md-decorator { color: #d2a8ff; }
                .md-builtin { color: #79c0ff; }
                .md-tag { color: #7ee787; }
                .md-selector { color: #d2a8ff; }
                .md-at-rule { color: #ff7b72; }
            }
        `;
    }
}

// Export the renderer
export default MarkdownRenderer;

// Also export as a singleton for convenience
export const markdownRenderer = new MarkdownRenderer();