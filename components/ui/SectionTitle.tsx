import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from './Typography';

interface Props {
  children: string;
  /** Small count or note on the right. */
  meta?: string;
  accent?: string;
  style?: ViewStyle;
}

/** A section heading with a lead dot and an optional right-hand note. */
export function SectionTitle({ children, meta, accent = COLORS.primary, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text variant="heading" style={styles.title}>
        {children}
      </Text>
      {meta ? (
        <Text variant="label" muted>
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm + 2,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  title: { flex: 1, fontSize: 16 },
});
