import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '../../constants/theme';

interface Props {
  bars?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  colors?: readonly [string, string, ...string[]];
  active?: boolean;
  style?: ViewStyle;
}

function Bar({
  index,
  height,
  width,
  colors,
  active,
}: {
  index: number;
  height: number;
  width: number;
  colors: readonly [string, string, ...string[]];
  active: boolean;
}) {
  const s = useSharedValue(0.3);
  useEffect(() => {
    if (!active) {
      cancelAnimation(s);
      s.value = withTiming(0.2, { duration: 300 });
      return;
    }
    const base = 260 + ((index * 97) % 180);
    s.value = withDelay(
      index * 70,
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: base, easing: Easing.out(Easing.quad) }),
          withTiming(0.25 + ((index * 37) % 30) / 100, { duration: base * 0.9, easing: Easing.in(Easing.quad) }),
          withTiming(0.7, { duration: base * 0.7 }),
          withTiming(0.2, { duration: base * 0.8 })
        ),
        -1,
        true
      )
    );
  }, [active, index, s]);

  const st = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }] }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: width, overflow: 'hidden', transformOrigin: 'bottom' }, st]}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Bouncing level-meter bars — the studio's heartbeat. */
export function Equalizer({
  bars = 5,
  height = 18,
  barWidth = 3,
  gap = 2.5,
  colors = GRADIENTS.brand,
  active = true,
  style,
}: Props) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap, height }, style]}>
      {Array.from({ length: bars }, (_, i) => (
        <Bar key={i} index={i} height={height} width={barWidth} colors={colors} active={active} />
      ))}
    </View>
  );
}
