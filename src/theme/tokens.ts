/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const theme = {
  colors: {
    bgBase: '#121110',
    bgSecondary: '#181715',
    bgPanel: '#1F1D1B',
    bgElevated: '#252320',
    bgHover: '#2B2825',
    bgActive: '#2B2825',

    borderSubtle: 'rgba(255,248,235,0.08)',
    borderMuted: 'rgba(255,248,235,0.08)',
    borderActive: 'rgba(255,248,235,0.15)',
    divider: 'rgba(255,248,235,0.05)',

    // Warm translucent surfaces
    glassPanel: 'rgba(28, 25, 23, 0.72)',
    glassCard: 'transparent',
    glassBorder: 'rgba(255,248,235,0.08)',

    textPrimary: '#F1ECE3',
    textSecondary: '#C8C1B6',
    textMuted: '#928A80',
    textDisabled: '#6F685F',

    accent: '#F4EFE5',
    accentHover: '#F4EFE5', // Warm ivory
    accentActive: '#DDD2C2', // Warm beige
    accentGlow: 'rgba(255, 248, 235, 0.05)',
    accentFocus: 'rgba(255, 248, 235, 0.12)',

    meaning: {
      star: '#F4EFE5',       // Warm glowing ivory
      collision: '#D46220',  // Burnt orange
      warning: '#B47124',    // Muted amber
      success: '#596541',    // Muted olive green
      error: '#8A2E2E',      // Deep brick red
      info: '#A79A87',       // Dust
      blackHole: '#8A6D45',  // Bronze
    }
  },
  typography: {
    fontSans: "'Inter', sans-serif",
    fontHeading: "'Playfair Display', 'Cormorant Garamond', 'Georgia', serif",
    fontMono: "'JetBrains Mono', monospace",
  },
  radii: {
    sm: '0px',
    md: '2px',
    lg: '4px',
    full: '9999px',
  },
  shadows: {
    panel: '0 20px 60px rgba(10, 8, 6, 0.8)',
    innerHighlight: 'none',
    button: '0 2px 8px rgba(10, 8, 6, 0.6)',
  },
  animations: {
    duration: '200ms',
    easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  }
};
export type Theme = typeof theme;
