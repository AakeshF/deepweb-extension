/**
 * Secure Markdown Renderer
 * Renders markdown content safely without XSS vulnerabilities
 */

import { DOMSecurity } from './DOMSecurity.js';

export class SecureMarkdownRenderer {
  constructor() {
    this.codeBlockId = 0;
  }

  /**
   * Render markdown to safe HTML elements
   * @param {string} markdown - Markdown content
   * @param {Element} container - Container element
   */
  render(markdown, container) {
    if (!container || typeof markdown !== 'string') {
      throw new Error('Invalid container or markdown');
    }

    // Clear container safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Parse markdown line by line
    const lines = markdown.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Check for code blocks
      if (line.startsWith('```')) {
        const result = this.parseCodeBlock(lines, i);
        if (result.element) {
          container.appendChild(result.element);
        }
        i = result.nextIndex;
        continue;
      }
      
      // Parse inline elements
      const element = this.parseLine(line);
      if (element) {
        container.appendChild(element);
      }
      
      i++;
    }
  }

  /**
   * Parse a single line of markdown
   * @param {string} line - Line to parse
   * @returns {Element|null} Parsed element
   */
  parseLine(line) {
    const trimmed = line.trim();
    
    if (!trimmed) {
      return DOMSecurity.createElement('br');
    }
    
    // Headers
    const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      return DOMSecurity.createElement(`h${level}`, text);
    }
    
    // Lists
    if (trimmed.match(/^[-*+]\s+/)) {
      const li = DOMSecurity.createElement('li');
      const text = trimmed.replace(/^[-*+]\s+/, '');
      this.parseInline(text, li);
      
      // Wrap in ul if needed
      const ul = DOMSecurity.createElement('ul');
      ul.appendChild(li);
      return ul;
    }
    
    if (trimmed.match(/^\d+\.\s+/)) {
      const li = DOMSecurity.createElement('li');
      const text = trimmed.replace(/^\d+\.\s+/, '');
      this.parseInline(text, li);
      
      // Wrap in ol if needed
      const ol = DOMSecurity.createElement('ol');
      ol.appendChild(li);
      return ol;
    }
    
    // Blockquote
    if (trimmed.startsWith('>')) {
      const blockquote = DOMSecurity.createElement('blockquote');
      const text = trimmed.replace(/^>\s*/, '');
      this.parseInline(text, blockquote);
      return blockquote;
    }
    
    // Horizontal rule
    if (trimmed.match(/^[-*_]{3,}$/)) {
      return DOMSecurity.createElement('hr');
    }
    
    // Regular paragraph
    const p = DOMSecurity.createElement('p');
    this.parseInline(trimmed, p);
    return p;
  }

  /**
   * Parse inline markdown elements
   * @param {string} text - Text to parse
   * @param {Element} container - Container element
   */
  parseInline(text, container) {
    // Split text by inline patterns
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, tag: 'strong' },
      { regex: /\*([^*]+)\*/g, tag: 'em' },
      { regex: /`([^`]+)`/g, tag: 'code' },
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, tag: 'link' }
    ];
    
    let lastIndex = 0;
    const segments = [];
    
    // Find all matches
    patterns.forEach(({ regex, tag }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        segments.push({
          start: match.index,
          end: match.index + match[0].length,
          tag,
          content: match[1],
          href: match[2] // For links
        });
      }
    });
    
    // Sort segments by position
    segments.sort((a, b) => a.start - b.start);
    
    // Process segments
    segments.forEach(segment => {
      // Add text before segment
      if (lastIndex < segment.start) {
        const textNode = document.createTextNode(
          text.substring(lastIndex, segment.start)
        );
        container.appendChild(textNode);
      }
      
      // Add formatted element
      if (segment.tag === 'link') {
        const link = DOMSecurity.createElement('a', segment.content, {
          href: segment.href,
          target: '_blank',
          rel: 'noopener noreferrer'
        });
        container.appendChild(link);
      } else {
        const element = DOMSecurity.createElement(segment.tag, segment.content);
        container.appendChild(element);
      }
      
      lastIndex = segment.end;
    });
    
    // Add remaining text
    if (lastIndex < text.length) {
      const textNode = document.createTextNode(text.substring(lastIndex));
      container.appendChild(textNode);
    }
  }

  /**
   * Parse code block
   * @param {Array} lines - All lines
   * @param {number} startIndex - Start index
   * @returns {Object} Parsed result
   */
  parseCodeBlock(lines, startIndex) {
    const startLine = lines[startIndex];
    const language = startLine.replace(/^```/, '').trim() || 'text';
    
    let endIndex = startIndex + 1;
    const codeLines = [];
    
    // Find end of code block
    while (endIndex < lines.length) {
      if (lines[endIndex].startsWith('```')) {
        break;
      }
      codeLines.push(lines[endIndex]);
      endIndex++;
    }
    
    // Create code block element
    const pre = DOMSecurity.createElement('pre');
    const code = DOMSecurity.createElement('code', codeLines.join('\n'), {
      class: `language-${language}`
    });
    pre.appendChild(code);
    
    // Add copy button
    const wrapper = DOMSecurity.createElement('div', '', {
      class: 'code-block-wrapper'
    });
    
    const header = DOMSecurity.createElement('div', '', {
      class: 'code-block-header'
    });
    
    const langLabel = DOMSecurity.createElement('span', language, {
      class: 'code-block-language'
    });
    
    const copyButton = DOMSecurity.createElement('button', 'Copy', {
      class: 'code-block-copy',
      type: 'button'
    });
    
    // Safe event listener
    DOMSecurity.addEventListener(copyButton, 'click', () => {
      this.copyCodeBlock(codeLines.join('\n'), copyButton);
    });
    
    header.appendChild(langLabel);
    header.appendChild(copyButton);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
    
    return {
      element: wrapper,
      nextIndex: endIndex + 1
    };
  }

  /**
   * Copy code block content
   * @param {string} text - Text to copy
   * @param {Element} button - Copy button
   */
  async copyCodeBlock(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      DOMSecurity.setTextContent(button, 'Copied!');
      setTimeout(() => {
        DOMSecurity.setTextContent(button, 'Copy');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      DOMSecurity.setTextContent(button, 'Failed');
      setTimeout(() => {
        DOMSecurity.setTextContent(button, 'Copy');
      }, 2000);
    }
  }

  /**
   * Render markdown with syntax highlighting
   * @param {string} markdown - Markdown content
   * @param {Element} container - Container element
   * @param {Object} options - Rendering options
   */
  async renderWithHighlighting(markdown, container, options = {}) {
    // First render markdown
    this.render(markdown, container);
    
    // Then apply syntax highlighting if available
    if (typeof Prism !== 'undefined' && options.highlight !== false) {
      container.querySelectorAll('pre code').forEach(block => {
        Prism.highlightElement(block);
      });
    }
  }

  /**
   * Create table from markdown
   * @param {Array} lines - Table lines
   * @returns {Element} Table element
   */
  createTable(lines) {
    const table = DOMSecurity.createElement('table');
    const thead = DOMSecurity.createElement('thead');
    const tbody = DOMSecurity.createElement('tbody');
    
    // Parse header
    const headerCells = lines[0].split('|').map(cell => cell.trim()).filter(Boolean);
    const headerRow = DOMSecurity.createElement('tr');
    
    headerCells.forEach(cell => {
      const th = DOMSecurity.createElement('th', cell);
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Parse body rows
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i].split('|').map(cell => cell.trim()).filter(Boolean);
      const row = DOMSecurity.createElement('tr');
      
      cells.forEach(cell => {
        const td = DOMSecurity.createElement('td');
        this.parseInline(cell, td);
        row.appendChild(td);
      });
      
      tbody.appendChild(row);
    }
    
    table.appendChild(tbody);
    return table;
  }
}