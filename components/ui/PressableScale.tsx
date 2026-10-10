import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MOTION } from '../../constants/theme';

interface Props {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

/** A pressable that squishes on touch and springs back. */
export function PressableScale({
  children,
  onPress,
  disabled,
  scaleTo = MOTION.pressScale,
  style,
  hitSlop,
}: Props) {
  const scale = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      hitSlop={hitSlop}
      onPressIn={() => {
        scale.value = withTiming(scaleTo, { duration: MOTION.fast });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, MOTION.spring);
      }}
    >
      <Animated.View style={[style, st]}>{children}</Animated.View>
    </Pressable>
  );
}
