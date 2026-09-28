/**
 * Deterministic, serializable RNG (mulberry32). The single stream lives in
 * World.rngState so saves replay identically — the render layer must never
 * touch this.
 */

export interface RngCarrier {
  rngState: number;
}

export function rand(w: RngCarrier): number {
  w.rngState = (w.rngState + 0x6d2b79f5) | 0;
  let t = w.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(w: RngCarrier, min: number, max: number): number {
  return min + Math.floor(rand(w) * (max - min + 1));
}

export function chance(w: RngCarrier, p: number): boolean {
  return rand(w) < p;
}

export function pick<T>(w: RngCarrier, arr: readonly T[]): T {
  return arr[Math.floor(rand(w) * arr.length)];
}

export function shuffled<T>(w: RngCarrier, arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand(w) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
