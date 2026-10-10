import { useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { ClipSoundSpec } from '../../systems/visuals/clips';
import { hashOf } from '../../systems/visuals/photoIndex';
import { BEAT_CATALOG, getBeat } from '../../data/beats/beatCatalog';
import { useAudioStore } from '../../store/audioStore';
import { useMusicStore } from '../../store/musicStore';
import { usePlayerStore } from '../../store/playerStore';
import type { ProducedSong } from '../../types/audio';

export interface ResolvedSound {
  /** Instrumental asset (require id), if any. */
  beat: number | null;
  /** The artist's recorded vocal, if the sound is one of their songs. */
  vocal: string | null;
  /** What the sound row says: "Title - Artist" or "original sound - handle". */
  label: string;
  /** Start point inside the instrumental, seconds. */
  offset: number;
  rate: number;
  /** True when it is one of the artist's own songs. */
  mine: boolean;
}

function beatFor(seed: string): { asset: number | null; title: string } {
  const playable = BEAT_CATALOG.filter((b) => b.asset != null);
  const pool = playable.length > 0 ? playable : BEAT_CATALOG;
  const b = pool[hashOf(seed) % pool.length];
  return { asset: (b?.asset as number | null | undefined) ?? null, title: b?.title ?? 'original sound' };
}

function songSound(song: ProducedSong | null, title: string, artist: string, seed: string, rate: number): ResolvedSound {
  const beat = song ? getBeat(song.beatId) : null;
  return {
    beat: (beat?.asset as number | null | undefined) ?? beatFor(seed).asset,
    vocal: song?.recordingUri ?? null,
    label: `${title} - ${artist}`,
    offset: 0,
    rate,
    mine: true,
  };
}

/** Turn a clip's sound spec into something playable, from today's stores. */
export function resolveClipSound(spec: ClipSoundSpec, seed: string, creatorHandle: string): ResolvedSound {
  const artist = usePlayerStore.getState().player?.artistName ?? '';
  const audio = useAudioStore.getState();
  if (spec.kind === 'own') {
    const song = audio.producedSongs.find((s) => s.trackId === spec.trackId) ?? null;
    const track = useMusicStore.getState().discography.find((t) => t.id === spec.trackId);
    return songSound(song, track?.title ?? song?.title ?? 'original sound', artist, seed, spec.rate);
  }
  if (spec.kind === 'track') {
    const track = useMusicStore.getState().getLatestTrack();
    if (track) {
      const song = audio.producedSongs.find((s) => s.trackId === track.id) ?? null;
      return songSound(song, track.title, artist, seed, spec.rate);
    }
  }
  const chosen = spec.kind === 'beat' && spec.beatId ? getBeat(spec.beatId) : null;
  const beat = chosen ? { asset: (chosen.asset as number | null | undefined) ?? null, title: chosen.title } : beatFor(seed);
  return {
    beat: beat.asset,
    vocal: null,
    label: `original sound - ${creatorHandle}`,
    offset: (hashOf(`${seed}:at`) % 4) * 15,
    rate: spec.rate,
    mine: false,
  };
}

function setRate(p: AudioPlayer, rate: number) {
  if (rate === 1) return;
  try {
    // "Slowed" edits drop the pitch with the tempo, like the real ones.
    p.shouldCorrectPitch = false;
    p.setPlaybackRate(rate);
  } catch {
    // Older runtimes play at normal speed.
  }
}

/**
 * Play a clip's sound while it is the one on screen: the instrumental loops,
 * the artist's vocal rides on top when it is their song. Pauses when the app
 * goes to the background; releases everything on unmount.
 */
export function useClipSound(sound: ResolvedSound | null, playing: boolean, muted = false) {
  const beatRef = useRef<AudioPlayer | null>(null);
  const vocalRef = useRef<AudioPlayer | null>(null);
  const key = sound ? `${sound.beat}|${sound.vocal}|${sound.rate}|${sound.offset}` : '';
  // Stable for the life of the key, so a re-render never restarts the song.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const src = useMemo(() => sound, [key]);

  // Drop the players when the sound itself changes, and on unmount.
  useEffect(() => {
    return () => {
      for (const ref of [beatRef, vocalRef]) {
        try {
          ref.current?.remove();
        } catch {
          // Already released.
        }
        ref.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    if (!src) return;
    const pauseAll = () => {
      try {
        beatRef.current?.pause();
        vocalRef.current?.pause();
      } catch {
        // Released mid-flight.
      }
    };
    if (!playing) {
      pauseAll();
      return;
    }
    try {
      if (!beatRef.current && src.beat != null) {
        const b = createAudioPlayer(src.beat);
        b.loop = true;
        setRate(b, src.rate);
        if (src.offset > 0) void b.seekTo(src.offset);
        beatRef.current = b;
      }
      if (!vocalRef.current && src.vocal) {
        const v = createAudioPlayer({ uri: src.vocal });
        v.loop = true;
        setRate(v, src.rate);
        vocalRef.current = v;
      }
      for (const p of [beatRef.current, vocalRef.current]) {
        if (!p) continue;
        p.muted = muted;
        p.play();
      }
    } catch {
      // No audio engine (web / tests): the clip still plays silently.
    }
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') {
        pauseAll();
        return;
      }
      // Back in the app with this clip still on screen: the sound picks up again.
      try {
        beatRef.current?.play();
        vocalRef.current?.play();
      } catch {
        // Released meanwhile.
      }
    });
    return () => {
      sub.remove();
      pauseAll();
    };
  }, [src, playing, muted]);
}
