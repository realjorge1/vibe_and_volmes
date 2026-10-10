import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCover } from '../../data/coverArt';
import { useAudioStore } from '../../store/audioStore';
import { usePlayerStore } from '../../store/playerStore';
import { shade } from '../../constants/theme';
import { T } from '../phone/T';

interface Props {
  title: string;
  coverArtId: string | null;
  artist: string;
  style?: StyleProp<ViewStyle>;
  /** Small renders (grids, notification thumbs) drop the small print. */
  compact?: boolean;
}

/**
 * Release artwork at full size: the cover the artist picked in the studio,
 * laid out like a real single cover with the title set big and the artist
 * name in the corner.
 */
export function CoverPoster({ title, coverArtId, artist, style, compact }: Props) {
  const c = getCover(coverArtId);
  return (
    <View style={[styles.frame, style]}>
      <LinearGradient colors={[c.top, shade(c.top, -0.25), c.bottom]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.ring, styles.ringBig]} />
      <View style={[styles.ring, styles.ringSmall]} />
      <LinearGradient
        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, compact ? styles.padSmall : styles.pad]}>
        {!compact ? (
          <T size={13} weight="700" color="rgba(255,255,255,0.85)" style={styles.artist}>
            {artist.toUpperCase()}
          </T>
        ) : null}
        <View style={styles.flex} />
        <T
          size={compact ? 14 : 40}
          weight="900"
          color="#FFFFFF"
          lh={compact ? 16 : 42}
          numberOfLines={compact ? 2 : 3}
          style={styles.title}
        >
          {title.toUpperCase()}
        </T>
      </View>
    </View>
  );
}

/** One of the artist's releases, by track id. */
export function OwnCover({ trackId, title, style, compact }: { trackId: string; title: string; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  const coverArtId = useAudioStore((s) => s.producedSongs.find((x) => x.trackId === trackId)?.coverArtId ?? null);
  const artist = usePlayerStore((s) => s.player?.artistName ?? '');
  return <CoverPoster title={title} coverArtId={coverArtId} artist={artist} style={style} compact={compact} />;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#111' },
  flex: { flex: 1 },
  pad: { padding: 22 },
  padSmall: { padding: 8 },
  artist: { letterSpacing: 3 },
  title: { letterSpacing: -1 },
  ring: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 9999 },
  ringBig: { width: '140%', aspectRatio: 1, right: '-70%', top: '-30%' },
  ringSmall: { width: '90%', aspectRatio: 1, right: '-45%', top: '-5%' },
});
