import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { SongScore } from '../../types/audio';
import { Text } from '../ui/Typography';
import { Card } from '../ui/Card';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

function scoreColor(v: number): string {
  if (v >= 80) return COLORS.gold;
  if (v >= 65) return COLORS.positive;
  if (v >= 45) return COLORS.warning;
  return COLORS.negative;
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.barRow}>
      <Text variant="caption" muted style={styles.barLabel}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View
          style={{
            width: `${value}%`,
            height: '100%',
            borderRadius: RADIUS.full,
            backgroundColor: scoreColor(value),
          }}
        />
      </View>
      <Text variant="caption" style={styles.barVal}>
        {value}
      </Text>
    </View>
  );
}

/** The "AI listened" moment. Rules-driven underneath, but presented like a
 *  verdict from a panel — headline, breakdown, then the read on the room. */
export function ScoreCard({ score }: { score: SongScore }) {
  return (
    <Card accent={scoreColor(score.overall)}>
      <Text variant="label" muted>
        EVALUATION
      </Text>
      <View style={styles.headline}>
        <Text variant="display" color={scoreColor(score.overall)}>
          {score.overall}
        </Text>
        <View style={styles.verdict}>
          <Text variant="heading">{score.verdict}</Text>
          <Text variant="caption" muted>
            Critics {score.critic} · Fans {score.fan}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Bar label="Performance" value={score.breakdown.performance} />
        <Bar label="Songwriting" value={score.breakdown.songwriting} />
        <Bar label="Production" value={score.breakdown.production} />
        <Bar label="Star power" value={score.breakdown.starPower} />
        <Bar label="Zeitgeist" value={score.breakdown.zeitgeist} />
      </View>

      <View style={styles.pills}>
        <Pill label="Replay" value={score.replayability} />
        <Pill label="Viral" value={score.viralPotential} />
        <Pill label="Authentic" value={score.authenticity} />
      </View>
    </Card>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.pill}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text variant="subheading" color={scoreColor(value)}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    marginVertical: SPACING.sm,
  },
  verdict: { flex: 1 },
  section: { marginTop: SPACING.sm, gap: SPACING.sm },
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
  pills: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.base,
  },
  pill: {
    flex: 1,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
});
