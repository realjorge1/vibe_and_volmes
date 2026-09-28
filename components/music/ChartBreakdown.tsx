import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ChartFactorBreakdown } from '../../types/music';
import { Text } from '../ui/Typography';
import { Card } from '../ui/Card';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

const ROWS: { key: keyof ChartFactorBreakdown; label: string }[] = [
  { key: 'streams', label: 'Streams' },
  { key: 'socialBuzz', label: 'Social buzz' },
  { key: 'playlistSupport', label: 'Playlist' },
  { key: 'trendAlignment', label: 'Trend fit' },
  { key: 'labelBacking', label: 'Label push' },
  { key: 'reputation', label: 'Reputation' },
];

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.barRow}>
      <Text variant="caption" muted style={styles.barLabel}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            borderRadius: RADIUS.full,
            backgroundColor: COLORS.accent,
          }}
        />
      </View>
      <Text variant="caption" style={styles.barVal}>
        {value}
      </Text>
    </View>
  );
}

/** "Why it charted" — the six forces behind a song's chart position. */
export function ChartBreakdown({
  factors,
  score,
}: {
  factors: ChartFactorBreakdown;
  score?: number;
}) {
  return (
    <Card accent={COLORS.accent}>
      <View style={styles.head}>
        <Text variant="label" muted>
          WHY IT CHARTED
        </Text>
        {typeof score === 'number' ? (
          <Text variant="subheading" color={COLORS.accent}>
            Chart score {score}
          </Text>
        ) : null}
      </View>
      <View style={styles.bars}>
        {ROWS.map(({ key, label }) => (
          <Bar key={key} label={label} value={Math.round(factors[key])} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bars: { marginTop: SPACING.sm, gap: SPACING.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  barLabel: { width: 84 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barVal: { width: 26, textAlign: 'right' },
});
