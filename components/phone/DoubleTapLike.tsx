import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  onLike: () => void;
  onTap?: () => void;
  heartColor?: string;
  heartSize?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Double-tap anywhere to like: a heart pops where your thumb landed, then
 * fades. A single tap still reaches `onTap`.
 */
export function DoubleTapLike({ onLike, onTap, heartColor = '#FFFFFF', heartSize = 96, style, children }: Props) {
  const [pop, setPop] = useState<{ x: number; y: number; key: number } | null>(null);

  const liked = (x: number, y: number) => {
    setPop({ x, y, key: Date.now() });
    onLike();
  };
  const tapped = () => onTap?.();

  const double = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(260)
    .onEnd((e, ok) => {
      if (ok) runOnJS(liked)(e.x, e.y);
    });
  const single = Gesture.Tap().onEnd((_e, ok) => {
    if (ok) runOnJS(tapped)();
  });

  return (
    <GestureDetector gesture={Gesture.Exclusive(double, single)}>
      <View style={style} collapsable={false}>
        {children}
        {pop ? <Heart key={pop.key} x={pop.x} y={pop.y} size={heartSize} color={heartColor} /> : null}
      </View>
    </GestureDetector>
  );
}

function Heart({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 9, stiffness: 280 }),
      withTiming(1, { duration: 120 })
    );
    opacity.value = withDelay(520, withTiming(0, { duration: 260 }));
  }, [scale, opacity]);

  const st = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: '-10deg' }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.heart, { left: x - size / 2, top: y - size / 2 }, st]}
    >
      <Ionicons name="heart" size={size} color={color} style={styles.shadow} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heart: { position: 'absolute' },
  shadow: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
});
