import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { Track, TrackStatus } from '../../types/music';
import { COLORS, SPACING } from '../../constants/theme';
import { formatStreams } from '../../utils/statHelpers';
import { ordinal } from '../../utils/formatters';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Typography';

const STATUS_COLOR: Record<TrackStatus, string> = {
  charting: COLORS.positive,
  fading: COLORS.warning,
  classic: COLORS.gold,
  forgotten: COLORS.textMuted,
};

export function TrackCard({ track }: { track: Track }) {
  return (
    <Card accent={STATUS_COLOR[track.status]}>
      <View style={styles.header}>
        <Text variant="heading" numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        <Badge label={track.status} color={STATUS_COLOR[track.status]} />
      </View>
      <View style={styles.row}>
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
        {track.wentViral && <Stat label="" value="🔥 Viral" />}
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      {label ? (
        <Text variant="label" muted>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <Text variant="subheading">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginTop: SPACING.md,
    flexWrap: 'wrap',
  },
});
