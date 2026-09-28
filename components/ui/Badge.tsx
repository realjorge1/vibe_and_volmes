import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Text } from './Typography';

interface Props {
  label: string;
  color?: string;
  filled?: boolean;
}

export function Badge({ label, color = COLORS.primary, filled }: Props) {
  return (
    <View
      style={[
        styles.badge,
        filled
          ? { backgroundColor: color }
          : { borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'transparent' },
      ]}
    >
      <Text variant="label" color={filled ? COLORS.bg : color}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
});
