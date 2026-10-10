import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { PlayerStats } from '../../types/player';
import { SPACING } from '../../constants/theme';
import { statColor } from '../../utils/statHelpers';
import { msToFull, msToNextPoint } from '../../systems/live/energySystem';
import { LIVE_CONFIG } from '../../constants/liveConfig';
import { Text } from '../ui/Typography';
import { RingGauge } from '../fx/RingGauge';

const RINGS: { key: keyof PlayerStats; label: string }[] = [
  { key: 'energy', label: 'Energy' },
  { key: 'mentalHealth', label: 'Mind' },
  { key: 'reputation', label: 'Rep' },
  { key: 'fanLoyalty', label: 'Loyalty' },
];

function human(ms: number): string {
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * The four vitals as rings spread evenly across the width, with the live
 * energy recharge countdown under them. Bare on the stage — no card.
 */
export function QuickStats({ stats }: { stats: PlayerStats }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, []);

  const full = stats.energy >= LIVE_CONFIG.ENERGY_MAX;

  return (
    <View>
      <View style={styles.rings}>
        {RINGS.map((r) => {
          const v = Math.round(stats[r.key] as number);
          const c = statColor(v);
          return (
            <View key={r.key} style={styles.ringCell}>
              <RingGauge progress={v / 100} size={54} stroke={4} color={c}>
                <Text variant="subheading" color={c} style={styles.ringValue}>
                  {v}
                </Text>
              </RingGauge>
              <Text variant="label" muted style={styles.ringLabel}>
                {r.label.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>
      <Text variant="caption" muted center style={styles.recharge}>
        {full
          ? 'Energy is full. Go make something.'
          : `+1 energy in ${human(msToNextPoint())} · full in ${human(msToFull())}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rings: { flexDirection: 'row' },
  ringCell: { flex: 1, alignItems: 'center', gap: SPACING.sm },
  ringValue: { fontSize: 14 },
  ringLabel: { fontSize: 9, letterSpacing: 1.2 },
  recharge: { marginTop: SPACING.md, fontSize: 12 },
});
