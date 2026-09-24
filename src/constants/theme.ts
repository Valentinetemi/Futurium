export const colors = {
  background: '#F7F4EC',
  surface: '#FFFEFA',
  text: '#17201B',
  textSecondary: '#68736C',
  primary: '#285447',
  onPrimary: '#FFFFFF',
  memoryBlue: '#52718A',
  sage: '#DFE9E2',
  apricot: '#E6A276',
  error: '#B95751',
  border: '#D8D7CF',

  // Camera surfaces keep the video legible without tinting it.
  camera: '#111613',
  cameraPlate: 'rgba(17, 22, 19, 0.78)',
  cameraBorder: 'rgba(255, 255, 255, 0.55)',
  cameraText: '#FFFFFF',
  cameraTextSecondary: 'rgba(255, 255, 255, 0.8)',
  errorOnDark: '#F2BDB8',
  backdrop: 'rgba(23, 32, 27, 0.5)',
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
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

export const typography = {
  size: {
    caption: 14,
    small: 16,
    body: 18,
    bodyLarge: 20,
    title: 24,
    heading: 30,
    display: 36,
  },
  lineHeight: {
    caption: 20,
    small: 23,
    body: 26,
    bodyLarge: 28,
    title: 31,
    heading: 37,
    display: 43,
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
  maxContentWidth: 640,
  minTouchTarget: 48,
  buttonHeight: 58,
} as const;

export const shadows = {
  subtle: {
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
