import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Beat } from '../../types/audio';
import { SimplePlayer } from '../../audio/playback/audioPlayer';
import { Text } from '../ui/Typography';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface Props {
  beat: Beat;
  selected: boolean;
  onSelect: () => void;
}

/** A tappable beat tile with an inline preview toggle. */
export function BeatCard({ beat, selected, onSelect }: Props) {
  const playerRef = useRef<SimplePlayer | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const hasAudio = beat.asset != null;

  useEffect(() => {
    return () => playerRef.current?.release();
  }, []);

  const togglePreview = () => {
    if (!hasAudio) return;
    let p = playerRef.current;
    if (!p) {
      p = new SimplePlayer();
      p.setStatusListener((s) => {
        if (s.didJustFinish) setPreviewing(false);
      });
      p.load(beat.asset as number, { loop: true, volume: 0.9 });
      playerRef.current = p;
    }
    if (p.isPlaying) {
      p.pause();
      setPreviewing(false);
    } else {
      p.play();
      setPreviewing(true);
    }
  };

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.card,
        { borderColor: selected ? COLORS.primary : COLORS.border },
      ]}
    >
      <View style={styles.left}>
        <Text variant="subheading">{beat.title}</Text>
        <Text variant="caption" muted style={styles.meta}>
          {beat.producer} · {beat.bpm} BPM · {beat.musicalKey}
        </Text>
        <Text variant="caption" muted style={styles.meta}>
          Quality {beat.quality} · Producer rep {beat.producerReputation}
        </Text>
        <View style={styles.tags}>
          <Tag label={beat.genre} />
          <Tag label={beat.mood} />
          {!hasAudio && <Tag label="audio pending" dim />}
        </View>
      </View>

      <Pressable
        onPress={togglePreview}
        disabled={!hasAudio}
        hitSlop={8}
        style={[styles.play, !hasAudio && styles.playDim]}
      >
        <Ionicons
          name={previewing ? 'pause' : 'play'}
          size={20}
          color={hasAudio ? COLORS.text : COLORS.textMuted}
        />
      </Pressable>
    </Pressable>
  );
}

function Tag({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <View style={[styles.tag, dim && styles.tagDim]}>
      <Text variant="label" color={dim ? COLORS.textMuted : COLORS.textSecondary}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.base,
    marginBottom: SPACING.md,
  },
  left: { flex: 1, paddingRight: SPACING.md },
  meta: { marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  tag: {
    backgroundColor: COLORS.surface2,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tagDim: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  play: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDim: { opacity: 0.4 },
});
