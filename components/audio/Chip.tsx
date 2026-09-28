import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

/** Small selectable pill used across the creation pipeline. */
export function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on ? styles.on : styles.off]}
    >
      <Text
        variant="caption"
        color={on ? COLORS.bg : COLORS.textSecondary}
        weight={on ? 'bold' : 'regular'}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  on: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  off: { backgroundColor: COLORS.surface2, borderColor: COLORS.border },
});
