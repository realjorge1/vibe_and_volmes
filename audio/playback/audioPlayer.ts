import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

export type PlaybackSource = number | { uri: string };

export interface PlaybackStatus {
  isLoaded: boolean;
  playing: boolean;
  positionSec: number;
  durationSec: number;
  didJustFinish: boolean;
}

/**
 * Thin, defensive wrapper around a single expo-audio player. Used for beat
 * previews and recording playback. Every call is null-guarded so a released
 * player can't crash the UI — important on Android where players get torn
 * down aggressively.
 */
export class SimplePlayer {
  private player: AudioPlayer | null = null;
  private sub: { remove: () => void } | null = null;
  private onStatus?: (s: PlaybackStatus) => void;

  load(source: PlaybackSource, opts: { loop?: boolean; volume?: number } = {}) {
    this.release();
    try {
      const p = createAudioPlayer(source, { updateInterval: 100 });
      p.loop = opts.loop ?? false;
      p.volume = opts.volume ?? 1;
      this.sub = p.addListener('playbackStatusUpdate', (st: any) => {
        this.onStatus?.({
          isLoaded: !!st?.isLoaded,
          playing: !!st?.playing,
          positionSec: (st?.currentTime ?? 0) as number,
          durationSec: (st?.duration ?? 0) as number,
          didJustFinish: !!st?.didJustFinish,
        });
      });
      this.player = p;
    } catch {
      this.player = null;
    }
  }

  setStatusListener(cb: (s: PlaybackStatus) => void) {
    this.onStatus = cb;
  }

  play() {
    try {
      this.player?.play();
    } catch {
      /* noop */
    }
  }

  pause() {
    try {
      this.player?.pause();
    } catch {
      /* noop */
    }
  }

  async seek(sec: number) {
    try {
      await this.player?.seekTo(sec);
    } catch {
      /* noop */
    }
  }

  setVolume(v: number) {
    try {
      if (this.player) this.player.volume = Math.max(0, Math.min(1, v));
    } catch {
      /* noop */
    }
  }

  get isPlaying(): boolean {
    try {
      return !!this.player?.playing;
    } catch {
      return false;
    }
  }

  release() {
    try {
      this.sub?.remove();
      this.player?.remove();
    } catch {
      /* noop */
    }
    this.sub = null;
    this.player = null;
  }
}
