import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { formatWeek } from '../../utils/formatters';

interface Props {
  week: number;
  /** The week in play — lit up so the live block is findable at a glance. */
  isCurrent?: boolean;
}

/** A week marker in the career column: a chip on a fading rule. */
export function WeekRule({ week, isCurrent }: Props) {
  const line = isCurrent ? withAlpha(COLORS.primary, 0.6) : 'rgba(255,255,255,0.12)';
  return (
    <View style={[styles.row, isCurrent && styles.rowCurrent]}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', line]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.rule}
      />
      {isCurrent ? (
        <View style={[styles.chip, styles.chipCurrent]}>
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.round]}
          />
          <Text variant="label" color="#FFFFFF" style={styles.text}>
            {`${formatWeek(week).toUpperCase()} · NOW`}
          </Text>
        </View>
      ) : (
        <View style={styles.chip}>
          <Text variant="label" color={COLORS.textMuted} style={styles.text}>
            {formatWeek(week).toUpperCase()}
          </Text>
        </View>
      )}
      <LinearGradient
        colors={[line, 'rgba(255,255,255,0)']}
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
    gap: SPACING.sm,
    marginVertical: SPACING.lg,
  },
  rowCurrent: { marginTop: SPACING.xl },
  rule: { flex: 1, height: 1 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipCurrent: {
    borderColor: 'rgba(255,255,255,0.25)',
  },
  round: { borderRadius: RADIUS.full },
  text: { fontSize: 10 },
});
