import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../ui/Typography';
import { COLORS, GRADIENTS, RADIUS, SPACING } from '../../constants/theme';

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
      style={({ pressed }) => [styles.chip, on ? styles.on : styles.off, pressed && styles.pressed]}
    >
      {on && (
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.round]}
        />
      )}
      <Text
        variant="caption"
        color={on ? '#FFFFFF' : COLORS.textSecondary}
        weight={on ? 'bold' : 'medium'}
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
  round: { borderRadius: RADIUS.full },
  on: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  off: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: COLORS.border },
  pressed: { transform: [{ scale: 0.95 }] },
});
