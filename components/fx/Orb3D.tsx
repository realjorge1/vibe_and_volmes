import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Skia,
  rect,
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
import { COLORS, ANIMATIONS_ENABLED, shade, withAlpha } from '../../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

interface Props {
  size?: number;
  color?: string;
  icon?: string;
  /** Gentle hover bob. */
  float?: boolean;
  style?: ViewStyle;
}

/**
 * A glossy 3D sphere with a glyph embossed on its face: key light from the
 * top left, a specular hot spot and a second glint, a glass caustic along the
 * lower rim, bounce light on the underside, and a contact shadow that
 * breathes as the orb hovers. The glyph has its own shaded depth. Rendered
 * in Skia.
 */
export function Orb3D({
  size = 56,
  color = COLORS.primary,
  icon,
  float = ANIMATIONS_ENABLED,
  style,
}: Props) {
  const pad = Math.round(size * 0.32);
  const W = size + pad * 2;
  const H = size + pad * 2;
  const cx = W / 2;
  const cy = pad + size / 2 - size * 0.04;
  const r = size / 2;

  const bob = useSharedValue(0.5);
  useEffect(() => {
    if (!float) return;
    bob.value = 0;
    bob.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [float, bob]);

  const lift = useDerivedValue(() => (bob.value - 0.5) * size * 0.1);
  const sphereT = useDerivedValue(() => [{ translateY: lift.value }]);
  const shadowRect = useDerivedValue(() => {
    const k = 1 + (bob.value - 0.5) * 0.22;
    const sw = size * 0.72 * k;
    const sh = size * 0.13 * k;
    return rect(cx - sw / 2, cy + r + size * 0.06, sw, sh);
  });
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  const light = shade(color, 0.6);
  const dark = shade(color, -0.62);

  // A thin crescent hugging the lower rim: light refracted through the glass.
  const caustic = useMemo(() => {
    const p = Skia.Path.Make();
    p.addArc({ x: cx - r * 0.82, y: cy - r * 0.82, width: r * 1.64, height: r * 1.64 }, 35, 110);
    return p;
  }, [cx, cy, r]);

  const glyphSize = Math.round(size * 0.44);
  const glyphDepth = Math.max(1, Math.round(size * 0.03));

  return (
    <View style={[{ width: W, height: H, margin: -pad }, style]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Oval rect={shadowRect} color="rgba(0,0,0,0.6)">
          <BlurMask blur={size * 0.06} style="normal" />
        </Oval>
        <Group transform={sphereT}>
          <Circle cx={cx} cy={cy} r={r}>
            <RadialGradient
              c={vec(cx - r * 0.38, cy - r * 0.42)}
              r={r * 1.75}
              colors={[light, color, dark, shade(color, -0.85)]}
              positions={[0, 0.34, 0.8, 1]}
            />
          </Circle>
          {/* Bounce light off the floor. */}
          <Oval
            rect={rect(cx - r * 0.55, cy + r * 0.42, r * 1.1, r * 0.42)}
            color={withAlpha(shade(color, 0.35), 0.45)}
          >
            <BlurMask blur={r * 0.18} style="normal" />
          </Oval>
          {/* Glass caustic along the lower rim. */}
          <Path
            path={caustic}
            style="stroke"
            strokeWidth={r * 0.07}
            strokeCap="round"
            color={withAlpha(shade(color, 0.7), 0.55)}
          >
            <BlurMask blur={r * 0.04} style="normal" />
          </Path>
          {/* Rim light. */}
          <Circle cx={cx} cy={cy} r={r - 0.75} style="stroke" strokeWidth={1.5}>
            <LinearGradient
              start={vec(cx, cy - r)}
              end={vec(cx, cy + r)}
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0.2)']}
            />
          </Circle>
          {/* Specular hot spot, and a small second glint off the curve. */}
          <Oval
            rect={rect(cx - r * 0.62, cy - r * 0.78, r * 0.72, r * 0.42)}
            color="rgba(255,255,255,0.78)"
          >
            <BlurMask blur={r * 0.12} style="normal" />
          </Oval>
          <Circle cx={cx + r * 0.5} cy={cy - r * 0.46} r={r * 0.07} color="rgba(255,255,255,0.7)">
            <BlurMask blur={r * 0.04} style="normal" />
          </Circle>
        </Group>
      </Canvas>
      {icon ? (
        <Animated.View style={[styles.iconLayer, { top: cy - r, left: cx - r, width: size, height: size }, iconStyle]}>
          {Array.from({ length: glyphDepth }, (_, i) => (
            <Ionicons
              key={i}
              name={icon as Glyph}
              size={glyphSize}
              color={shade(color, -0.6)}
              style={[styles.glyphLayer, { transform: [{ translateY: i + 1 }] }]}
            />
          ))}
          <Ionicons name={icon as Glyph} size={glyphSize} color="#FFFFFF" style={styles.glyph} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphLayer: { position: 'absolute' },
  glyph: {
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: -0.5 },
    textShadowRadius: 1,
  },
});
