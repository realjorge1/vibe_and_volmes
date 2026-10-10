import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { TextStyle } from 'react-native';
import { Text } from '../ui/Typography';
import { ANIMATIONS_ENABLED } from '../../constants/theme';

interface Props {
  value: number;
  format: (n: number) => string;
  duration?: number;
  variant?: React.ComponentProps<typeof Text>['variant'];
  color?: string;
  style?: TextStyle;
  numberOfLines?: number;
}

/**
 * A number that rolls to its new value (ease-out) and pops when it changes,
 * so every gain and loss is felt, not just read.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 750,
  variant = 'metric',
  color,
  style,
  numberOfLines,
}: Props) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  const pop = useSharedValue(1);

  useEffect(() => {
    const from = current.current;
    if (from === value || !ANIMATIONS_ENABLED) return;
    pop.value = withSequence(withTiming(1.12, { duration: 120 }), withSpring(1, { damping: 10, stiffness: 220 }));
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (value - from) * eased;
      current.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, pop]);

  const st = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View style={st}>
      <Text
        variant={variant}
        color={color}
        style={style}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit={numberOfLines === 1}
      >
        {format(ANIMATIONS_ENABLED ? settle(shown, value) : value)}
      </Text>
    </Animated.View>
  );
}

/** Snap to the exact target once close, so formatting never shows 999.99. */
function settle(shown: number, target: number) {
  return Math.abs(shown - target) < 0.5 ? target : Math.round(shown);
}
