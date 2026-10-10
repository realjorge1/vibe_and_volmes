import React, { useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, MOTION, RADIUS } from '../../constants/theme';
import { Text } from './Typography';

export interface Segment<T extends string> {
  key: T;
  label: string;
}

interface Props<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: ViewStyle;
}

const PAD = 4;

/**
 * A frosted track with a glowing gradient pill that springs between
 * segments. Used to fold dense screens (Life, Empire, Social) into views.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  style,
}: Props<T>) {
  const index = Math.max(0, segments.findIndex((s) => s.key === value));
  const segW = useSharedValue(0);
  const x = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index, MOTION.spring);
  }, [index, x]);

  const onLayout = (e: LayoutChangeEvent) => {
    segW.value = (e.nativeEvent.layout.width - PAD * 2) / segments.length;
  };

  const pill = useAnimatedStyle(() => ({
    width: segW.value,
    opacity: segW.value > 0 ? 1 : 0,
    transform: [{ translateX: x.value * segW.value }],
  }));

  return (
    <View style={[styles.track, style]} onLayout={onLayout}>
      <Animated.View style={[styles.pill, pill]}>
        <LinearGradient
          colors={GRADIENTS.primary}
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
      </Animated.View>
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            style={styles.item}
          >
            <Text
              variant="caption"
              weight={active ? 'bold' : 'semibold'}
              color={active ? COLORS.text : COLORS.textMuted}
              numberOfLines={1}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
});
