export const colors = {
  background: '#050816',
  backgroundDeep: '#02040D',
  backgroundElevated: '#0A1025',
  surface: '#101938',
  surfaceMuted: '#151F42',
  cyan: '#5DEBFF',
  cyanSoft: '#9AF5FF',
  violet: '#A884FF',
  violetSoft: '#C8B4FF',
  textPrimary: '#F7FAFF',
  textSecondary: '#A9B4D0',
  textMuted: '#707D9E',
  border: 'rgba(138, 230, 255, 0.18)',
  borderStrong: 'rgba(138, 230, 255, 0.34)',
  cyanGlow: 'rgba(93, 235, 255, 0.22)',
  violetGlow: 'rgba(168, 132, 255, 0.18)',
  whiteGlow: 'rgba(255, 255, 255, 0.7)',
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
    eyebrow: 11,
    body: 16,
    bodyLarge: 19,
    title: 56,
  },
  lineHeight: {
    eyebrow: 16,
    body: 24,
    bodyLarge: 28,
    title: 62,
  },
  weight: {
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  tracking: {
    eyebrow: 2.4,
    title: -2.2,
  },
} as const;

export const layout = {
  compactBreakpoint: 380,
  horizontalPadding: spacing.lg,
  horizontalPaddingCompact: spacing.md,
  maxContentWidth: 560,
  minTouchTarget: 48,
} as const;

export const shadows = {
  cyanGlow: {
    elevation: 8,
    shadowColor: colors.cyan,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  panel: {
    elevation: 5,
    shadowColor: colors.backgroundDeep,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
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
