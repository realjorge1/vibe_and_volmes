import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Typography';
import { usePlayerStore } from '../../store/playerStore';
import { msToFull, msToNextPoint } from '../../systems/live/energySystem';
import { LIVE_CONFIG } from '../../constants/liveConfig';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

function human(ms: number): string {
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Real-time energy bar with a live "recharges in" countdown. */
export function EnergyMeter() {
  const energy = usePlayerStore((s) => s.player?.stats.energy ?? 0);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, []);

  const full = energy >= LIVE_CONFIG.ENERGY_MAX;
  const pct = Math.round((energy / LIVE_CONFIG.ENERGY_MAX) * 100);
  const color = energy < 25 ? COLORS.warning : COLORS.primary;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text variant="label" muted>
          ENERGY
        </Text>
        <Text variant="label" color={color}>
          {full
            ? 'FULL'
            : `${Math.round(energy)}/100 · +1 in ${human(msToNextPoint())} · full in ${human(msToFull())}`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  track: {
    height: 4,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: RADIUS.sm },
});
