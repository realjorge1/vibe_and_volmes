import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, MOTION, RADIUS, SPACING, ANIMATIONS_ENABLED, withAlpha } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  /** Accent color: a faint wash of light from the top corner. */
  accent?: string;
  /** Opaque glass, for cards that float over other content. */
  solid?: boolean;
  style?: ViewStyle;
}

/** Degrees a pressed card leans toward the finger; the tilt is decorative. */
const TILT = ANIMATIONS_ENABLED ? 7 : 0;

/**
 * The glass panel everything sits on: a lit gradient fill, a bright top
 * edge, an optional accent tint, and — when pressable — a 3D tilt toward
 * the finger, like a console tile taking focus.
 */
export function Card({ children, onPress, accent, solid, style }: Props) {
  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const scale = useSharedValue(1);
  const size = useSharedValue({ w: 1, h: 1 });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${rx.value}deg` },
      { rotateY: `${ry.value}deg` },
      { scale: scale.value },
    ],
  }));

  const surface = (
    <View
      style={[styles.card, style]}
    >
      <LinearGradient
        colors={solid ? GRADIENTS.cardSolid : GRADIENTS.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.35, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {accent ? (
        <LinearGradient
          colors={[withAlpha(accent, 0.13), withAlpha(accent, 0)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.7 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.topEdge}
      />
      {children}
    </View>
  );

  if (!onPress) return surface;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    size.value = { w: Math.max(1, width), h: Math.max(1, height) };
  };

  const pressIn = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const { w, h } = size.value;
    ry.value = withTiming(((locationX / w) - 0.5) * TILT, { duration: MOTION.fast });
    rx.value = withTiming(-((locationY / h) - 0.5) * TILT, { duration: MOTION.fast });
    scale.value = withTiming(0.975, { duration: MOTION.fast });
  };
  const pressOut = () => {
    rx.value = withSpring(0, MOTION.spring);
    ry.value = withSpring(0, MOTION.spring);
    scale.value = withSpring(1, MOTION.spring);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onLayout={onLayout}
    >
      <Animated.View style={animStyle}>{surface}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg - 2,
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.base - 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: 'rgba(255,255,255,0.14)',
    marginBottom: SPACING.sm + 2,
    overflow: 'hidden',
  },
  topEdge: { position: 'absolute', top: 0, left: 12, right: 12, height: 1 },
});
