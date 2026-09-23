export const colors = {
  canvas: '#F4F3EE',
  canvasMuted: '#ECEAE3',
  surface: '#FFFFFF',
  ink: '#17201B',
  inkSoft: '#3E4943',
  muted: '#737E78',
  faint: '#9BA39F',
  line: '#D9DDD7',
  lineStrong: '#C5CCC6',
  sage: '#617C6E',
  sageDark: '#30483C',
  sageSoft: '#DDE8E1',
  mint: '#BDD2C6',
  sand: '#E7DFD2',
  camera: '#101411',
  cameraSoft: '#202721',
  white: '#FAFBF9',
  danger: '#A9534D',
  dangerSoft: '#F3E0DD',
  shadow: 'rgba(25, 36, 30, 0.12)',
  overlay: 'rgba(10, 14, 11, 0.42)',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const typography = {
  size: {
    caption: 11,
    bodySmall: 14,
    body: 16,
    bodyLarge: 19,
    heading: 30,
    display: 48,
  },
  lineHeight: {
    caption: 16,
    bodySmall: 20,
    body: 24,
    bodyLarge: 28,
    heading: 36,
    display: 52,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export const layout = {
  compactBreakpoint: 380,
  horizontalPadding: spacing.lg,
  horizontalPaddingCompact: spacing.md,
  maxContentWidth: 720,
  minTouchTarget: 48,
} as const;

export const shadows = {
  card: {
    elevation: 3,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  floating: {
    elevation: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
} as const;

export const theme = {
  colors,
  layout,
  radii,
  shadows,
  spacing,
  typography,
} as const;
