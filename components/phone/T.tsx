import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

type Weight = '400' | '500' | '600' | '700' | '800' | '900';

interface Props extends TextProps {
  size?: number;
  weight?: Weight;
  color?: string;
  /** Line height; defaults to 1.3x the size. */
  lh?: number;
  center?: boolean;
}

/**
 * Text for the phone apps. Real Android apps render in the system font
 * (Roboto), not the game's display type, so the apps use this instead of the
 * game's Text: same sizes and weights the real apps use.
 */
export function T({ size = 15, weight = '400', color = '#FFFFFF', lh, center, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: size,
          fontWeight: weight,
          color,
          lineHeight: lh ?? Math.round(size * 1.3),
          textAlign: center ? 'center' : undefined,
          includeFontPadding: false,
        },
        style,
      ]}
    />
  );
}
