import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { Platform } from '../../types/social';
import { platformOf } from '../../data/social/platforms';
import { MOTION, shade } from '../../constants/theme';
import { Text } from '../ui/Typography';
import type { IconOrigin } from './PhoneApp';

interface Props {
  platform: Platform;
  size?: number;
  /** Unread count, drawn as the red badge. */
  badge?: number;
  onOpen: (origin: IconOrigin) => void;
}

/**
 * A home-screen app icon: a glossy squircle that sits on its own extruded
 * edge, lit from above, with the app's mark pressed out of the face. The
 * marks are our own takes on the apps they mimic.
 */
export function AppIcon({ platform, size = 64, badge = 0, onOpen }: Props) {
  const plat = platformOf(platform);
  const ref = useRef<View>(null);
  const scale = useSharedValue(1);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const open = () => {
    const node = ref.current;
    if (!node) return onOpen({ x: 0, y: 0 });
    node.measureInWindow((x, y, w, h) => onOpen({ x: x + w / 2, y: y + h / 2 }));
  };

  return (
    <Pressable
      onPress={open}
      onPressIn={() => {
        scale.value = withTiming(0.9, { duration: MOTION.fast });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, MOTION.spring);
      }}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${plat.name}, ${badge} new` : plat.name}
      style={styles.cell}
    >
      <Animated.View style={press}>
        <View ref={ref} style={{ width: size, height: size }} collapsable={false}>
          <AppFace platform={platform} size={size} />
        </View>
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text variant="label" color="#FFFFFF" style={styles.badgeText}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <Text variant="caption" weight="medium" color="#FFFFFF" numberOfLines={1} style={styles.name}>
        {plat.name}
      </Text>
    </Pressable>
  );
}

/** The icon art alone: no label, no press, no badge (notification rows use it small). */
export function AppFace({ platform, size = 64 }: { platform: Platform; size?: number }) {
  const depth = Math.max(2, Math.round(size * 0.07));
  const face = size - depth;
  const radius = Math.round(face * 0.27);
  const colors = platformOf(platform).icon.colors;
  const base = colors[colors.length - 1];

  return (
    <View style={{ width: size, height: size }}>
      {/* The icon's edge, and the shadow it throws on the wallpaper. */}
      <LinearGradient
        colors={[shade(base, -0.2), shade(base, -0.62)]}
        style={[
          styles.layer,
          {
            top: depth,
            left: 0,
            width: size,
            height: face,
            borderRadius: radius,
            boxShadow: `0px ${size * 0.12}px ${size * 0.22}px rgba(0,0,0,0.55)`,
          },
        ]}
      />
      <View style={[styles.layer, { top: 0, left: 0, width: size, height: face, borderRadius: radius, overflow: 'hidden' }]}>
        <LinearGradient
          colors={colors}
          start={platform === 'flashpic' ? { x: 0.1, y: 1 } : { x: 0.2, y: 0 }}
          end={platform === 'flashpic' ? { x: 0.9, y: 0 } : { x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.bevel, { borderRadius: radius }]} />
      </View>
      <View style={[styles.layer, styles.center, { top: 0, left: 0, width: size, height: face }]}>
        <Mark platform={platform} face={face} base={base} />
      </View>
    </View>
  );
}

/** Each app's logo mark, with a shaded extrusion under the lit face. */
function Mark({ platform, face, base }: { platform: Platform; face: number; base: string }) {
  const mark = platformOf(platform).icon.mark;
  const g = Math.round(face * 0.56);
  const d = Math.max(1, Math.round(face * 0.035));
  const under = shade(base, -0.45);

  if (mark === 'lens') {
    const bw = Math.max(2, Math.round(face * 0.07));
    const frame = (color: string, dy: number) => (
      <View
        style={[
          styles.layer,
          styles.center,
          {
            width: g,
            height: g,
            borderRadius: g * 0.3,
            borderWidth: bw,
            borderColor: color,
            transform: [{ translateY: dy }],
          },
        ]}
      >
        <View style={{ width: g * 0.44, height: g * 0.44, borderRadius: g, borderWidth: bw, borderColor: color }} />
        <View
          style={{
            position: 'absolute',
            top: g * 0.12,
            right: g * 0.12,
            width: bw * 1.3,
            height: bw * 1.3,
            borderRadius: bw,
            backgroundColor: color,
          }}
        />
      </View>
    );
    return (
      <View style={[styles.center, { width: g, height: g }]}>
        {frame(under, d)}
        {frame('#FFFFFF', 0)}
      </View>
    );
  }

  if (mark === 'note') {
    const o = Math.max(1.5, face * 0.035);
    return (
      <View style={[styles.center, { width: g, height: g }]}>
        <Ionicons name="musical-note" size={g} color="#25F4EE" style={[styles.layer, { transform: [{ translateX: -o }, { translateY: -o }] }]} />
        <Ionicons name="musical-note" size={g} color="#FE2C55" style={[styles.layer, { transform: [{ translateX: o }, { translateY: o }] }]} />
        <Ionicons name="musical-note" size={g} color="#FFFFFF" />
      </View>
    );
  }

  const glyph = (color: string, dy: number, key?: number) =>
    mark === 'bird' ? (
      <MaterialCommunityIcons key={key} name="bird" size={g} color={color} style={dy ? [styles.layer, { transform: [{ translateY: dy }] }] : null} />
    ) : (
      <Ionicons key={key} name="pulse" size={g} color={color} style={dy ? [styles.layer, { transform: [{ translateY: dy }] }] : null} />
    );

  return (
    <View style={styles.center}>
      {Array.from({ length: d }, (_, i) => glyph(under, i + 1, i))}
      {glyph('#FFFFFF', 0)}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center', gap: 7 },
  layer: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
  bevel: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderTopColor: 'rgba(255,255,255,0.45)',
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 6px rgba(0,0,0,0.45)',
  },
  badgeText: { fontSize: 11, letterSpacing: 0, lineHeight: 13 },
  name: {
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
