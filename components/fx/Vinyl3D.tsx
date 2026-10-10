import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  SweepGradient,
  Text as SkText,
  rect,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, GRADIENTS, ANIMATIONS_ENABLED } from '../../constants/theme';

interface Props {
  size?: number;
  /** Printed on the label (initials work best). */
  label?: string;
  /** Label colors; defaults to the brand gradient. */
  colors?: readonly string[];
  /** Degrees the platter leans back. 0 = face-on. */
  tilt?: number;
  spinning?: boolean;
  style?: ViewStyle;
}

const TAU = Math.PI * 2;

/**
 * A vinyl record on a turntable, leaning back in 3D: pressed grooves, a
 * spinning gradient label, a fixed light sheen across the grooves (so the
 * spin reads as real), a pressed edge for thickness and a contact shadow.
 */
export function Vinyl3D({
  size = 200,
  label,
  colors = GRADIENTS.brand,
  tilt = 56,
  spinning = ANIMATIONS_ENABLED,
  style,
}: Props) {
  const R = size / 2;
  const edge = Math.max(3, size * 0.035);
  const font = useFont(
    require('@expo-google-fonts/unbounded/800ExtraBold/Unbounded_800ExtraBold.ttf'),
    Math.round(size * 0.085)
  );

  const rot = useSharedValue(0);
  useEffect(() => {
    if (!spinning) return;
    rot.value = 0;
    rot.value = withRepeat(withTiming(TAU, { duration: 3600, easing: Easing.linear }), -1, false);
  }, [spinning, rot]);
  const spin = useDerivedValue(() => [{ rotate: rot.value }]);

  const hover = useSharedValue(ANIMATIONS_ENABLED ? 0 : 0.5);
  useEffect(() => {
    if (!ANIMATIONS_ENABLED) return;
    hover.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [hover]);
  const hoverStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (hover.value - 0.5) * size * 0.04 }],
  }));

  const grooves = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        r: R * 0.4 + i * ((R * 0.56) / 20),
        a: i % 4 === 0 ? 0.09 : 0.04,
      })),
    [R]
  );

  // Skia draws with one font and no fallback, so keep to glyphs Unbounded has.
  const text = (label ?? '').toUpperCase().replace(/[^A-Z0-9&]/g, '').slice(0, 4);
  const textW = font && text ? font.measureText(text).width : 0;
  const c = vec(R, R);

  return (
    <Animated.View style={[{ width: size, height: size * 0.72 }, hoverStyle, style]}>
      {/* Contact shadow on the "floor". */}
      <View
        style={[
          styles.floorShadow,
          {
            width: size * 0.8,
            height: size * 0.2,
            left: size * 0.1,
            top: size * 0.52,
            borderRadius: size,
          },
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          marginTop: -size * 0.14,
          transform: [{ perspective: size * 4.5 }, { rotateX: `${tilt}deg` }],
        }}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {/* Pressed edge gives the disc thickness once it leans back. */}
          <Circle cx={R} cy={R + edge} r={R - 1} color="#1A1726" />
          <Circle cx={R} cy={R} r={R - 1} color="#0A0912" />
          {grooves.map((g, i) => (
            <Circle
              key={i}
              cx={R}
              cy={R}
              r={g.r}
              style="stroke"
              strokeWidth={1}
              color={`rgba(255,255,255,${g.a})`}
            />
          ))}

          <Group origin={c} transform={spin}>
            <Circle cx={R} cy={R} r={R * 0.34}>
              <LinearGradient
                start={vec(R * 0.66, R * 0.66)}
                end={vec(R * 1.34, R * 1.34)}
                colors={[...colors]}
              />
            </Circle>
            <Circle cx={R} cy={R} r={R * 0.34} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.35)" />
            <Circle cx={R} cy={R} r={R * 0.24} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.18)" />
            {font && text ? (
              <SkText
                x={R - textW / 2}
                y={R - R * 0.1}
                text={text}
                font={font}
                color="rgba(255,255,255,0.95)"
              />
            ) : null}
            <Circle cx={R} cy={R * 0.74} r={R * 0.022} color="rgba(255,255,255,0.9)" />
          </Group>
          <Circle cx={R} cy={R} r={R * 0.035} color={COLORS.bg} />

          {/* Fixed light sheen across the grooves. */}
          <Circle cx={R} cy={R} r={R - 1}>
            <SweepGradient
              c={c}
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.13)',
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.09)',
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0)',
              ]}
              positions={[0, 0.08, 0.18, 0.5, 0.58, 0.68, 1]}
            />
          </Circle>
          <Circle cx={R} cy={R} r={R - 1.5} style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.14)" />
          <Oval rect={rect(R * 0.35, R * 0.2, R * 0.7, R * 0.14)} color="rgba(255,255,255,0.05)">
            <BlurMask blur={6} style="normal" />
          </Oval>
        </Canvas>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floorShadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.45)',
    boxShadow: '0px 6px 18px rgba(0,0,0,0.6)',
  },
});
