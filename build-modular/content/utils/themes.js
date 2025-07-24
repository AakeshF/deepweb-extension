/**
 * Built-in themes for DeepWeb Extension
 * Defines theme structure and default themes
 */

/**
 * Theme structure definition
 */
export const themeSchema = {
  name: 'string',
  description: 'string',
  mode: 'string', // 'light', 'dark', 'auto'
  colors: {
    primary: 'string',
    secondary: 'string',
    accent: 'string',
    error: 'string',
    warning: 'string',
    info: 'string',
    success: 'string',
    background: {
      default: 'string',
      paper: 'string',
      elevated: 'string'
    },
    surface: {
      default: 'string',
      variant: 'string'
    },
    text: {
      primary: 'string',
      secondary: 'string',
      disabled: 'string',
      hint: 'string'
    },
    divider: 'string',
    overlay: 'string',
    shadow: 'string'
  },
  typography: {
    fontFamily: {
      base: 'string',
      mono: 'string'
    },
    fontSize: {
      xs: 'string',
      sm: 'string',
      base: 'string',
      lg: 'string',
      xl: 'string',
      '2xl': 'string',
      '3xl': 'string'
    },
    fontWeight: {
      light: 'string',
      normal: 'string',
      medium: 'string',
      semibold: 'string',
      bold: 'string'
    },
    lineHeight: {
      tight: 'string',
      normal: 'string',
      relaxed: 'string'
    }
  },
  spacing: {
    xs: 'string',
    sm: 'string',
    md: 'string',
    lg: 'string',
    xl: 'string',
    '2xl': 'string',
    '3xl': 'string'
  },
  borders: {
    radius: {
      sm: 'string',
      md: 'string',
      lg: 'string',
      full: 'string'
    },
    width: {
      thin: 'string',
      medium: 'string',
      thick: 'string'
    }
  },
  shadows: {
    sm: 'string',
    md: 'string',
    lg: 'string',
    xl: 'string'
  },
  animations: {
    duration: {
      fast: 'string',
      normal: 'string',
      slow: 'string'
    },
    easing: {
      default: 'string',
      in: 'string',
      out: 'string',
      inOut: 'string'
    }
  }
};

/**
 * Light theme (default)
 */
export const lightTheme = {
  name: 'Light',
  description: 'Clean and bright theme for daytime use',
  mode: 'light',
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    accent: '#9c27b0',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3',
    success: '#4caf50',
    background: {
      default: '#ffffff',
      paper: '#f5f5f5',
      elevated: '#fafafa'
    },
    surface: {
      default: '#ffffff',
      variant: '#f0f0f0'
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
      hint: 'rgba(0, 0, 0, 0.38)'
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.2)'
  },
  typography: {
    fontFamily: {
      base: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },
  borders: {
    radius: {
      sm: '0.25rem',
      md: '0.375rem',
      lg: '0.5rem',
      full: '9999px'
    },
    width: {
      thin: '1px',
      medium: '2px',
      thick: '4px'
    }
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms'
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
};

/**
 * Dark theme
 */
export const darkTheme = {
  name: 'Dark',
  description: 'Easy on the eyes for nighttime use',
  mode: 'dark',
  colors: {
    primary: '#90caf9',
    secondary: '#f48fb1',
    accent: '#ce93d8',
    error: '#f44336',
    warning: '#ff9800',
    info: '#29b6f6',
    success: '#66bb6a',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
      elevated: '#242424'
    },
    surface: {
      default: '#1e1e1e',
      variant: '#2a2a2a'
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      hint: 'rgba(255, 255, 255, 0.38)'
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    overlay: 'rgba(0, 0, 0, 0.7)',
    shadow: 'rgba(0, 0, 0, 0.5)'
  },
  typography: {
    ...lightTheme.typography
  },
  spacing: {
    ...lightTheme.spacing
  },
  borders: {
    ...lightTheme.borders
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
  },
  animations: {
    ...lightTheme.animations
  }
};

/**
 * Sepia theme (for reading comfort)
 */
export const sepiaTheme = {
  name: 'Sepia',
  description: 'Warm tones for comfortable reading',
  mode: 'light',
  colors: {
    primary: '#8b4513',
    secondary: '#a0522d',
    accent: '#d2691e',
    error: '#dc143c',
    warning: '#ff8c00',
    info: '#4682b4',
    success: '#228b22',
    background: {
      default: '#f4ecd8',
      paper: '#ede4c9',
      elevated: '#f8f0dc'
    },
    surface: {
      default: '#f4ecd8',
      variant: '#e8dcc0'
    },
    text: {
      primary: '#3e2723',
      secondary: '#5d4037',
      disabled: 'rgba(62, 39, 35, 0.5)',
      hint: 'rgba(62, 39, 35, 0.5)'
    },
    divider: 'rgba(62, 39, 35, 0.2)',
    overlay: 'rgba(62, 39, 35, 0.5)',
    shadow: 'rgba(62, 39, 35, 0.3)'
  },
  typography: {
    fontFamily: {
      base: 'Georgia, "Times New Roman", Times, serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace'
    },
    fontSize: {
      ...lightTheme.typography.fontSize
    },
    fontWeight: {
      ...lightTheme.typography.fontWeight
    },
    lineHeight: {
      tight: '1.4',
      normal: '1.6',
      relaxed: '1.8'
    }
  },
  spacing: {
    ...lightTheme.spacing
  },
  borders: {
    ...lightTheme.borders
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(62, 39, 35, 0.1)',
    md: '0 4px 6px -1px rgba(62, 39, 35, 0.15), 0 2px 4px -1px rgba(62, 39, 35, 0.1)',
    lg: '0 10px 15px -3px rgba(62, 39, 35, 0.15), 0 4px 6px -2px rgba(62, 39, 35, 0.1)',
    xl: '0 20px 25px -5px rgba(62, 39, 35, 0.15), 0 10px 10px -5px rgba(62, 39, 35, 0.1)'
  },
  animations: {
    ...lightTheme.animations
  }
};

/**
 * High contrast theme (for accessibility)
 */
export const highContrastTheme = {
  name: 'High Contrast',
  description: 'Maximum contrast for better visibility',
  mode: 'dark',
  colors: {
    primary: '#ffffff',
    secondary: '#ffff00',
    accent: '#00ffff',
    error: '#ff0000',
    warning: '#ff8c00',
    info: '#00bfff',
    success: '#00ff00',
    background: {
      default: '#000000',
      paper: '#0a0a0a',
      elevated: '#141414'
    },
    surface: {
      default: '#000000',
      variant: '#1a1a1a'
    },
    text: {
      primary: '#ffffff',
      secondary: '#e0e0e0',
      disabled: '#808080',
      hint: '#808080'
    },
    divider: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.9)',
    shadow: 'rgba(255, 255, 255, 0.2)'
  },
  typography: {
    fontFamily: {
      base: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
      mono: 'Consolas, "Courier New", Courier, monospace'
    },
    fontSize: {
      xs: '0.875rem',
      sm: '1rem',
      base: '1.125rem',
      lg: '1.25rem',
      xl: '1.5rem',
      '2xl': '1.75rem',
      '3xl': '2rem'
    },
    fontWeight: {
      light: '400',
      normal: '500',
      medium: '600',
      semibold: '700',
      bold: '800'
    },
    lineHeight: {
      tight: '1.3',
      normal: '1.6',
      relaxed: '1.9'
    }
  },
  spacing: {
    ...lightTheme.spacing
  },
  borders: {
    radius: {
      sm: '0',
      md: '0',
      lg: '0',
      full: '0'
    },
    width: {
      thin: '2px',
      medium: '3px',
      thick: '5px'
    }
  },
  shadows: {
    sm: 'none',
    md: 'none',
    lg: 'none',
    xl: 'none'
  },
  animations: {
    duration: {
      fast: '0ms',
      normal: '0ms',
      slow: '0ms'
    },
    easing: {
      default: 'linear',
      in: 'linear',
      out: 'linear',
      inOut: 'linear'
    }
  }
};

