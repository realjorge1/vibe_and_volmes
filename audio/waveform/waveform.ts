import { WAVEFORM_BUCKETS } from '../../constants/audioConfig';
import { clamp } from '../../utils/random';

/**
 * Lightweight waveform utilities. We never decode PCM (too heavy on low-end
 * Android) — instead we sample the recorder's live metering and store a small
 * fixed-size peak array. Cheap to compute, cheap to render, good enough to
 * feel real.
 */

const SILENCE_FLOOR_DB = -60;

/** expo-audio metering is ~dBFS (-160..0). Map to a 0..1 amplitude. */
export function meteringToAmplitude(db: number): number {
  if (!Number.isFinite(db)) return 0;
  if (db <= SILENCE_FLOOR_DB) return 0;
  if (db >= 0) return 1;
  return clamp((db - SILENCE_FLOOR_DB) / -SILENCE_FLOOR_DB, 0, 1);
}

/**
 * Resample an arbitrary-length live peak stream down to a fixed bucket count
 * so every recording has a comparable, compact waveform regardless of length.
 */
export function normalizePeaks(
  raw: number[],
  buckets: number = WAVEFORM_BUCKETS
): number[] {
  if (raw.length === 0) return new Array(buckets).fill(0);
  if (raw.length <= buckets) {
    const pad = new Array(buckets - raw.length).fill(0);
    return [...raw.map((v) => clamp(v, 0, 1)), ...pad];
  }
  const out: number[] = [];
  const span = raw.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor(i * span);
    const end = Math.floor((i + 1) * span);
    let max = 0;
    for (let j = start; j < end; j++) max = Math.max(max, raw[j]);
    out.push(clamp(max, 0, 1));
  }
  return out;
}

/** A flat, gently varied placeholder waveform for beats / silent takes. */
export function placeholderPeaks(buckets: number = WAVEFORM_BUCKETS): number[] {
  return Array.from({ length: buckets }, (_, i) =>
    0.25 + 0.18 * Math.abs(Math.sin(i * 0.6))
  );
}

/**
 * Crude timing-stability proxy from the peak envelope: steady energy with
 * natural dynamics scores well; long dead air or clipping-flat takes don't.
 * Returns 0..100. Used by the scoring engine, not shown raw to the player.
 */
export function estimateTimingStability(peaks: number[]): number {
  const voiced = peaks.filter((p) => p > 0.06);
  if (voiced.length < 4) return 25;
  const coverage = voiced.length / peaks.length; // how much is actually voiced
  const mean = voiced.reduce((a, b) => a + b, 0) / voiced.length;
  const variance =
    voiced.reduce((a, b) => a + (b - mean) ** 2, 0) / voiced.length;
  const std = Math.sqrt(variance);
  // Want decent coverage + dynamics that aren't a flat wall or pure noise.
  const dynamics = 1 - Math.abs(std - 0.18) / 0.5;
  return clamp(Math.round((coverage * 0.6 + dynamics * 0.4) * 100), 5, 100);
}
