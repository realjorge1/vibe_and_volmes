import type { Moment, MomentKind, MomentSpec } from '../../types/drama';

/**
 * Moment lifecycle (pure). A moment starts at its heat and cools every week;
 * scandals linger, memes burn fast, best moments fade slowly but never turn
 * sour. The Chronicle keeps the loud ones.
 */

/** Heat lost per week by kind (before the "nobody is talking about it" floor). */
export const COOLING: Record<MomentKind, number> = {
  scandal: 9,
  ugly: 14,
  charity: 12,
  best: 10,
  romance: 11,
  beef: 8,
  meme: 18,
  flop: 13,
};

let seq = 0;

export function makeMoment(spec: MomentSpec, week: number, extra: Partial<Moment> = {}, idSeed?: string): Moment {
  seq += 1;
  return {
    ...spec,
    heat: Math.max(0, Math.min(100, spec.heat)),
    id: idSeed ?? `m-${week}-${Date.now().toString(36)}-${seq}`,
    week,
    peak: spec.heat,
    ...extra,
  };
}

/** One week of cooling. Returns the moments still burning. */
export function coolMoments(moments: readonly Moment[], weeks = 1): Moment[] {
  return moments
    .map((m) => ({ ...m, heat: Math.max(0, m.heat - COOLING[m.kind] * weeks) }))
    .filter((m) => m.heat > 2);
}

/** Feed a moment more heat (the rival responds, a second clip surfaces). */
export function stoke(m: Moment, amount: number): Moment {
  const heat = Math.max(0, Math.min(100, m.heat + amount));
  return { ...m, heat, peak: Math.max(m.peak, heat) };
}

export function hottest(moments: readonly Moment[], n = 3): Moment[] {
  return [...moments].sort((a, b) => b.heat - a.heat).slice(0, n);
}

/** Loud enough to be remembered in the Chronicle. */
export function isHistoric(m: Moment): boolean {
  return m.peak >= 55 || Math.abs(m.valence) >= 70;
}

/** Fill a spec's text tokens (headline, topic, hashtag) for this artist. */
export function fillSpec(spec: MomentSpec, t: { playerName: string; rival?: string; partner?: string; city?: string }): MomentSpec {
  const f = (s: string) =>
    s
      .replace(/\{playerName\}/g, t.playerName)
      .replace(/\{rival\}/g, t.rival ?? 'a rival')
      .replace(/\{partner\}/g, t.partner ?? 'a mystery date')
      .replace(/\{city\}/g, t.city ?? 'the city');
  return {
    ...spec,
    headline: f(spec.headline),
    topic: f(spec.topic),
    hashtag: spec.hashtag ? f(spec.hashtag).replace(/[^A-Za-z0-9]/g, '') : undefined,
  };
}
