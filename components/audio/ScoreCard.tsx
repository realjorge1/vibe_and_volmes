import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { SongScore } from '../../types/audio';
import { Text } from '../ui/Typography';
import { Card } from '../ui/Card';
import { RingGauge } from '../fx/RingGauge';
import { COLORS, RADIUS, SPACING, ANIMATIONS_ENABLED, shade, withAlpha } from '../../constants/theme';

function scoreColor(v: number): string {
  if (v >= 80) return COLORS.gold;
  if (v >= 65) return COLORS.positive;
  if (v >= 45) return COLORS.warning;
  return COLORS.negative;
}

function Bar({ label, value, index }: { label: string; value: number; index: number }) {
  const c = scoreColor(value);
  const w = useSharedValue(ANIMATIONS_ENABLED ? 0 : value);
  useEffect(() => {
    w.value = ANIMATIONS_ENABLED
      ? withDelay(index * 110, withTiming(value, { duration: 800, easing: Easing.out(Easing.cubic) }))
      : value;
  }, [value, index, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={styles.barRow}>
      <Text variant="caption" muted style={styles.barLabel}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, st]}>
          <LinearGradient
            colors={[shade(c, -0.25), c, shade(c, 0.35)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, styles.round]}
          />
        </Animated.View>
      </View>
      <Text variant="caption" weight="bold" color={c} style={styles.barVal}>
        {value}
      </Text>
    </View>
  );
}

/** The "AI listened" moment. Rules-driven underneath, but presented like a
 *  verdict from a panel — headline, breakdown, then the read on the room. */
export function ScoreCard({ score }: { score: SongScore }) {
  const c = scoreColor(score.overall);
  return (
    <Card accent={c}>
      <Text variant="label" muted>
        EVALUATION
      </Text>
      <View style={styles.headline}>
        <RingGauge progress={score.overall / 100} size={88} stroke={8} color={c}>
          <Text variant="metric" color={c} style={styles.overall}>
            {score.overall}
          </Text>
        </RingGauge>
        <View style={styles.verdict}>
          <Text variant="heading">{score.verdict}</Text>
          <Text variant="caption" muted style={styles.sub}>
            Critics {score.critic} · Fans {score.fan}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Bar index={0} label="Performance" value={score.breakdown.performance} />
        <Bar index={1} label="Songwriting" value={score.breakdown.songwriting} />
        <Bar index={2} label="Production" value={score.breakdown.production} />
        <Bar index={3} label="Star power" value={score.breakdown.starPower} />
        <Bar index={4} label="Zeitgeist" value={score.breakdown.zeitgeist} />
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
  const c = scoreColor(value);
  return (
    <View style={[styles.pill, { borderColor: withAlpha(c, 0.35), backgroundColor: withAlpha(c, 0.08) }]}>
      <Text variant="label" muted style={styles.pillLabel}>
        {label.toUpperCase()}
      </Text>
      <Text variant="heading" color={c}>
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
    marginVertical: SPACING.md,
  },
  overall: { fontSize: 26, lineHeight: 32 },
  verdict: { flex: 1 },
  sub: { marginTop: 2 },
  section: { marginTop: SPACING.sm, gap: SPACING.sm + 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  barLabel: { width: 84 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.full,
  },
  barFill: { height: '100%', borderRadius: RADIUS.full },
  round: { borderRadius: RADIUS.full },
  barVal: { width: 26, textAlign: 'right' },
  pills: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.base,
  },
  pill: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    gap: 2,
  },
  pillLabel: { fontSize: 9 },
});
