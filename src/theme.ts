// FORGE dark theme. Ported from the web app (superagenticuser/gym-3d) so the
// React Native experiment shares the same visual identity.
import type { TextStyle } from 'react-native';

export const colors = {
  bg: '#0b0d12',
  surface: '#13161e',
  ink: '#f2f4f8',
  muted: '#9aa3b5',
  line: '#232936',
  ember: '#ff5c1a',
  volt: '#d4ff3f',
  gold: '#ffd23f',
  warn: '#f59e0b',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

const hero: TextStyle = {
  fontSize: 34,
  fontWeight: '800',
  letterSpacing: 3,
  color: colors.ink,
};
const title: TextStyle = { fontSize: 22, fontWeight: '700', color: colors.ink };
const subtitle: TextStyle = {
  fontSize: 16,
  fontWeight: '600',
  color: colors.ink,
};
const body: TextStyle = { fontSize: 14, lineHeight: 21, color: colors.ink };
const caption: TextStyle = {
  fontSize: 12,
  lineHeight: 17,
  color: colors.muted,
};
const chip: TextStyle = { fontSize: 13, fontWeight: '600', color: colors.ink };

export const type = { hero, title, subtitle, body, caption, chip };
