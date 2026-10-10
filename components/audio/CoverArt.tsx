import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCover, COVER_ART } from '../../data/coverArt';
import { Text } from '../ui/Typography';
import { COLORS, GRADIENTS, RADIUS, SPACING } from '../../constants/theme';

/** A single glossy cover with the song's initials over faint pressed grooves. */
export function CoverArt({
  coverArtId,
  title,
  size = 64,
}: {
  coverArtId: string | null;
  title: string;
  size?: number;
}) {
  const c = getCover(coverArtId);
  const initials =
    title
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '♪';
  const radius = Math.max(RADIUS.sm, Math.round(size * 0.18));
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        boxShadow: `0px ${Math.round(size * 0.1)}px ${Math.round(size * 0.35)}px rgba(0,0,0,0.5)`,
      }}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
        <LinearGradient
          colors={[c.top, c.bottom]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.groove,
            { width: size * 1.3, height: size * 1.3, borderRadius: size, right: -size * 0.55, bottom: -size * 0.55 },
          ]}
        />
        <View
          style={[
            styles.groove,
            { width: size * 0.9, height: size * 0.9, borderRadius: size, right: -size * 0.35, bottom: -size * 0.35 },
          ]}
        />
        <LinearGradient colors={GRADIENTS.sheen} style={styles.sheen} />
        <View style={[styles.rim, { borderRadius: radius }]} />
      </View>
      <View style={styles.center}>
        <Text
          variant="title"
          color="#FFFFFF"
          weight="black"
          style={[styles.initials, { fontSize: Math.max(12, size * 0.3), lineHeight: Math.max(16, size * 0.38) }]}
        >
          {initials}
        </Text>
      </View>
    </View>
  );
}

/** Grid picker used in the finalize step. */
export function CoverArtPicker({
  selected,
  title,
  onSelect,
}: {
  selected: string | null;
  title: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {COVER_ART.map((c) => {
        const on = c.id === selected;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            style={[styles.cell, on && styles.cellOn]}
          >
            <CoverArt coverArtId={c.id} title={title} size={72} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  groove: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  rim: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  initials: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  cell: {
    borderRadius: RADIUS.md + 4,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 3,
  },
  cellOn: { borderColor: COLORS.primary },
});
