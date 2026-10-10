import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, MOTION, RADIUS, SPACING, ANIMATIONS_ENABLED } from '../../constants/theme';
import { Text } from './Typography';

type Variant = 'primary' | 'brand' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
type Glyph = keyof typeof Ionicons.glyphMap;

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Ionicons glyph drawn before the label. */
  icon?: string;
  size?: 'md' | 'lg';
  style?: ViewStyle;
}

const FILL: Partial<Record<Variant, readonly [string, string, ...string[]]>> = {
  primary: GRADIENTS.primary,
  brand: GRADIENTS.brand,
  danger: GRADIENTS.danger,
  gold: GRADIENTS.gold,
};

const FG: Record<Variant, string> = {
  primary: '#FFFFFF',
  brand: '#FFFFFF',
  secondary: COLORS.text,
  outline: COLORS.text,
  ghost: COLORS.textSecondary,
  danger: '#FFFFFF',
  gold: '#2A1A00',
};

/**
 * Buttons: lit gradient pills with a light sweep for the loud ones, frosted glass for secondary, a gradient rim for outline. Every
 * press squishes.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
  icon,
  size = 'md',
  style,
}: Props) {
  const inactive = disabled || loading;
  const fill = FILL[variant];

  const scale = useSharedValue(1);
  const width = useSharedValue(240);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (!fill || inactive || !ANIMATIONS_ENABLED) return;
    sweep.value = 0;
    sweep.value = withRepeat(
      withSequence(
        withDelay(1800, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        withTiming(0, { duration: 0 })
      ),
      -1,
      false
    );
  }, [fill, inactive, sweep]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -90 + sweep.value * (width.value + 180) }, { rotate: '18deg' }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  };

  const fg = FG[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onPressIn={() => {
        scale.value = withTiming(MOTION.pressScale, { duration: MOTION.fast });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, MOTION.spring);
      }}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <Animated.View
        onLayout={onLayout}
        style={[
          styles.base,
          size === 'lg' && styles.lg,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          fullWidth && styles.fullWidth,
          inactive && styles.disabled,
          pressStyle,
          style,
        ]}
      >
        {fill ? (
          <>
            <LinearGradient
              colors={fill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={GRADIENTS.sheen}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.sheen}
            />
            {!inactive && ANIMATIONS_ENABLED && (
              <Animated.View style={[styles.sweep, sweepStyle]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            )}
          </>
        ) : null}
        {variant === 'outline' ? (
          <>
            <LinearGradient
              colors={GRADIENTS.brand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.outlineInner} />
          </>
        ) : null}

        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={styles.content}>
            {icon ? <Ionicons name={icon as Glyph} size={size === 'lg' ? 20 : 17} color={fg} /> : null}
            <Text
              variant="subheading"
              weight="bold"
              color={fg}
              center
              style={size === 'lg' ? styles.lgLabel : undefined}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lg: { minHeight: 52, borderRadius: RADIUS.lg - 2 },
  lgLabel: { fontSize: 16, letterSpacing: 0.2 },
  content: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  secondary: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  ghost: { backgroundColor: 'transparent' },
  outlineInner: {
    ...StyleSheet.absoluteFillObject,
    margin: 1.5,
    borderRadius: RADIUS.md + 2.5,
    backgroundColor: COLORS.surfaceSolid,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  sweep: { position: 'absolute', top: -20, bottom: -20, left: 0, width: 60 },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.4 },
});
