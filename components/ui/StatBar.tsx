import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, MOTION } from '../../constants/theme';
import { statColor } from '../../utils/statHelpers';
import { Text } from './Typography';

interface Props {
  label: string;
  value: number;       // 0-100
  showValue?: boolean;
  color?: string;
}

export function StatBar({ label, value, showValue = true, color }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = color ?? statColor(pct);

  const w = useSharedValue(pct);
  useEffect(() => {
    w.value = withTiming(pct, { duration: MOTION.slow });
  }, [pct, w]);
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text variant="caption" muted>
          {label}
        </Text>
        {showValue && (
          <Text variant="caption" weight="bold" color={fill}>
            {Math.round(pct)}
          </Text>
        )}
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, barStyle, { backgroundColor: fill }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  track: {
    height: 4,
    backgroundColor: COLORS.surface3,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
});
