import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ActiveWant } from '../../types/identity';
import { weeksLeft } from '../../systems/identity/wantsEngine';
import { COLORS, RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { PressableScale } from '../ui/PressableScale';

type Glyph = keyof typeof Ionicons.glyphMap;

const WANT = COLORS.positive;
const FEAR = COLORS.negative;

/**
 * The artist's live wants and fears, always in view under the Deck header:
 * three even columns, an icon, the goal, the weeks left. Tapping opens the
 * artist's page (traits, the dream, eras).
 */
export function WantsStrip({ wants, week, onPress }: { wants: ActiveWant[]; week: number; onPress: () => void }) {
  if (wants.length === 0) return null;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.row}>
      {wants.map((w) => {
        const color = w.kind === 'fear' ? FEAR : WANT;
        const left = weeksLeft(w, week);
        return (
          <View key={w.uid} style={styles.cell}>
            <LinearGradient
              colors={[withAlpha(color, 0.14), 'rgba(255,255,255,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.top}>
              <View style={[styles.icon, { backgroundColor: withAlpha(color, 0.22) }]}>
                <Ionicons name={w.icon as Glyph} size={11} color={color} />
              </View>
              <Text variant="label" color={color} style={styles.kind}>
                {w.kind === 'fear' ? 'FEAR' : 'WANT'}
              </Text>
              <Text variant="label" muted style={styles.left}>
                {left === 0 ? 'NOW' : `${left}W`}
              </Text>
            </View>
            <Text variant="caption" weight="semibold" numberOfLines={2} style={styles.text}>
              {w.text}
            </Text>
          </View>
        );
      })}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.base + 4,
    paddingBottom: SPACING.sm,
  },
  cell: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minHeight: 58,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  icon: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  kind: { fontSize: 9, flex: 1 },
  left: { fontSize: 9 },
  text: { marginTop: 5, lineHeight: 15, fontSize: 12 },
});
