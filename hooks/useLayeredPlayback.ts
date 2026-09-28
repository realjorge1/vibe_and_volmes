import { useEffect, useRef, useState, useCallback } from 'react';
import type { MixSettings } from '../types/audio';
import type { LayeredStatus, PlaybackEngine } from '../audio/playback/layeredPlayback';
import { createPlaybackEngine } from '../audio/playback/fxEngine';
import type { PlaybackSource } from '../audio/playback/audioPlayer';

export interface UseLayeredPlayback {
  playing: boolean;
  positionSec: number;
  durationSec: number;
  toggle: () => void;
  stop: () => void;
}

/**
 * Studio preview: beat (looping) + vocal, synced, mix-aware. Rebuilds the
 * underlying players only when the actual sources change; mix changes are
 * applied live without reloading so dragging a volume slider is smooth.
 */
export function useLayeredPlayback(
  beatSource: PlaybackSource | null,
  vocalUri: string | null,
  mix: MixSettings
): UseLayeredPlayback {
  const ref = useRef<PlaybackEngine | null>(null);
  const [status, setStatus] = useState<LayeredStatus>({
    playing: false,
    positionSec: 0,
    durationSec: 0,
    didJustFinish: false,
  });

  const sourceKey = `${typeof beatSource === 'number' ? beatSource : (beatSource as any)?.uri ?? 'none'}|${vocalUri ?? 'none'}`;

  useEffect(() => {
    const p = createPlaybackEngine(mix);
    p.setStatusListener(setStatus);
    p.load(beatSource, vocalUri);
    ref.current = p;
    return () => {
      p.release();
      ref.current = null;
    };
    // Reload only when the audio sources change, not on mix tweaks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  // Live mix updates without tearing down playback.
  useEffect(() => {
    ref.current?.setMix(mix);
  }, [mix]);

  const toggle = useCallback(() => {
    const p = ref.current;
    if (!p) return;
    if (p.isPlaying) p.pause();
    else p.play();
    setStatus((s) => ({ ...s, playing: !p.isPlaying }));
  }, []);

  const stop = useCallback(() => {
    ref.current?.stop();
    setStatus((s) => ({ ...s, playing: false, positionSec: 0 }));
  }, []);

  return {
    playing: status.playing,
    positionSec: status.positionSec,
    durationSec: status.durationSec,
    toggle,
    stop,
  };
}
