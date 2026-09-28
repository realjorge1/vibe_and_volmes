import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '../ui/Typography';
import { useProgressionStore } from '../../store/progressionStore';
import { levelInfo, levelProgress, MAX_LEVEL } from '../../constants/progression';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

interface Props {
  onPress?: () => void;
}

/** The career ladder front-and-center: level ring + XP bar to next rank. */
export function LevelBadge({ onPress }: Props) {
  const xp = useProgressionStore((s) => s.xp);
  const prog = levelProgress(xp);
  const info = levelInfo(prog.level);
  const isMax = prog.level >= MAX_LEVEL;

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <View style={[styles.ring, { borderColor: info.color }]}>
        <Text variant="label" muted>
          LV
        </Text>
        <Text variant="title" color={info.color} style={styles.lvNum}>
          {prog.level}
        </Text>
      </View>

      <View style={styles.body}>
        <Text variant="subheading" color={info.color}>
          {info.title}
        </Text>
        <Text variant="caption" muted numberOfLines={1}>
          {info.blurb}
        </Text>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.round(prog.ratio * 100)}%`, backgroundColor: info.color },
            ]}
          />
        </View>
        <Text variant="label" muted style={styles.xpLine}>
          {isMax
            ? 'MAX — IMMORTAL ICON'
            : `${prog.intoLevel.toLocaleString()} / ${prog.span.toLocaleString()} XP → LV ${prog.level + 1}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
  },
  ring: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.full,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lvNum: { marginTop: -2 },
  body: { flex: 1 },
  barTrack: {
    height: 7,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: RADIUS.full },
  xpLine: { marginTop: SPACING.xs, letterSpacing: 0.5 },
});
