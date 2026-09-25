export const colors = {
  background: '#F7F3EA',
  surface: '#FFFEFA',
  text: '#15191E',
  textSecondary: '#68727A',
  primary: '#274C67',
  onPrimary: '#FFFFFF',
  // Secondary blue and the warm accent are for lines, dots and icons only;
  // neither has enough contrast for text on the cream background.
  secondaryBlue: '#5F7F95',
  softBlue: '#DFE9EF',
  accent: '#D99168',
  error: '#B95751',
  border: '#D6D9D8',

  // Camera surfaces keep the video legible without tinting it.
  camera: '#111418',
  cameraPlate: 'rgba(17, 20, 24, 0.78)',
  cameraBorder: 'rgba(255, 255, 255, 0.55)',
  cameraText: '#FFFFFF',
  cameraTextSecondary: 'rgba(255, 255, 255, 0.8)',
  errorOnDark: '#F2BDB8',
  backdrop: 'rgba(21, 25, 30, 0.5)',
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
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

export const typography = {
  size: {
    caption: 13,
    small: 15,
    body: 17,
    lead: 19,
    title: 21,
    heading: 26,
  },
  lineHeight: {
    caption: 18,
    small: 21,
    body: 24,
    lead: 26,
    title: 27,
    heading: 32,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  // Dynamic Type still applies, but is capped so the largest settings do not
  // push controls off screen. Headings are capped harder than body text.
  maxScale: {
    body: 1.5,
    heading: 1.25,
    control: 1.3,
  },
} as const;

export const layout = {
  compactBreakpoint: 380,
  horizontalPadding: spacing.lg,
  horizontalPaddingCompact: spacing.md,
  maxContentWidth: 640,
  minTouchTarget: 44,
  buttonHeight: 52,
} as const;

export const shadows = {
  subtle: {
    elevation: 1,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
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
