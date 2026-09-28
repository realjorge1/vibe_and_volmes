import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { getCover, COVER_ART } from '../../data/coverArt';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

/** A single cover swatch with the song's initials. */
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
  return (
    <View style={{ width: size, height: size, borderRadius: RADIUS.md, overflow: 'hidden' }}>
      <View style={[styles.half, { backgroundColor: c.top }]} />
      <View style={[styles.half, { backgroundColor: c.bottom }]} />
      <View style={styles.center}>
        <Text variant="heading" color="#FFFFFF" weight="black">
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
  half: { flex: 1 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  cell: {
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  cellOn: { borderColor: COLORS.primary },
});
