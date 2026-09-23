export const colors = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F8F9FC',
  text: '#101828',
  textSecondary: '#667085',
  textTertiary: '#98A2B3',
  border: '#EAECF0',
  borderStrong: '#D0D5DD',
  primary: '#111827',
  primarySoft: '#F2F4F7',
  accent: '#2563EB',
  success: '#12B76A',
  successSoft: '#ECFDF3',
  warning: '#F79009',
  warningSoft: '#FFFAEB',
  danger: '#F04438',
  dangerSoft: '#FEF3F2',
  white: '#FFFFFF',
  black: '#000000',
} as const

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' as const },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '800' as const },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '600' as const },
  overline: { fontSize: 11, lineHeight: 16, fontWeight: '800' as const, letterSpacing: 1.1 },
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const

export const shadow = {
  card: {
    shadowColor: '#101828',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const
