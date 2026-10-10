import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { planAvatar } from '../../systems/visuals/scenes';
import { Photo } from '../visuals/Photo';
import { T } from './T';

type Stops = readonly [string, string, ...string[]];

const STORY_RING: Stops = ['#FFC65C', '#FF5E62', '#E1306C', '#8A3AB9'];

interface Props {
  /** Account id: decides the kind of picture (outlet logo, photo, default). */
  id: string;
  name: string;
  size?: number;
  /** Story ring around the avatar: unseen (gradient) or seen (grey). */
  ring?: 'new' | 'seen';
  ringColors?: Stops;
  /** The app's background, drawn as the gap between ring and face. */
  gapColor?: string;
  /** Square-ish outlet logos (news apps) instead of a circle. */
  shape?: 'circle' | 'rounded';
}

/**
 * A profile picture the way real ones look: outlets have logos, stans use a
 * photo of their artist, most people use their pet or a sunset, and some
 * never changed the default.
 */
export function Avatar({ id, name, size = 36, ring, ringColors = STORY_RING, gapColor = '#000', shape = 'circle' }: Props) {
  const plan = useMemo(() => planAvatar(id, name), [id, name]);
  const radius = shape === 'circle' ? size / 2 : Math.round(size * 0.22);
  const box = { width: size, height: size, borderRadius: radius, overflow: 'hidden' as const };

  let face: React.ReactNode;
  if (plan.kind === 'photo') {
    face = <Photo photo={plan.photo} style={box} />;
  } else if (plan.kind === 'logo') {
    const lines = plan.text.split('\n');
    const longest = Math.max(...lines.map((l) => l.length));
    const fs = Math.min(size * 0.42, (size * 0.92) / Math.max(1.6, longest * 0.62)) / (lines.length > 1 ? 1.15 : 1);
    face = (
      <View style={[box, styles.center, { backgroundColor: plan.bg }]}>
        <T size={fs} weight="900" color={plan.fg} center lh={fs * 1.02} style={styles.logo}>
          {plan.text}
        </T>
      </View>
    );
  } else if (plan.kind === 'letter') {
    face = (
      <View style={[box, styles.center, { backgroundColor: plan.bg }]}>
        <T size={size * 0.46} weight="500" color="#FFFFFF" lh={size * 0.56}>
          {plan.letter}
        </T>
      </View>
    );
  } else {
    face = (
      <View style={[box, styles.default]}>
        <Ionicons name="person" size={size * 0.82} color="#F5F8FA" style={{ marginTop: size * 0.24 }} />
      </View>
    );
  }

  if (!ring) return <>{face}</>;

  const pad = Math.max(2, Math.round(size * 0.05));
  const outer = size + pad * 4;
  return (
    <View style={[styles.center, { width: outer, height: outer }]}>
      {ring === 'new' ? (
        <LinearGradient
          colors={ringColors}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: outer / 2 }]}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.seen, { borderRadius: outer / 2 }]} />
      )}
      <View
        style={[
          styles.center,
          {
            width: size + pad * 2,
            height: size + pad * 2,
            borderRadius: (size + pad * 2) / 2,
            backgroundColor: gapColor,
          },
        ]}
      >
        {face}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  logo: { letterSpacing: -0.5 },
  default: { backgroundColor: '#B8C4CC', alignItems: 'center', justifyContent: 'flex-start' },
  seen: { backgroundColor: 'rgba(160,160,170,0.45)' },
});
