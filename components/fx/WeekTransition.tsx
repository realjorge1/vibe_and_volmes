import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, withAlpha } from '../../constants/theme';
import { Text } from '../ui/Typography';
import { GradientText } from './GradientText';
import { ParticleBurst } from './ParticleBurst';

interface Props {
  week: number;
  /** Extra line under the number, e.g. a birthday. */
  subtitle?: string;
  onDone: () => void;
}

const TOTAL = 1150;

/**
 * The week-turn moment: the screen dims, a light streak cuts across, the new
 * week number slams in with a spark burst, and it all clears in about a
 * second. Touch passes straight through, so it never blocks play.
 */
export function WeekTransition({ week, subtitle, onDone }: Props) {
  const win = useWindowDimensions();
  const [box, setBox] = useState({ width: win.width, height: win.height });
  const { width, height } = box;
  const scrim = useSharedValue(0);
  const num = useSharedValue(0);
  const streak = useSharedValue(0);

  useEffect(() => {
    scrim.value = withSequence(
      withTiming(1, { duration: 160 }),
      withDelay(560, withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }))
    );
    num.value = withSequence(
      withDelay(60, withSpring(1, { damping: 11, stiffness: 170 })),
      withDelay(420, withTiming(2, { duration: 320 }))
    );
    streak.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    const id = setTimeout(onDone, TOTAL);
    return () => clearTimeout(id);
    // Plays once per mount; the parent remounts it per week.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const numStyle = useAnimatedStyle(() => {
    const v = num.value;
    const inPhase = Math.min(v, 1);
    const out = Math.max(0, v - 1);
    return {
      opacity: Math.min(1, inPhase * 1.4) * (1 - out),
      transform: [{ scale: 1.9 - inPhase * 0.9 + out * 0.25 }, { translateY: -out * 18 }],
    };
  });
  const streakStyle = useAnimatedStyle(() => ({
    opacity: 1 - streak.value * 0.9,
    transform: [{ translateX: -width + streak.value * width * 2 }, { rotate: '-12deg' }],
  }));

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
      <Animated.View style={[styles.streak, { top: height * 0.47, width: width * 1.2 }, streakStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', withAlpha(COLORS.accent, 0.9), '#FFFFFF', withAlpha(COLORS.secondary, 0.9), 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <ParticleBurst playKey={week} x={width / 2} y={height / 2 - 20} spread={width * 0.55} />
      <Animated.View style={[styles.center, numStyle]}>
        <Text variant="label" color={COLORS.textSecondary} style={styles.eyebrow}>
          WEEK
        </Text>
        <GradientText text={String(week)} size={96} colors={GRADIENTS.brand} align="center" />
        {subtitle ? (
          <Text variant="subheading" color={COLORS.gold} center style={styles.sub}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(4,3,10,0.72)' },
  streak: { position: 'absolute', left: 0, height: 3, borderRadius: 3 },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  eyebrow: { letterSpacing: 6, marginBottom: 4 },
  sub: { marginTop: 8 },
});
