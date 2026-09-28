import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from 'expo-audio';
import type { VocalRecording } from '../types/audio';
import {
  VOCAL_RECORDING_OPTIONS,
  MAX_RECORDING_SEC,
  METERING_INTERVAL_MS,
} from '../constants/audioConfig';
import {
  requestMicPermission,
  getMicPermission,
  enterRecordingMode,
  exitRecordingMode,
  persistRecording,
  deleteRecording,
  isUsableTake,
} from '../audio/recording/recorder';
import { meteringToAmplitude, normalizePeaks } from '../audio/waveform/waveform';

export type RecorderStatus =
  | 'idle'
  | 'no-permission'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'error';

export interface UseVocalRecorder {
  status: RecorderStatus;
  durationSec: number;
  /** Live, growing 0..1 peak stream for the realtime waveform. */
  livePeaks: number[];
  error: string | null;
  atLimit: boolean;
  /** Set when a take finishes (manual stop OR the 2-min auto-cap). */
  result: VocalRecording | null;
  clearResult: () => void;
  requestPermission: () => Promise<boolean>;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  /** Stops, persists the take, returns it (or null if unusable). */
  stop: () => Promise<VocalRecording | null>;
  cancel: () => Promise<void>;
}

/**
 * Hook wrapper around expo-audio's recorder. Owns the live metering poll,
 * the 2-minute hard cap, audio-session entry/exit, interruption-safe cleanup,
 * and persisting the finished take into our sandbox. UI just calls start/stop.
 */
export function useVocalRecorder(): UseVocalRecorder {
  const recorder = useAudioRecorder(VOCAL_RECORDING_OPTIONS);

  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [durationSec, setDurationSec] = useState(0);
  const [livePeaks, setLivePeaks] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VocalRecording | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const peaksRef = useRef<number[]>([]);
  const dbRef = useRef<number[]>([]);
  const stoppingRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopInternal = useCallback(async (): Promise<string | null> => {
    clearPoll();
    try {
      await recorder.stop();
    } catch {
      /* recorder may already be stopped by an interruption */
    }
    await exitRecordingMode();
    return recorder.uri ?? null;
  }, [clearPoll, recorder]);

  // Safety net: tear everything down if the screen unmounts mid-take.
  useEffect(() => {
    return () => {
      clearPoll();
      recorder.stop().catch(() => {});
      exitRecordingMode();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermission = useCallback(async () => {
    const ok = (await getMicPermission()) || (await requestMicPermission());
    setStatus(ok ? 'idle' : 'no-permission');
    return ok;
  }, []);

  const finalize = useCallback(async (): Promise<VocalRecording | null> => {
    setStatus('processing');
    const uri = await stopInternal();
    const finalDuration = durationSecRef.current;
    if (!uri || !isUsableTake(finalDuration)) {
      if (uri) deleteRecording(uri);
      setStatus('idle');
      return null;
    }
    const id = `rec-${Date.now()}`;
    const persisted = persistRecording(uri, id);
    deleteRecording(uri); // remove the OS temp copy regardless
    if (!persisted) {
      setError('Could not save the recording.');
      setStatus('error');
      return null;
    }
    const db = dbRef.current;
    const meteringAvg =
      db.length > 0 ? db.reduce((a, b) => a + b, 0) / db.length : -45;
    const rec: VocalRecording = {
      id: persisted.id,
      uri: persisted.uri,
      durationSec: Math.round(finalDuration),
      createdAt: Date.now(),
      peaks: normalizePeaks(peaksRef.current),
      meteringAvg,
    };
    setStatus('idle');
    setResult(rec);
    return rec;
  }, [stopInternal]);

  // Keep latest duration available to finalize without stale closures.
  const durationSecRef = useRef(0);
  useEffect(() => {
    durationSecRef.current = durationSec;
  }, [durationSec]);

  const beginPoll = useCallback(() => {
    const startedAt = Date.now() - durationSecRef.current * 1000;
    pollRef.current = setInterval(async () => {
      let metering = -60;
      try {
        const st = recorder.getStatus?.();
        if (st && typeof st.metering === 'number') metering = st.metering;
      } catch {
        /* getStatus unsupported on web — fall back to silence */
      }
      const amp = meteringToAmplitude(metering);
      peaksRef.current = [...peaksRef.current, amp].slice(-600);
      dbRef.current.push(metering);
      setLivePeaks(peaksRef.current);

      const elapsed = (Date.now() - startedAt) / 1000;
      setDurationSec(elapsed);
      if (elapsed >= MAX_RECORDING_SEC && !stoppingRef.current) {
        stoppingRef.current = true;
        await finalize();
        stoppingRef.current = false;
      }
    }, METERING_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder, finalize]);

  const start = useCallback(async () => {
    setError(null);
    const ok = (await getMicPermission()) || (await requestMicPermission());
    if (!ok) {
      setStatus('no-permission');
      return;
    }
    peaksRef.current = [];
    dbRef.current = [];
    setLivePeaks([]);
    setDurationSec(0);
    durationSecRef.current = 0;
    setResult(null);
    try {
      await enterRecordingMode();
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
      beginPoll();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recording failed to start.');
      setStatus('error');
      await exitRecordingMode();
    }
  }, [recorder, beginPoll]);

  const pause = useCallback(() => {
    if (status !== 'recording') return;
    try {
      recorder.pause();
      clearPoll();
      setStatus('paused');
    } catch {
      /* noop */
    }
  }, [recorder, status, clearPoll]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    try {
      recorder.record();
      setStatus('recording');
      beginPoll();
    } catch {
      /* noop */
    }
  }, [recorder, status, beginPoll]);

  const stop = useCallback(async () => {
    if (status !== 'recording' && status !== 'paused') return null;
    return await finalize();
  }, [status, finalize]);

  const cancel = useCallback(async () => {
    const uri = await stopInternal();
    if (uri) deleteRecording(uri);
    peaksRef.current = [];
    dbRef.current = [];
    setLivePeaks([]);
    setDurationSec(0);
    setStatus('idle');
  }, [stopInternal]);

  return {
    status,
    durationSec,
    livePeaks,
    error,
    atLimit: durationSec >= MAX_RECORDING_SEC,
    result,
    clearResult: () => setResult(null),
    requestPermission,
    start,
    pause,
    resume,
    stop,
    cancel,
  };
}
