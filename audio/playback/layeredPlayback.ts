import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { MixSettings } from '../../types/audio';
import type { PlaybackSource } from './audioPlayer';
import { REVERB_GAIN, COMPRESSION_GAIN } from '../../constants/audioConfig';

export interface LayeredStatus {
  playing: boolean;
  positionSec: number;
  durationSec: number;
  didJustFinish: boolean;
}

/**
 * Common surface for a studio-preview engine. Two implementations satisfy it:
 * `LayeredPlayer` (expo-audio, volume-only) and `FxPlayer` (real-time Web Audio
 * graph with live DJ FX). The hook picks whichever the runtime supports.
 */
export interface PlaybackEngine {
  setStatusListener(cb: (s: LayeredStatus) => void): void;
  load(beatSource: PlaybackSource | null, vocalUri: string | null): void;
  setMix(mix: MixSettings): void;
  play(): void;
  pause(): void;
  stop(): void | Promise<void>;
  readonly isPlaying: boolean;
  release(): void;
}

/**
 * The Phase 2 "mixdown": instead of rendering a single file (needs a heavy
 * native DSP module), we play the beat and the vocal as two synced players.
 * The beat loops under the vocal; the vocal is the timeline. Mix settings map
 * to per-player gain — reverb/compression are applied perceptually as gain
 * trims (see audioConfig) so it feels like a creator tool, not a DAW.
 */
export class LayeredPlayer implements PlaybackEngine {
  private beat: AudioPlayer | null = null;
  private vocal: AudioPlayer | null = null;
  private sub: { remove: () => void } | null = null;
  private mix: MixSettings;
  private onStatus?: (s: LayeredStatus) => void;

  constructor(mix: MixSettings) {
    this.mix = mix;
  }

  load(beatSource: PlaybackSource | null, vocalUri: string | null) {
    this.release();
    try {
      if (beatSource != null) {
        const b = createAudioPlayer(beatSource, { updateInterval: 120 });
        b.loop = true;
        this.beat = b;
      }
      if (vocalUri) {
        const v = createAudioPlayer({ uri: vocalUri }, { updateInterval: 120 });
        v.loop = false;
        // Drive the public timeline off the vocal when we have one.
        this.sub = v.addListener('playbackStatusUpdate', (st: any) => {
          this.onStatus?.({
            playing: !!st?.playing,
            positionSec: (st?.currentTime ?? 0) as number,
            durationSec: (st?.duration ?? 0) as number,
            didJustFinish: !!st?.didJustFinish,
          });
          if (st?.didJustFinish) this.stop();
        });
        this.vocal = v;
      } else if (this.beat) {
        this.sub = this.beat.addListener('playbackStatusUpdate', (st: any) => {
          this.onStatus?.({
            playing: !!st?.playing,
            positionSec: (st?.currentTime ?? 0) as number,
            durationSec: (st?.duration ?? 0) as number,
            didJustFinish: false,
          });
        });
      }
      this.applyMix();
    } catch {
      this.beat = null;
      this.vocal = null;
    }
  }

  setStatusListener(cb: (s: LayeredStatus) => void) {
    this.onStatus = cb;
  }

  setMix(mix: MixSettings) {
    this.mix = mix;
    this.applyMix();
  }

  private applyMix() {
    try {
      if (this.beat) {
        this.beat.volume = clampGain(
          this.mix.beatVolume *
            REVERB_GAIN[this.mix.reverb] *
            COMPRESSION_GAIN[this.mix.compression]
        );
      }
      if (this.vocal) {
        this.vocal.volume = clampGain(
          this.mix.vocalVolume *
            REVERB_GAIN[this.mix.reverb] *
            COMPRESSION_GAIN[this.mix.compression]
        );
      }
    } catch {
      /* noop */
    }
  }

  play() {
    try {
      // Start as close to simultaneously as the bridge allows.
      this.beat?.play();
      this.vocal?.play();
    } catch {
      /* noop */
    }
  }

  pause() {
    try {
      this.beat?.pause();
      this.vocal?.pause();
    } catch {
      /* noop */
    }
  }

  async stop() {
    try {
      this.beat?.pause();
      this.vocal?.pause();
      await this.beat?.seekTo(0);
      await this.vocal?.seekTo(0);
    } catch {
      /* noop */
    }
  }

  get isPlaying(): boolean {
    try {
      return !!(this.vocal?.playing || this.beat?.playing);
    } catch {
      return false;
    }
  }

  release() {
    try {
      this.sub?.remove();
      this.beat?.remove();
      this.vocal?.remove();
    } catch {
      /* noop */
    }
    this.sub = null;
    this.beat = null;
    this.vocal = null;
  }
}

function clampGain(v: number): number {
  return Math.max(0, Math.min(1, v));
}
