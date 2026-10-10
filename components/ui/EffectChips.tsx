import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, ifAnimated, withAlpha } from '../../constants/theme';
import { Text } from './Typography';

/** "+2K fans", "Energy −10"… tinted green for gains and red for losses. */
export function EffectChips({ effects }: { effects: string[] }) {
  if (effects.length === 0) return null;
  return (
    <View style={styles.row}>
      {effects.map((e, i) => {
        const up = e.includes('+');
        const down = e.includes('−') || /(^|\s)-\d/.test(e);
        const color = up ? COLORS.positive : down ? COLORS.negative : COLORS.textSecondary;
        return (
          <Animated.View
            key={e}
            entering={ifAnimated(ZoomIn.delay(i * 60).springify().damping(14))}
            style={[styles.chip, { backgroundColor: withAlpha(color, 0.12), borderColor: withAlpha(color, 0.35) }]}
          >
            {(up || down) && (
              <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={color} />
            )}
            <Text variant="caption" weight="semibold" color={color}>
              {e}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs + 2, marginTop: SPACING.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
});
