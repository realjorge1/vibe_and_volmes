import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';

interface Props {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
}

export function ChoiceButton({ text, onPress, disabled, locked }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || locked}
      style={({ pressed }) => [
        styles.button,
        locked && styles.locked,
        pressed && styles.pressed,
      ]}
    >
      <Text
        variant="body"
        color={locked ? COLORS.textMuted : COLORS.text}
        weight="medium"
      >
        {locked ? `🔒 ${text}` : text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  locked: { opacity: 0.5, borderColor: COLORS.border },
  pressed: { opacity: 0.7, borderColor: COLORS.primary },
});
