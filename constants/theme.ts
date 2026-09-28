/**
 * "Tesla OS" design tokens — the single source of truth for the redesign.
 *
 * Principles: pure-black canvas, white text, ONE cool accent (electric blue),
 * flat surfaces separated by hairlines (not drop shadows or gradients), tight
 * radii, large legible tabular numbers, generous negative space. Calm, premium,
 * engineering-grade. No red brand color, no glows, no glassy rounding.
 */

export const COLORS = {
  // Core canvas — true black, surfaces are barely-lifted near-blacks.
  bg: '#000000',
  surface: '#0B0B0C',
  surface2: '#141518',
  surface3: '#1C1E22',
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.16)',

  // Brand — a single electric blue accent carries everything.
  primary: '#2E8DFF',
  primaryPressed: '#1E6FE0',
  // Legacy aliases kept so existing call sites stay valid; all point cool now.
  secondary: '#5AA9FF',
  accent: '#2E8DFF',
  warning: '#E0A53B',
  gold: '#D9C77E',

  // Sentiment — desaturated, for DATA only (never decoration).
  positive: '#3FB87F',
  negative: '#E5544B',
  neutral: '#7C8694',

  // Text ramp — white → muted gray → faint.
  text: '#FFFFFF',
  textSecondary: '#9BA1A8',
  textMuted: '#5C636B',
  textDisabled: '#34383E',

  // Platform colors — desaturated so Social stays legible on black.
  chirper: '#4A9FE0',
  flashpic: '#C75C86',
  tunetok: '#3FC5BC',
  vibestream: '#7E8BE0',

  // Overlays / scrims for modals.
  overlay: 'rgba(0,0,0,0.92)',
  scrim: 'rgba(0,0,0,0.66)',

  // Subtle additive tints (hairlines / pressed states).
  glass: 'rgba(255,255,255,0.04)',
  glassStrong: 'rgba(255,255,255,0.07)',
  hairline: 'rgba(255,255,255,0.08)',
} as const;

/**
 * Deprecated: gradients are not used in the Tesla-OS look (flat fills only).
 * Kept as a shim — each entry collapses to a single flat color so any lingering
 * call site renders flat instead of breaking.
 */
export const GRADIENTS = {
  primary: ['#2E8DFF', '#2E8DFF'] as const,
  violet: ['#5AA9FF', '#5AA9FF'] as const,
  gold: ['#D9C77E', '#D9C77E'] as const,
  teal: ['#2E8DFF', '#2E8DFF'] as const,
  dark: ['#141518', '#0B0B0C'] as const,
} as const;

/**
 * Elevation — flat. Depth comes from hairlines + spacing, not shadow. `sm` is a
 * barely-there lift for the rare floating element; `glow` is intentionally a
 * no-op alias of `sm` so old references don't reintroduce glows.
 */
export const SHADOW = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  // No-op alias (was a colored glow) — keeps call sites flat.
  glow: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
} as const;

/** Motion — calm and precise, not springy. */
export const MOTION = {
  fast: 120,
  base: 200,
  slow: 360,
  spring: { damping: 22, stiffness: 240, mass: 0.8 },
  pressScale: 0.98,
} as const;

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 40,
    '4xl': 56,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
  tracking: {
    tight: -1.0,
    snug: -0.3,
    normal: 0,
    wide: 0.6,
    wider: 1.6,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  '2xl': 44,
  '3xl': 64,
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  // `xl` kept for compatibility but tightened — no more glassy rounding.
  xl: 14,
  full: 999,
} as const;
