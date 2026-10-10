import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { COLORS, FONTS } from '../../constants/theme';

type Variant =
  | 'display'
  | 'metric'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'caption'
  | 'label';

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  muted?: boolean;
  weight?: keyof typeof FONTS.weights;
  center?: boolean;
}

const VARIANT_STYLE: Record<Variant, TextStyle> = {
  // Hero numbers.
  display: {
    fontSize: FONTS.sizes['4xl'],
    fontWeight: '800',
    lineHeight: FONTS.sizes['4xl'] * 1.12,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  // Large data readout (metrics, money, fans).
  metric: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 19 * 1.28,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 19 * 1.3,
    letterSpacing: -0.4,
  },
  heading: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    lineHeight: FONTS.sizes.md * 1.28,
    letterSpacing: -0.2,
  },
  subheading: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    lineHeight: FONTS.sizes.base * 1.34,
  },
  body: {
    fontSize: FONTS.sizes.base,
    fontWeight: '400',
    lineHeight: FONTS.sizes.base * 1.48,
  },
  caption: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '400',
    lineHeight: FONTS.sizes.sm * 1.42,
  },
  // Tiny all-caps eyebrow label.
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '700',
    letterSpacing: FONTS.tracking.wider,
  },
};

const DISPLAY_VARIANTS: ReadonlySet<Variant> = new Set(['display', 'metric', 'title']);

type WeightKey = keyof typeof FONTS.families.body;

function weightKey(w: TextStyle['fontWeight']): WeightKey {
  if (w === 'bold') return '700';
  const n = typeof w === 'number' ? w : parseInt(String(w ?? '400'), 10);
  if (!Number.isFinite(n) || n <= 400) return '400';
  if (n >= 900) return '900';
  return String(Math.round(n / 100) * 100) as WeightKey;
}

/**
 * The one text component. Display variants set in Unbounded, everything else
 * in Inter; the weight (from the variant, `weight`, or a style override) picks
 * the matching font file, because Android cannot synthesize custom weights.
 */
export function Text({
  variant = 'body',
  color,
  muted,
  weight,
  center,
  style,
  ...rest
}: Props) {
  const flat = StyleSheet.flatten([
    VARIANT_STYLE[variant],
    { color: color ?? (muted ? COLORS.textSecondary : COLORS.text) },
    weight ? { fontWeight: FONTS.weights[weight] } : null,
    center ? { textAlign: 'center' as const } : null,
    style,
  ]);
  const family =
    flat.fontFamily ??
    FONTS.families[DISPLAY_VARIANTS.has(variant) ? 'display' : 'body'][
      weightKey(flat.fontWeight)
    ];

  return (
    <RNText
      {...rest}
      style={[flat, { fontFamily: family, fontWeight: 'normal' }]}
    />
  );
}
