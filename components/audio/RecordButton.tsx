import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { Text } from '../ui/Typography';

type Mode = 'idle' | 'recording' | 'paused' | 'processing';

interface Props {
  mode: Mode;
  onPress: () => void;
  disabled?: boolean;
}

const ICON: Record<Mode, keyof typeof Ionicons.glyphMap> = {
  idle: 'mic',
  recording: 'stop',
  paused: 'mic',
  processing: 'hourglass',
};

const LABEL: Record<Mode, string> = {
  idle: 'Tap to record',
  recording: 'Tap to stop',
  paused: 'Paused',
  processing: 'Saving…',
};

/** One big, obvious target — the whole recording UX is this button. */
export function RecordButton({ mode, onPress, disabled }: Props) {
  const live = mode === 'recording';
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPress}
        disabled={disabled || mode === 'processing'}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: live ? COLORS.primary : COLORS.surface2,
            borderColor: live ? COLORS.primary : COLORS.borderLight,
          },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Ionicons
          name={ICON[mode]}
          size={44}
          color={live ? COLORS.text : COLORS.primary}
        />
      </Pressable>
      <Text variant="caption" muted center style={styles.label}>
        {LABEL[mode]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  btn: {
    width: 132,
    height: 132,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
  label: { marginTop: 12 },
});
