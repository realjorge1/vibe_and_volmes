/**
 * "Neon Stage" design tokens — the single source of truth for the look.
 *
 * A console-grade dark UI: a deep indigo canvas under soft stage light,
 * glass surfaces, a violet → pink → cyan brand gradient, clay-3D icons, and
 * springy motion. Depth comes from real shadows, not colored glows.
 */

export const COLORS = {
  // Canvas — deep indigo-black; the ambient stage light is painted over it.
  bg: '#07060E',
  bgDeep: '#030208',
  // Glass surfaces are translucent so the stage light bleeds through.
  surface: 'rgba(28,24,54,0.62)',
  surface2: 'rgba(44,38,82,0.66)',
  surface3: 'rgba(70,62,122,0.45)',
  // Opaque surface for anything that floats over content (toasts, sheets).
  surfaceSolid: '#14112A',
  border: 'rgba(255,255,255,0.09)',
  borderLight: 'rgba(255,255,255,0.18)',

  // Brand.
  primary: '#8B6CFF',
  primaryPressed: '#6E4DF5',
  secondary: '#FF4FA3',
  accent: '#36D6FF',
  warning: '#FFB347',
  gold: '#FFCE5C',

  // Sentiment.
  positive: '#3BE8A6',
  negative: '#FF5470',
  neutral: '#8A87A8',

  // Text ramp — white → lavender gray → faint.
  text: '#FFFFFF',
  textSecondary: '#B9B5D6',
  textMuted: '#77739A',
  textDisabled: '#3B3858',

  // Platform colors.
  chirper: '#4DA8FF',
  flashpic: '#FF5FA2',
  tunetok: '#2FE6D2',
  vibestream: '#A08BFF',

  // Overlays / scrims for modals.
  overlay: 'rgba(4,3,10,0.88)',
  scrim: 'rgba(4,3,10,0.66)',

  // Additive tints (hairlines / pressed states / glass highlights).
  glass: 'rgba(255,255,255,0.05)',
  glassStrong: 'rgba(255,255,255,0.09)',
  hairline: 'rgba(255,255,255,0.08)',
} as const;

type Stops = readonly [string, string, ...string[]];

/** Gradient stops, top-left → bottom-right unless a component says otherwise. */
export const GRADIENTS = {
  brand: ['#FF4FA3', '#8B6CFF', '#36D6FF'],
  primary: ['#A68CFF', '#6A45F5'],
  violet: ['#B79CFF', '#7B5CFF'],
  pink: ['#FF7EBD', '#E8367F'],
  gold: ['#FFE48F', '#FFAE3B'],
  teal: ['#5CF2E0', '#2AA8F0'],
  fire: ['#FFB347', '#FF5470'],
  mint: ['#7CF5C8', '#1FC98A'],
  danger: ['#FF7A8C', '#E3355A'],
  dark: ['#1B1636', '#0C0A1C'],
  card: ['rgba(46,40,88,0.72)', 'rgba(20,17,42,0.72)'],
  cardSolid: ['#221C44', '#110E24'],
  sheen: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)'],
} as const satisfies Record<string, Stops>;

/**
 * Elevation. `boxShadow` (new architecture) is drawn only outside the view,
 * so it stays clean behind translucent glass.
 */
export const SHADOW = {
  none: {},
  sm: { boxShadow: '0px 4px 12px rgba(0,0,0,0.35)' },
  md: { boxShadow: '0px 10px 24px rgba(0,0,0,0.45)' },
  lg: { boxShadow: '0px 18px 40px rgba(0,0,0,0.55)' },
} as const;

/** Motion — springy and physical, like a console UI. */
export const MOTION = {
  fast: 120,
  base: 220,
  slow: 420,
  spring: { damping: 15, stiffness: 190, mass: 0.9 },
  springSoft: { damping: 18, stiffness: 120, mass: 1 },
  pressScale: 0.965,
} as const;

/**
 * Master switch for every animation in the app. Off for now; flip to true to
 * bring them all back. With it off, the root layout puts Reanimated in
 * reduced-motion mode (every animation jumps straight to its end state),
 * screens and modals change with no transition, and the motion that isn't
 * Reanimated holds still: the stage's clock, number count-ups, photo
 * cross-fades, video clips and the week-turn overlay.
 */
export const ANIMATIONS_ENABLED = false;

/** An `entering` animation that only plays when ANIMATIONS_ENABLED is on. */
export function ifAnimated<T>(animation: T): T | undefined {
  return ANIMATIONS_ENABLED ? animation : undefined;
}

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
    '4xl': 52,
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
  /** Loaded in app/_layout.tsx; resolved per weight by the Text component. */
  families: {
    display: {
      '400': 'Unbounded_400Regular',
      '500': 'Unbounded_500Medium',
      '600': 'Unbounded_600SemiBold',
      '700': 'Unbounded_700Bold',
      '800': 'Unbounded_800ExtraBold',
      '900': 'Unbounded_900Black',
    },
    body: {
      '400': 'Inter_400Regular',
      '500': 'Inter_500Medium',
      '600': 'Inter_600SemiBold',
      '700': 'Inter_700Bold',
      '800': 'Inter_800ExtraBold',
      '900': 'Inter_900Black',
    },
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
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
} as const;

/** `#RGB`, `#RRGGBB`, `rgb()` or `rgba()` → the same color at `alpha`. */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((s) => s.trim());
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

/** Mix a hex color toward white (amount > 0) or black (amount < 0). */
export function shade(color: string, amount: number): string {
  if (!color.startsWith('#')) return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex.slice(0, 6), 16);
  const target = amount > 0 ? 255 : 0;
  const t = Math.min(1, Math.abs(amount));
  const mix = (c: number) => Math.round(c + (target - c) * t);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
