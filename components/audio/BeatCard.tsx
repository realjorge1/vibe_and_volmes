import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Beat } from '../../types/audio';
import { SimplePlayer } from '../../audio/playback/audioPlayer';
import { Text } from '../ui/Typography';
import { PressableScale } from '../ui/PressableScale';
import { Equalizer } from '../fx/Equalizer';
import { COLORS, GRADIENTS, RADIUS, SPACING, withAlpha } from '../../constants/theme';

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
    <PressableScale
      onPress={onSelect}
      scaleTo={0.98}
      style={[
        styles.card,
        selected && {
          borderColor: withAlpha(COLORS.primary, 0.85),
        },
      ]}
    >
      {selected && (
        <LinearGradient
          colors={[withAlpha(COLORS.primary, 0.26), withAlpha(COLORS.secondary, 0.06)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.left}>
        <View style={styles.titleRow}>
          {selected && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />}
          <Text variant="subheading" style={styles.flex} numberOfLines={1}>
            {beat.title}
          </Text>
        </View>
        <Text variant="caption" muted style={styles.meta}>
          {beat.producer} · {beat.bpm} BPM · {beat.musicalKey}
        </Text>
        <View style={styles.quality}>
          <Meter label="QUALITY" value={beat.quality} color={COLORS.accent} />
          <Meter label="PRODUCER" value={beat.producerReputation} color={COLORS.gold} />
        </View>
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
        <LinearGradient
          colors={previewing ? GRADIENTS.brand : GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.playRound]}
        />
        {previewing ? (
          <Equalizer bars={4} height={16} barWidth={3} gap={2} colors={['#FFFFFF', 'rgba(255,255,255,0.7)']} />
        ) : (
          <Ionicons name="play" size={20} color="#FFFFFF" style={styles.playIcon} />
        )}
      </Pressable>
    </PressableScale>
  );
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text variant="label" muted style={styles.meterLabel}>
          {label}
        </Text>
        <Text variant="label" color={color} style={styles.meterLabel}>
          {Math.round(value)}
        </Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Tag({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <View style={[styles.tag, dim && styles.tagDim]}>
      <Text variant="label" color={dim ? COLORS.textMuted : COLORS.textSecondary} style={styles.tagText}>
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
    borderColor: COLORS.border,
    borderTopColor: 'rgba(255,255,255,0.14)',
    padding: SPACING.base,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  left: { flex: 1, paddingRight: SPACING.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { marginTop: 2 },
  quality: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  meter: { flex: 1 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  meterLabel: { fontSize: 9 },
  meterTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' },
  meterFill: { height: 4, borderRadius: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  tagText: { fontSize: 9.5 },
  tagDim: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
  play: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playRound: { borderRadius: 24 },
  playIcon: { marginLeft: 2 },
  playDim: { opacity: 0.4 },
});
