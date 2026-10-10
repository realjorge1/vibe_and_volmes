import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { BackHandler, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export interface IconOrigin {
  x: number;
  y: number;
}

interface Props {
  /** Center of the icon that was tapped: the app grows out of it. */
  origin: IconOrigin | null;
  background: string;
  statusBar: 'light' | 'dark';
  /** The strip under the home bar — the same color as the app's nav bar. */
  baseColor: string;
  indicatorColor: string;
  /** Called on Back first; return true when the app popped one of its own pages. */
  onBack?: () => boolean;
  children: React.ReactNode;
}

const OPEN = { damping: 24, stiffness: 230, mass: 0.9, overshootClamping: true } as const;

/** The open app's close: zooms it back into its icon, then leaves. */
const CloseApp = createContext<() => void>(() => {});

/**
 * A phone app, full screen: it zooms out of its icon on open, and zooms back
 * into it on close. Back walks the app's own pages before leaving it; the
 * home bar at the bottom closes it with a tap or a swipe up, and the app
 * shrinks under your thumb as you drag, like the real gesture. Each app's
 * top bar also carries an ExitButton for leaving in one tap.
 */
export function PhoneApp({
  origin,
  background,
  statusBar,
  baseColor,
  indicatorColor,
  onBack,
  children,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const p = useSharedValue(0);
  const closing = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    p.value = withSpring(1, OPEN);
  }, [p]);

  const leave = useCallback(() => router.back(), [router]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    p.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(leave)();
    });
  }, [p, leave]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBackRef.current?.()) return true;
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const ox = origin?.x ?? W / 2;
  const oy = origin?.y ?? H / 2;

  const appStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.22], [0, 1], Extrapolation.CLAMP),
    borderRadius: interpolate(p.value, [0.6, 1], [48, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: (1 - p.value) * (ox - W / 2) },
      { translateY: (1 - p.value) * (oy - H / 2) },
      { scale: interpolate(p.value, [0, 1], [0.14, 1]) },
    ],
  }));

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0, 0.7], Extrapolation.CLAMP),
  }));

  // Swipe up on the home bar: the app follows the thumb, then either closes
  // or springs back open.
  const swipe = Gesture.Pan()
    .activeOffsetY(-6)
    .onUpdate((e) => {
      p.value = interpolate(-e.translationY, [0, H * 0.5], [1, 0.55], Extrapolation.CLAMP);
    })
    .onEnd((e) => {
      if (-e.translationY > 70 || -e.velocityY > 900) runOnJS(close)();
      else p.value = withSpring(1, OPEN);
    });
  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(close)();
  });
  const homeBar = Gesture.Exclusive(swipe, tap);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
      <Animated.View style={[styles.app, { backgroundColor: background }, appStyle]}>
        <StatusBar style={statusBar} />
        <View style={styles.flex}>
          <CloseApp.Provider value={close}>{children}</CloseApp.Provider>
        </View>
        {/* The home bar sits above the system inset, clear of Android's own nav. */}
        <GestureDetector gesture={homeBar}>
          <View
            style={[styles.base, { backgroundColor: baseColor, paddingBottom: insets.bottom }]}
            accessibilityRole="button"
            accessibilityLabel="Close app"
          >
            <View style={[styles.indicator, { backgroundColor: indicatorColor }]} />
          </View>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

interface ExitProps {
  color: string;
  size?: number;
  /** A text shadow, for sitting over video. */
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The chevron at the left of an app's top bar: leaves the app, back to the phone. */
export function ExitButton({ color, size = 28, shadow, style }: ExitProps) {
  const close = useContext(CloseApp);
  return (
    <Pressable onPress={close} hitSlop={12} style={style} accessibilityRole="button" accessibilityLabel="Close app">
      <Ionicons name="chevron-back" size={size} color={color} style={shadow ? styles.shadow : undefined} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { backgroundColor: '#000' },
  app: { flex: 1, overflow: 'hidden' },
  base: { alignItems: 'center', paddingTop: 8 },
  indicator: { width: 128, height: 5, borderRadius: 3, marginBottom: 9 },
  shadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
});
