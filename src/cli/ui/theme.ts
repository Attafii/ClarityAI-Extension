export const THEME = {
  amethyst: {
    primary: '#9966CC',
    light: '#B088DD',
    dark: '#7744AA',
    glow: '#CC99EE',
  },
  obsidian: {
    primary: '#1A1A1A',
    secondary: '#2D2D2D',
    tertiary: '#3D3D3D',
    border: '#4A4A4A',
    text: '#E8E8E8',
    muted: '#888888',
  },
  success: '#44CC88',
  warning: '#CCAA44',
  error: '#CC4444',
  info: '#4488CC',
} as const;

export type ThemeColors = typeof THEME;

export const STYLING = {
  borderRadius: 12,
  boxPadding: 1,
  animationSpeed: 'normal',
  maxWidth: 100,
  minWidth: 60,
} as const;

export const ICONS = {
  star: '✦',
  spark: '◈',
  shield: '◇',
  bolt: '⬡',
  check: '✓',
  chevron: '›',
} as const;