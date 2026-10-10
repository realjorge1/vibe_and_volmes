import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { RADIUS, SPACING, ANIMATIONS_ENABLED, shade } from '../../constants/theme';
import { statColor } from '../../utils/statHelpers';
import { Text } from './Typography';

interface Props {
  label: string;
  value: number;       // 0-100
  showValue?: boolean;
  color?: string;
}

/** A gradient meter that eases to its value. */
export function StatBar({ label, value, showValue = true, color }: Props) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = color ?? statColor(pct);

  const w = useSharedValue(ANIMATIONS_ENABLED ? 0 : pct);
  useEffect(() => {
    w.value = ANIMATIONS_ENABLED ? withTiming(pct, { duration: 800, easing: Easing.out(Easing.cubic) }) : pct;
  }, [pct, w]);
  const barStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  return (
    <View style={styles.row}>
      {(label || showValue) && (
        <View style={styles.header}>
          <Text variant="caption" muted weight="medium">
            {label}
          </Text>
          {showValue && (
            <Text variant="caption" weight="bold" color={fill}>
              {Math.round(pct)}
            </Text>
          )}
        </View>
      )}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]}>
          <LinearGradient
            colors={[shade(fill, -0.25), fill, shade(fill, 0.35)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, styles.round]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: SPACING.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: RADIUS.full,
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  round: { borderRadius: RADIUS.full },
});
