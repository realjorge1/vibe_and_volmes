import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface Props {
  /** Vertical margin around the rule. */
  spacing?: number;
  style?: ViewStyle;
}

/** A single hairline rule — the primary separator in the Tesla-OS look. */
export function Divider({ spacing = SPACING.base, style }: Props) {
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: COLORS.border,
          marginVertical: spacing,
        },
        style,
      ]}
    />
  );
}
