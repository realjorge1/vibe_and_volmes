import React from 'react';
import {
  Pressable,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, MOTION } from '../../constants/theme';
import { Text } from './Typography';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const BG: Record<Variant, string> = {
  primary: COLORS.primary,
  secondary: COLORS.surface3,
  outline: 'transparent',
  ghost: 'transparent',
  danger: COLORS.negative,
};

// Text color per variant — solid fills carry black or white for max contrast.
const FG: Record<Variant, string> = {
  primary: COLORS.bg,
  secondary: COLORS.text,
  outline: COLORS.text,
  ghost: COLORS.textSecondary,
  danger: COLORS.text,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth,
  style,
}: Props) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withTiming(MOTION.pressScale, { duration: MOTION.fast });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: MOTION.base });
      }}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <Animated.View
        style={[
          styles.base,
          { backgroundColor: BG[variant] },
          isOutline && styles.outline,
          isGhost && styles.ghost,
          fullWidth && styles.fullWidth,
          (disabled || loading) && styles.disabled,
          animStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={FG[variant]} />
        ) : (
          <View style={styles.content}>
            <Text variant="subheading" weight="semibold" color={FG[variant]} center>
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
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  outline: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: 'transparent',
  },
  ghost: { backgroundColor: 'transparent' },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.35 },
});
