/**
 * Built-in prompt templates for common use cases
 */

export const builtInTemplates = [
  // ========== Summarization Templates ==========
  {
    id: 'summarize-page',
    name: 'Summarize This Page',
    description: 'Get a concise summary of the current page',
    category: 'summarization',
    template: 'Please summarize the main points of this webpage:\n\n{content}\n\nProvide a clear, concise summary that captures the key information.',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true,
        description: 'Page content to summarize'
      }
    },
    shortcuts: ['/summarize', '/tldr'],
    icon: '📝',
    isBuiltIn: true
  },
  
  {
    id: 'key-points',
    name: 'Extract Key Points',
    description: 'Extract the main points from the page',
    category: 'summarization',
    template: 'Extract the key points from this content:\n\n{content}\n\nList the main points as bullet points, focusing on the most important information.',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/keypoints', '/bullets'],
    icon: '🎯',
    isBuiltIn: true
  },
  
  {
    id: 'explain-selection',
    name: 'Explain Selection',
    description: 'Get an explanation of selected text',
    category: 'summarization',
    template: 'Please explain this text in simple terms:\n\n"{selection}"\n\nContext: This is from a page about {title}',
    variables: {
      selection: {
        type: 'text',
        source: 'selection',
        required: true,
        description: 'Selected text to explain'
      },
      title: {
        type: 'text',
        source: 'page',
        field: 'title',
        required: false
      }
    },
    shortcuts: ['/explain'],
    icon: '💡',
    isBuiltIn: true
  },

  // ========== Analysis Templates ==========
  {
    id: 'analyze-pros-cons',
    name: 'Analyze Pros and Cons',
    description: 'Analyze advantages and disadvantages',
    category: 'analysis',
    template: 'Analyze the pros and cons of {topic} based on this content:\n\n{content}\n\nProvide a balanced analysis with clear pros and cons lists.',
    variables: {
      topic: {
        type: 'text',
        source: 'user',
        required: true,
        description: 'Topic to analyze',
        default: 'this'
      },
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/proscons', '/analyze'],
    icon: '⚖️',
    isBuiltIn: true
  },
  
  {
    id: 'fact-check',
    name: 'Fact Check',
    description: 'Verify claims and statements',
    category: 'analysis',
    template: 'Please fact-check the following claims from this webpage:\n\n{content}\n\nIdentify any statements that may need verification and explain why.',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/factcheck', '/verify'],
    icon: '✓',
    isBuiltIn: true
  },
  
  {
    id: 'find-issues',
    name: 'Find Issues',
    description: 'Identify problems or concerns',
    category: 'analysis',
    template: 'Identify any issues, problems, or concerns in this content:\n\n{content}\n\nFocus on: {focus}',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      },
      focus: {
        type: 'text',
        source: 'user',
        required: false,
        default: 'accuracy, clarity, completeness, and potential biases',
        description: 'Specific areas to focus on'
      }
    },
    shortcuts: ['/issues', '/problems'],
    icon: '⚠️',
    isBuiltIn: true
  },

  // ========== Coding Templates ==========
  {
    id: 'review-code',
    name: 'Review Code',
    description: 'Get a code review for the current page',
    category: 'coding',
    template: 'Please review this code:\n\n{content}\n\nProvide feedback on:\n- Code quality and best practices\n- Potential bugs or issues\n- Performance considerations\n- Suggestions for improvement',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    model: 'deepseek-reasoner',
    shortcuts: ['/codereview', '/review'],
    icon: '👨‍💻',
    isBuiltIn: true
  },
  
  {
    id: 'explain-code',
    name: 'Explain Code',
    description: 'Get an explanation of how code works',
    category: 'coding',
    template: 'Explain how this code works:\n\n{code}\n\nProvide a clear explanation suitable for {level} level developers.',
    variables: {
      code: {
        type: 'text',
        source: 'selection',
        required: true,
        description: 'Code to explain'
      },
      level: {
        type: 'select',
        source: 'user',
        options: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate',
        required: false
      }
    },
    shortcuts: ['/explaincode', '/how'],
    icon: '📖',
    isBuiltIn: true
  },
  
  {
    id: 'find-bugs',
    name: 'Find Bugs',
    description: 'Identify potential bugs in code',
    category: 'coding',
    template: 'Analyze this code for potential bugs, errors, or issues:\n\n{content}\n\nFocus on:\n- Logic errors\n- Edge cases\n- Security vulnerabilities\n- Performance issues',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    model: 'deepseek-reasoner',
    shortcuts: ['/bugs', '/findbugs'],
    icon: '🐛',
    isBuiltIn: true
  },
  
  {
    id: 'optimize-code',
    name: 'Optimize Code',
    description: 'Get suggestions for code optimization',
    category: 'coding',
    template: 'Suggest optimizations for this code:\n\n{code}\n\nFocus on {aspect} improvements.',
    variables: {
      code: {
        type: 'text',
        source: 'selection',
        required: true
      },
      aspect: {
        type: 'select',
        source: 'user',
        options: ['performance', 'readability', 'memory usage', 'all aspects'],
        default: 'all aspects',
        required: false
      }
    },
    shortcuts: ['/optimize'],
    icon: '⚡',
    isBuiltIn: true
  },

  // ========== Research Templates ==========
  {
    id: 'find-sources',
    name: 'Find Sources',
    description: 'Find sources and references for claims',
    category: 'research',
    template: 'Based on this content:\n\n{content}\n\nPlease:\n1. Identify key claims that need sources\n2. Suggest where to find reliable sources\n3. Evaluate the existing sources if any',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/sources', '/references'],
    icon: '📚',
    isBuiltIn: true
  },
  
  {
    id: 'compare-with',
    name: 'Compare With',
    description: 'Compare current content with another topic',
    category: 'research',
    template: 'Compare the content on this page about {topic1} with {topic2}:\n\n{content}\n\nHighlight similarities, differences, and key distinctions.',
    variables: {
      topic1: {
        type: 'text',
        source: 'page',
        field: 'title',
        transform: 'trim',
        required: true
      },
      topic2: {
        type: 'text',
        source: 'user',
        required: true,
        description: 'Topic to compare with'
      },
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/compare'],
    icon: '🔄',
    isBuiltIn: true
  },
  
  {
    id: 'deep-dive',
    name: 'Deep Dive',
    description: 'Get an in-depth analysis of a topic',
    category: 'research',
    template: 'Provide a deep dive analysis of {topic} based on this content:\n\n{content}\n\nInclude:\n- Core concepts\n- Important details\n- Implications\n- Related topics to explore',
    variables: {
      topic: {
        type: 'text',
        source: 'user',
        required: false,
        default: 'this topic',
        description: 'Specific topic to analyze'
      },
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    model: 'deepseek-reasoner',
    shortcuts: ['/deepdive', '/detailed'],
    icon: '🔍',
    isBuiltIn: true
  },

  // ========== Writing Templates ==========
  {
    id: 'improve-writing',
    name: 'Improve Writing',
    description: 'Get suggestions to improve text',
    category: 'writing',
    template: 'Please improve this text:\n\n{text}\n\nFocus on:\n- Clarity and conciseness\n- Grammar and style\n- Flow and structure\n- Engagement',
    variables: {
      text: {
        type: 'text',
        source: 'selection',
        required: true,
        description: 'Text to improve'
      }
    },
    shortcuts: ['/improve', '/rewrite'],
    icon: '✏️',
    isBuiltIn: true
  },
  
  {
    id: 'fix-grammar',
    name: 'Fix Grammar',
    description: 'Correct grammar and spelling errors',
    category: 'writing',
    template: 'Fix any grammar, spelling, or punctuation errors in this text:\n\n{text}\n\nProvide the corrected version and briefly explain the changes.',
    variables: {
      text: {
        type: 'text',
        source: 'selection',
        required: true
      }
    },
    shortcuts: ['/grammar', '/fix'],
    icon: '📝',
    isBuiltIn: true
  },
  
  {
    id: 'change-tone',
    name: 'Change Tone',
    description: 'Rewrite text in a different tone',
    category: 'writing',
    template: 'Rewrite this text in a {tone} tone:\n\n{text}\n\nMaintain the original meaning while adapting the style.',
    variables: {
      tone: {
        type: 'select',
        source: 'user',
        options: ['professional', 'casual', 'formal', 'friendly', 'academic', 'persuasive'],
        required: true,
        description: 'Target tone'
      },
      text: {
        type: 'text',
        source: 'selection',
        required: true
      }
    },
    shortcuts: ['/tone'],
    icon: '🎭',
    isBuiltIn: true
  },

  // ========== Learning Templates ==========
  {
    id: 'eli5',
    name: 'Explain Like I\'m 5',
    description: 'Get a simple explanation anyone can understand',
    category: 'learning',
    template: 'Explain this concept as if I\'m 5 years old:\n\n{concept}\n\nUse simple words, analogies, and examples that a child would understand.',
    variables: {
      concept: {
        type: 'text',
        source: 'selection',
        required: true,
        description: 'Concept to explain'
      }
    },
    shortcuts: ['/eli5', '/simple'],
    icon: '👶',
    isBuiltIn: true
  },
  
  {
    id: 'create-quiz',
    name: 'Create Quiz',
    description: 'Generate quiz questions from content',
    category: 'learning',
    template: 'Create {count} quiz questions based on this content:\n\n{content}\n\nInclude:\n- Multiple choice questions\n- True/false questions\n- Short answer questions\n\nProvide answers at the end.',
    variables: {
      count: {
        type: 'number',
        source: 'user',
        default: 5,
        required: false,
        description: 'Number of questions'
      },
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/quiz', '/test'],
    icon: '❓',
    isBuiltIn: true
  },
  
  {
    id: 'study-notes',
    name: 'Create Study Notes',
    description: 'Generate comprehensive study notes',
    category: 'learning',
    template: 'Create detailed study notes from this content:\n\n{content}\n\nInclude:\n- Main concepts and definitions\n- Key points to remember\n- Examples and applications\n- Summary at the end',
    variables: {
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    shortcuts: ['/notes', '/study'],
    icon: '📓',
    isBuiltIn: true
  },
  
  {
    id: 'practice-problems',
    name: 'Generate Practice Problems',
    description: 'Create practice problems based on content',
    category: 'learning',
    template: 'Generate {count} practice problems based on this topic:\n\n{content}\n\nProvide:\n- Problem statement\n- Hints (if needed)\n- Step-by-step solution',
    variables: {
      count: {
        type: 'number',
        source: 'user',
        default: 3,
        required: false
      },
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      }
    },
    model: 'deepseek-reasoner',
    shortcuts: ['/practice', '/problems'],
    icon: '🧮',
    isBuiltIn: true
  },

  // ========== Utility Templates ==========
  {
    id: 'translate',
    name: 'Translate',
    description: 'Translate selected text',
    category: 'utility',
    template: 'Translate this text to {language}:\n\n{text}\n\nProvide a natural, accurate translation.',
    variables: {
      text: {
        type: 'text',
        source: 'selection',
        required: true
      },
      language: {
        type: 'text',
        source: 'user',
        required: true,
        description: 'Target language (e.g., Spanish, French, Chinese)'
      }
    },
    shortcuts: ['/translate'],
    icon: '🌐',
    isBuiltIn: true
  },
  
  {
    id: 'define',
    name: 'Define Term',
    description: 'Get a definition of a term or concept',
    category: 'utility',
    template: 'Define "{term}" in the context of {context}. Provide:\n- Clear definition\n- Examples if applicable\n- Related terms',
    variables: {
      term: {
        type: 'text',
        source: 'selection',
        required: true
      },
      context: {
        type: 'text',
        source: 'page',
        field: 'title',
        required: false,
        default: 'this page'
      }
    },
    shortcuts: ['/define', '/what'],
    icon: '📖',
    isBuiltIn: true
  },
  
  {
    id: 'generate-title',
    name: 'Generate Title',
    description: 'Create a title for the content',
    category: 'utility',
    template: 'Generate {count} compelling titles for this content:\n\n{content}\n\nMake them {style}.',
    variables: {
      count: {
        type: 'number',
        source: 'user',
        default: 5,
        required: false
      },
      content: {
        type: 'text',
        source: 'context',
        path: 'content',
        required: true
      },
      style: {
        type: 'select',
        source: 'user',
        options: ['catchy', 'professional', 'descriptive', 'creative', 'SEO-friendly'],
        default: 'catchy',
        required: false
      }
    },
    shortcuts: ['/title', '/headline'],
    icon: '🏷️',
    isBuiltIn: true
  }
];

/**
 * Get templates by category
 * @param {string} category - Category name
 * @returns {Array} Templates in category
 */
export function getTemplatesByCategory(category) {
  return builtInTemplates.filter(template => template.category === category);
}

/**
 * Get all categories
 * @returns {Array} Category names
 */
export function getCategories() {
  const categories = new Set(builtInTemplates.map(t => t.category));
  return Array.from(categories).sort();
}

/**
 * Search templates
 * @param {string} query - Search query
 * @returns {Array} Matching templates
 */
export function searchTemplates(query) {
  const lowerQuery = query.toLowerCase();
  
  return builtInTemplates.filter(template => {
    return (
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.shortcuts.some(s => s.toLowerCase().includes(lowerQuery)) ||
      template.category.toLowerCase().includes(lowerQuery)
    );
  });
}