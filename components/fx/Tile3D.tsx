import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, shade, withAlpha } from '../../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

interface Props {
  icon: string;
  color?: string;
  size?: number;
  /** Greyed-out, flat, no glow. */
  dim?: boolean;
  style?: ViewStyle;
}

/**
 * A glossy clay keycap: a lit face sitting on an extruded side wall, a
 * contact shadow and colored under-glow, a specular hot spot, bounce light
 * along the bottom edge, and a glyph pressed out of the face with its own
 * depth. Plain views, so it is cheap enough for every row of a grid.
 *
 * The outer box is exactly `size` square; the side wall lives inside it.
 */
export function Tile3D({ icon, color = COLORS.primary, size = 44, dim, style }: Props) {
  const depth = Math.max(2, Math.round(size * 0.075));
  const face = size - depth;
  const radius = Math.round(face * 0.3);
  const base = dim ? '#3B3858' : color;
  const glyphSize = Math.round(face * 0.5);
  const glyphDepth = Math.max(1, Math.round(size * 0.035));
  const edge = shade(base, -0.62);

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Side wall: the thickness of the key, with the shadow it casts. */}
      <LinearGradient
        colors={[shade(base, -0.3), edge]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[
          styles.layer,
          {
            top: depth,
            left: depth / 2,
            width: face,
            height: face,
            borderRadius: radius,
          },
          dim
            ? null
            : {
                boxShadow: `0px ${size * 0.1}px ${size * 0.18}px rgba(0,0,0,0.55), 0px ${size * 0.06}px ${size * 0.34}px ${withAlpha(color, 0.42)}`,
              },
        ]}
      />

      {/* Face. */}
      <View
        style={[
          styles.layer,
          { top: 0, left: depth / 2, width: face, height: face, borderRadius: radius, overflow: 'hidden' },
        ]}
      >
        <LinearGradient
          colors={[shade(base, 0.38), base, shade(base, -0.34)]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Bounce light off the floor, along the bottom edge. */}
        <LinearGradient
          colors={[withAlpha(shade(base, 0.45), 0), withAlpha(shade(base, 0.45), dim ? 0.12 : 0.4)]}
          start={{ x: 0.5, y: 0.55 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Glass sheen over the top half, curving down at the sides. */}
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.sheen,
            {
              height: face * 0.5,
              borderBottomLeftRadius: face * 0.5,
              borderBottomRightRadius: face * 0.5,
              opacity: dim ? 0.18 : 0.5,
            },
          ]}
        />
        {/* Specular hot spot from the key light. */}
        {dim ? null : (
          <View
            style={[
              styles.spec,
              {
                top: face * 0.1,
                left: face * 0.14,
                width: face * 0.26,
                height: face * 0.1,
                borderRadius: face * 0.05,
                boxShadow: `0px 0px ${face * 0.08}px rgba(255,255,255,0.9)`,
              },
            ]}
          />
        )}
        {/* Bevel: lit top rim, shaded bottom rim. */}
        <View style={[StyleSheet.absoluteFill, styles.bevel, { borderRadius: radius }]} />
      </View>

      {/* Glyph, pressed out of the face: a shaded extrusion under a lit cap. */}
      <View style={[styles.layer, styles.center, { top: 0, left: depth / 2, width: face, height: face }]}>
        {Array.from({ length: glyphDepth }, (_, i) => (
          <Ionicons
            key={i}
            name={icon as Glyph}
            size={glyphSize}
            color={dim ? 'rgba(0,0,0,0.25)' : shade(base, -0.55)}
            style={[styles.glyphLayer, { transform: [{ translateY: i + 1 }] }]}
          />
        ))}
        <Ionicons
          name={icon as Glyph}
          size={glyphSize}
          color={dim ? COLORS.textMuted : '#FFFFFF'}
          style={dim ? null : styles.glyph}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0 },
  spec: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '-18deg' }] },
  bevel: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderTopColor: 'rgba(255,255,255,0.42)',
    borderBottomColor: 'rgba(0,0,0,0.28)',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  glyphLayer: { position: 'absolute' },
  glyph: {
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: -0.5 },
    textShadowRadius: 1,
  },
});
