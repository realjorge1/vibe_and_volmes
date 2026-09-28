/**
 * Deterministic random number generation for the NPC Life Engine.
 *
 * The whole world simulation is reproducible: the same seed always produces
 * the same history. To achieve that we never touch `Math.random` (which is
 * what `utils/random.ts` uses — that module is for cosmetic, non-replayable
 * UI rolls). Instead the engine threads explicit `Rng` instances derived
 * from the world seed.
 *
 * Determinism strategy for the weekly tick:
 *   weekSeed   = hash32(worldSeed, week)
 *   npcSeed    = hash32(weekSeed, npcIndex)
 *   actionRng  = new Rng(npcSeed)
 * Because each NPC's randomness is a pure function of (seed, week, index),
 * NPC processing is order-stable and can be batched/parallelised without
 * changing outcomes.
 */

/** Clamp a value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * FNV-1a style 32-bit hash over a list of integers. Used to fold seeds
 * together into well-distributed sub-seeds.
 */
export function hash32(...nums: number[]): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < nums.length; i++) {
    h ^= nums[i] | 0;
    h = Math.imul(h, 0x01000193);
  }
  // extra avalanche
  h ^= h >>> 16;
  h = Math.imul(h, 0x21f0aaad);
  h ^= h >>> 15;
  return h >>> 0;
}

/** Stable 32-bit hash of a string (e.g. an NPC id) into a seed. */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Small, fast, statistically-fine PRNG (mulberry32). Not cryptographic —
 * we only need reproducibility and decent distribution for gameplay.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    // Guarantee a non-zero 32-bit state.
    this.state = (seed | 0) >>> 0 || 0x9e3779b9;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max <= min) return min;
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with probability p (0..1). */
  chance(p: number): boolean {
    return this.next() < p;
  }

  bool(): boolean {
    return this.next() < 0.5;
  }

  /** Uniform pick from a non-empty array. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Roughly-gaussian sample (sum of 3 uniforms), clamped-friendly. */
  gauss(mean: number, stdDev: number): number {
    const u = this.next() + this.next() + this.next() - 1.5; // mean 0, ~unit-ish
    return mean + (u / 1.5) * stdDev;
  }

  /**
   * Weighted pick. `weightOf` maps an item to a non-negative weight. Returns
   * null only if the list is empty or every weight is <= 0.
   */
  weightedPick<T>(items: readonly T[], weightOf: (item: T) => number): T | null {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const w = weightOf(items[i]);
      if (w > 0) total += w;
    }
    if (total <= 0) return null;
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      const w = weightOf(items[i]);
      if (w <= 0) continue;
      r -= w;
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Fisher-Yates shuffle into a new array. */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }
}
