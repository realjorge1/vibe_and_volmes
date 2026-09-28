import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from './Typography';

interface Props {
  label: string;
  value: string;
  /** Color for the number (defaults to white). */
  color?: string;
  /** Optional secondary line under the value. */
  sub?: string;
  /** Use the larger hero size. */
  large?: boolean;
  align?: 'left' | 'center' | 'right';
  style?: ViewStyle;
}

/**
 * A single big legible readout: tiny all-caps label over a large tabular number.
 * The core building block of the Tesla-OS dashboards.
 */
export function Metric({
  label,
  value,
  color = COLORS.text,
  sub,
  large,
  align = 'left',
  style,
}: Props) {
  const textAlign = align;
  return (
    <View style={[{ alignItems: alignItem(align) }, style]}>
      <Text variant="label" color={COLORS.textMuted} style={{ textAlign }}>
        {label.toUpperCase()}
      </Text>
      <Text
        variant={large ? 'display' : 'metric'}
        color={color}
        style={[styles.value, { textAlign }]}
      >
        {value}
      </Text>
      {sub ? (
        <Text variant="caption" color={COLORS.textSecondary} style={{ textAlign }}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function alignItem(align: 'left' | 'center' | 'right') {
  if (align === 'center') return 'center';
  if (align === 'right') return 'flex-end';
  return 'flex-start';
}

const styles = StyleSheet.create({
  value: { marginTop: SPACING.xs },
});
