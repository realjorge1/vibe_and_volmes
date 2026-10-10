import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Typography';
import { Card } from '../ui/Card';
import { StatBar } from '../ui/StatBar';
import { RingGauge } from '../fx/RingGauge';
import { useProgressionStore } from '../../store/progressionStore';
import { levelInfo, levelProgress, MAX_LEVEL } from '../../constants/progression';
import { SPACING } from '../../constants/theme';

interface Props {
  onPress?: () => void;
}

/** The career ladder front-and-center: level ring + XP to next rank. */
export function LevelBadge({ onPress }: Props) {
  const xp = useProgressionStore((s) => s.xp);
  const prog = levelProgress(xp);
  const info = levelInfo(prog.level);
  const isMax = prog.level >= MAX_LEVEL;

  return (
    <Card onPress={onPress} accent={info.color} style={styles.card}>
      <View style={styles.wrap}>
        <RingGauge progress={isMax ? 1 : prog.ratio} size={54} stroke={5} color={info.color}>
          <Text variant="label" muted style={styles.lv}>
            LV
          </Text>
          <Text variant="metric" color={info.color} style={styles.lvNum}>
            {prog.level}
          </Text>
        </RingGauge>

        <View style={styles.body}>
          <Text variant="subheading" color={info.color}>
            {info.title}
          </Text>
          <Text variant="caption" muted numberOfLines={1}>
            {info.blurb}
          </Text>
          <View style={styles.bar}>
            <StatBar
              label={isMax ? 'MAX — IMMORTAL ICON' : `${prog.intoLevel.toLocaleString()} / ${prog.span.toLocaleString()} XP`}
              value={(isMax ? 1 : prog.ratio) * 100}
              showValue={false}
              color={info.color}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  wrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md + 2 },
  lv: { fontSize: 8, letterSpacing: 1.5, marginBottom: -2 },
  lvNum: { fontSize: 17, lineHeight: 21 },
  body: { flex: 1 },
  bar: { marginTop: SPACING.sm, marginBottom: -SPACING.md },
});
