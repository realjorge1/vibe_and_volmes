import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Track, TrackStatus } from '../../types/music';
import { COLORS, SPACING } from '../../constants/theme';
import { formatStreams } from '../../utils/statHelpers';
import { ordinal } from '../../utils/formatters';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Typography';

const STATUS_COLOR: Record<TrackStatus, string> = {
  charting: COLORS.positive,
  fading: COLORS.warning,
  classic: COLORS.gold,
  forgotten: COLORS.textMuted,
};

/** One release as a row of a grouped list: title and status, then its numbers spread evenly. */
export function TrackCard({ track }: { track: Track }) {
  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text variant="subheading" numberOfLines={1} style={styles.title}>
          {track.wentViral ? `🔥 ${track.title}` : track.title}
        </Text>
        <Badge label={track.status} color={STATUS_COLOR[track.status]} />
      </View>
      <View style={styles.stats}>
        <Stat label="Streams" value={formatStreams(track.totalStreams)} />
        <Stat
          label="Peak"
          value={
            track.peakChartPosition
              ? `${ordinal(track.peakChartPosition)}`
              : '—'
          }
        />
        <Stat label="Quality" value={`${track.quality}`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="subheading" style={styles.value}>
        {value}
      </Text>
      <Text variant="label" muted style={styles.label}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: { flexShrink: 1 },
  stats: { flexDirection: 'row', marginTop: SPACING.sm + 2 },
  stat: { flex: 1, alignItems: 'center' },
  value: { fontSize: 14 },
  label: { fontSize: 8.5, marginTop: 1 },
});
