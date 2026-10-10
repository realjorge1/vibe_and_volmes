import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, GRADIENTS, RADIUS, SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { PressableScale } from '../ui/PressableScale';

interface Props {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  locked?: boolean;
  /** 0-based position; drawn as a letter key (A, B, C…). */
  index?: number;
  /** A choice only this personality gets: labelled with the trait. */
  trait?: { label: string; color: string };
}

/** One answer to a decision: a glass row with a lit letter key. */
export function ChoiceButton({ text, onPress, disabled, locked, index, trait }: Props) {
  const key = index !== undefined ? String.fromCharCode(65 + (index % 26)) : null;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || locked}
      scaleTo={0.97}
      style={[styles.button, locked && styles.locked]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0.03)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {locked ? (
        <View style={[styles.key, styles.keyLocked]}>
          <Ionicons name="lock-closed" size={13} color={COLORS.textMuted} />
        </View>
      ) : key ? (
        <View style={styles.key}>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.keyRound]}
          />
          <Text variant="label" color="#FFFFFF" style={styles.keyText}>
            {key}
          </Text>
        </View>
      ) : null}
      <View style={styles.text}>
        {trait ? (
          <Text variant="label" color={trait.color} style={styles.trait}>
            {trait.label.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="body" color={locked ? COLORS.textMuted : COLORS.text} weight="medium">
          {text}
        </Text>
      </View>
      {!locked && <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.md + 2,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  locked: { opacity: 0.55, borderColor: COLORS.border },
  key: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLocked: { backgroundColor: 'rgba(255,255,255,0.06)' },
  keyRound: { borderRadius: 9 },
  keyText: { fontSize: 12, letterSpacing: 0 },
  text: { flex: 1 },
  trait: { fontSize: 9.5, marginBottom: 2 },
});
