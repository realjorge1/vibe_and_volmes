import React from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, MOTION } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  /** Optional accent — drawn as a thin left rule, no glow. */
  accent?: string;
  style?: ViewStyle;
}

export function Card({ children, onPress, accent, style }: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const surface = (
    <View
      style={[
        styles.card,
        accent ? { borderLeftWidth: 2, borderLeftColor: accent } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(MOTION.pressScale, { duration: MOTION.fast });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: MOTION.base });
        }}
      >
        <Animated.View style={animStyle}>{surface}</Animated.View>
      </Pressable>
    );
  }
  return surface;
}

const styles = StyleSheet.create({
  // Flat surface, separated from the canvas by a hairline only.
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
});
