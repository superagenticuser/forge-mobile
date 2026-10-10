// FORGE dark theme. Ported from the web app (superagenticuser/gym-3d) so the
// React Native port shares the same visual identity.
//
// `colors` holds the static palette. The accent (web: --volt) is dynamic and
// comes from the settings provider via useTheme(); `buildTheme` resolves the
// full theme including big-text scaling and high-contrast adjustments.
import type { TextStyle } from 'react-native';

export interface AccentDef {
  id: string;
  name: string;
  color: string;
  ink: string;
}

/** The six accents, exact values from the web app (js/core.js ACCENTS). */
export const ACCENTS: AccentDef[] = [
  { id: 'volt', name: 'Volt', color: '#d4ff3f', ink: '#0b0d12' },
  { id: 'ember', name: 'Ember', color: '#ff7847', ink: '#0b0d12' },
  { id: 'aqua', name: 'Aqua', color: '#38e1ff', ink: '#0b0d12' },
  { id: 'violet', name: 'Violet', color: '#b49aff', ink: '#0b0d12' },
  { id: 'crimson', name: 'Crimson', color: '#ff4d6d', ink: '#ffffff' },
  { id: 'gold', name: 'Gold', color: '#ffd23f', ink: '#0b0d12' },
];

export function getAccent(id: string): AccentDef {
  return ACCENTS.find((a) => a.id === id) ?? ACCENTS[0];
}

/** Static palette. `volt`/`accent` are resolved dynamically via buildTheme. */
export const colors = {
  bg: '#0b0d12',
  surface: '#13161e',
  ink: '#f2f4f8',
  muted: '#9aa3b5',
  line: '#232936',
  ember: '#ff5c1a',
  gold: '#ffd23f',
  warn: '#f59e0b',
} as const;

export interface ThemeColors {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  ember: string;
  gold: string;
  warn: string;
  /** Current accent color (web: --volt). */
  volt: string;
  /** Alias of volt. */
  accent: string;
  /** Ink color for text drawn on the accent. */
  accentInk: string;
}

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

export interface TypeScale {
  hero: TextStyle;
  title: TextStyle;
  subtitle: TextStyle;
  body: TextStyle;
  caption: TextStyle;
  chip: TextStyle;
}

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

export const type: TypeScale = { hero, title, subtitle, body, caption, chip };

export interface ThemeOptions {
  accentId: string;
  bigText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface Theme {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  type: TypeScale;
  bigText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
}

const BIG_TEXT_SCALE = 1.125;

function scaleType(scale: TypeScale, factor: number): TypeScale {
  const out = {} as TypeScale;
  (Object.keys(scale) as (keyof TypeScale)[]).forEach((key) => {
    const style = scale[key];
    const next: TextStyle = { ...style };
    if (typeof next.fontSize === 'number') {
      next.fontSize = Math.round(next.fontSize * factor);
    }
    if (typeof next.lineHeight === 'number') {
      next.lineHeight = Math.round(next.lineHeight * factor);
    }
    out[key] = next;
  });
  return out;
}

/**
 * Resolve the full dynamic theme from settings. Mirrors the web app's
 * applyAccent/applyA11y: the accent drives --volt app-wide, big-text scales
 * type, high-contrast brightens ink/muted/line.
 */
export function buildTheme(options: ThemeOptions): Theme {
  const accent = getAccent(options.accentId);
  const ink = options.highContrast ? '#ffffff' : colors.ink;
  const muted = options.highContrast ? '#c8d0e0' : colors.muted;
  const line = options.highContrast ? '#3a4358' : colors.line;
  const scaled = options.bigText ? scaleType(type, BIG_TEXT_SCALE) : type;
  // Rebind text colors so big-text/high-contrast apply to the type scale.
  const recolored = { ...scaled };
  recolored.hero = { ...scaled.hero, color: ink };
  recolored.title = { ...scaled.title, color: ink };
  recolored.subtitle = { ...scaled.subtitle, color: ink };
  recolored.body = { ...scaled.body, color: ink };
  recolored.caption = { ...scaled.caption, color: muted };
  recolored.chip = { ...scaled.chip, color: ink };
  return {
    colors: {
      ...colors,
      ink,
      muted,
      line,
      volt: accent.color,
      accent: accent.color,
      accentInk: accent.ink,
    },
    spacing,
    radius,
    type: recolored,
    bigText: options.bigText,
    highContrast: options.highContrast,
    reduceMotion: options.reduceMotion,
  };
}
