import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { formatWeek } from '../../utils/formatters';

interface Props {
  week: number;
  /** The week in play — accented so the live block is findable at a glance. */
  isCurrent?: boolean;
}

/** Hairline week marker that segments the career column. */
export function WeekRule({ week, isCurrent }: Props) {
  return (
    <View style={[styles.row, isCurrent && styles.rowCurrent]}>
      <View style={styles.rule} />
      <Text
        variant="label"
        color={isCurrent ? COLORS.primary : COLORS.textMuted}
      >
        {formatWeek(week).toUpperCase()}
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  rowCurrent: { marginTop: SPACING.xl },
  rule: { flex: 1, height: 1, backgroundColor: COLORS.border },
});