/**
 * All built-in themes
 */
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  sepia: sepiaTheme,
  'high-contrast': highContrastTheme
};

/**
 * Validate theme structure
 * @param {Object} theme - Theme to validate
 * @returns {boolean} Is valid theme
 */
export function validateTheme(theme) {
  if (!theme || typeof theme !== 'object') {
    return false;
  }

  // Check required top-level properties
  const requiredProps = ['name', 'colors'];
  for (const prop of requiredProps) {
    if (!theme[prop]) {
      console.error(`Theme missing required property: ${prop}`);
      return false;
    }
  }

  // Validate colors structure
  if (!theme.colors.primary || !theme.colors.background || !theme.colors.text) {
    console.error('Theme missing required color properties');
    return false;
  }

  // Validate nested color objects
  if (!theme.colors.background.default || !theme.colors.text.primary) {
    console.error('Theme missing required nested color properties');
    return false;
  }

  return true;
}

/**
 * Get default theme settings
 * @returns {Object} Default settings
 */
export function getDefaultThemeSettings() {
  return {
    currentTheme: 'light',
    followSystemTheme: true,
    enableTransitions: true,
    transitionDuration: 300,
    customThemes: []
  };
}

/**
 * Merge partial theme with base theme
 * @param {Object} baseTheme - Base theme
 * @param {Object} partialTheme - Partial theme to merge
 * @returns {Object} Merged theme
 */
export function mergeThemes(baseTheme, partialTheme) {
  const merged = JSON.parse(JSON.stringify(baseTheme)); // Deep clone
  
  function deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  
  deepMerge(merged, partialTheme);
  return merged;
}

/**
 * Create theme from color palette
 * @param {Object} palette - Color palette
 * @param {string} baseTheme - Base theme ID
 * @returns {Object} Generated theme
 */
export function createThemeFromPalette(palette, baseTheme = 'light') {
  const base = themes[baseTheme] || lightTheme;
  
  return mergeThemes(base, {
    name: 'Custom Theme',
    colors: {
      primary: palette.primary,
      secondary: palette.secondary || palette.primary,
      accent: palette.accent || palette.secondary || palette.primary,
      background: palette.background || base.colors.background,
      text: palette.text || base.colors.text
    }
  });
}