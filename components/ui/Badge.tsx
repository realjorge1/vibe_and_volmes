import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { Text } from './Typography';

interface Props {
  label: string;
  color?: string;
  filled?: boolean;
}

/** A small tinted pill; `filled` makes it solid for the loud ones. */
export function Badge({ label, color = COLORS.primary, filled }: Props) {
  return (
    <View
      style={[
        styles.badge,
        filled
          ? { backgroundColor: color }
          : {
              backgroundColor: withAlpha(color, 0.14),
              borderWidth: 1,
              borderColor: withAlpha(color, 0.38),
            },
      ]}
    >
      <Text variant="label" color={filled ? COLORS.bg : color} style={styles.text}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  text: { fontSize: 10 },
});
