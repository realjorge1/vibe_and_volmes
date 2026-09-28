import React from 'react';
import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
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
  // Hero numbers — the centerpiece of the Tesla-OS look.
  display: {
    fontSize: FONTS.sizes['4xl'],
    fontWeight: FONTS.weights.bold,
    lineHeight: FONTS.sizes['4xl'] * 1.0,
    letterSpacing: FONTS.tracking.tight,
    fontVariant: ['tabular-nums'],
  },
  // Large data readout (metrics, money, fans).
  metric: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.semibold,
    lineHeight: FONTS.sizes['2xl'] * 1.05,
    letterSpacing: FONTS.tracking.snug,
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.semibold,
    lineHeight: FONTS.sizes.xl * 1.14,
    letterSpacing: FONTS.tracking.snug,
  },
  heading: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    lineHeight: FONTS.sizes.lg * 1.22,
    letterSpacing: FONTS.tracking.snug,
  },
  subheading: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.medium,
    lineHeight: FONTS.sizes.md * 1.3,
  },
  body: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.regular,
    lineHeight: FONTS.sizes.base * 1.46,
  },
  caption: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.regular,
    lineHeight: FONTS.sizes.sm * 1.4,
  },
  // Tiny all-caps eyebrow label — the technical "field name" voice.
  label: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: FONTS.tracking.wider,
  },
};

export function Text({
  variant = 'body',
  color,
  muted,
  weight,
  center,
  style,
  ...rest
}: Props) {
  return (
    <RNText
      {...rest}
      style={[
        VARIANT_STYLE[variant],
        {
          color: color ?? (muted ? COLORS.textSecondary : COLORS.text),
        },
        weight ? { fontWeight: FONTS.weights[weight] } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    />
  );
}
