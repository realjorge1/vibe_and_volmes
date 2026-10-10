import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from './Typography';

interface Props {
  children: string;
  color?: string;
  style?: ViewStyle;
}

/** A centered section break: a small caps label between two fading rules. */
export function RuleLabel({ children, color = COLORS.textSecondary, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.14)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rule}
      />
      <Text variant="label" color={color} style={styles.text}>
        {children}
      </Text>
      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rule}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  rule: { flex: 1, height: 1 },
  text: { fontSize: 10 },
});
