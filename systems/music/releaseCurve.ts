import type { Track, ReleaseMomentum } from '../../types/music';
import { clamp } from '../../utils/random';
import { fameReach, formatFanCount } from '../../utils/statHelpers';

/**
 * RELEASE MOMENTUM.
 *
 * A record doesn't land at full size. How much of its audience shows up on
 * release week depends on how known the artist is: a superstar's fans are
 * waiting (a front-loaded debut), an unknown's song has to be found (a slow
 * burn). After release the song builds by word of mouth — longer and harder
 * the better it is and the less known the artist — then fades. Its weekly
 * audience also follows the artist's live fan count, so a growing artist lifts
 * the songs still out there. Fans arrive with the plays, week by week.
 *
 * Pure math. The one random beat (a late breakout) takes an injected rng.
 */

/** Below the Emerging stage's fan bar an artist is still upcoming. */
export const UPCOMING_FANS = 50_000;

/** Friends and family stream even an unknown. */
export const AUDIENCE_FLOOR = 200;

/** Weekly fade once a song has peaked; a viral one lingers. */
const FADE = 0.55;
const VIRAL_FADE = 0.66;

export function isUpcoming(fans: number): boolean {
  return fans < UPCOMING_FANS;
}

/**
 * Share of a song's full weekly audience that shows up on release week. An
 * S-curve on fame: ~3% for an unknown, ~8% at 20K fans, ~40% at 200K, 80%+
 * for a superstar whose fans are waiting.
 */
export function openingShare(fans: number): number {
  const r = fameReach(fans);
  return 0.03 + 0.92 / (1 + Math.exp(-(r - 0.75) * 14));
}

/** 0..1 word-of-mouth pull: good, replayable, original songs get passed on. */
export function songPull(t: Pick<Track, 'quality' | 'replayValue' | 'originality'>): number {
  return clamp((t.quality * 0.45 + t.replayValue * 0.35 + t.originality * 0.2) / 100, 0, 1);
}

/**
 * The song's best week as a share of its full audience. A weak song never
 * gets there; a strong one from an unknown travels past the fan base.
 */
function peakShare(reach: number, pull: number): number {
  return (0.25 + 1.2 * pull * pull) * (1 + (1 - reach) * 0.5 * pull);
}

/** Weeks of word of mouth before a song peaks. Superstars peak at once. */
function buildWeeksFor(reach: number, pull: number): number {
  return Math.max(1, Math.round(1 + (1 - reach) * 6 * pull));
}

export interface ReleasePlanInput {
  fans: number;
  track: Pick<Track, 'quality' | 'replayValue' | 'originality'>;
  /** Fans per stream if every play were a new listener. */
  conversion: number;
  /** Peak multiplier of a viral moment on release day; 1 for none. */
  viralMult: number;
  /** Total chance the song breaks out while it builds (upcoming artists). */
  breakoutChance: number;
}

export interface ReleasePlan {
  /** Release-week streams as a share of the song's full weekly audience. */
  opening: number;
  momentum: ReleaseMomentum;
}

export function planRelease(inp: ReleasePlanInput): ReleasePlan {
  const reach = fameReach(inp.fans);
  const pull = songPull(inp.track);
  const viral = inp.viralMult > 1;

  const buildWeeks = buildWeeksFor(reach, pull) + (viral ? 2 : 0);
  const base = openingShare(inp.fans);
  const opening = base * (viral ? Math.sqrt(inp.viralMult) : 1);
  const peak = Math.max(base * 1.05, peakShare(reach, pull)) * inp.viralMult;
  const growth = Math.pow(Math.max(peak / opening, 1), 1 / buildWeeks);

  // Fans already streaming a new song aren't new fans, so each play converts
  // less the bigger the artist already is.
  const fansPerStream = inp.conversion * (0.45 - 0.2 * reach);

  // Spread the breakout chance over the building weeks, one roll each.
  const p = clamp(inp.breakoutChance, 0, 0.95);
  const breakoutChance = viral || p <= 0 ? 0 : 1 - Math.pow(1 - p, 1 / buildWeeks);

  return {
    opening,
    momentum: {
      growth,
      buildWeeks,
      fade: viral ? VIRAL_FADE : FADE,
      fansPerStream,
      audienceFans: inp.fans,
      breakoutChance,
    },
  };
}

export function isBuilding(t: Track, weeksOut: number): boolean {
  return !!t.momentum && weeksOut >= 1 && weeksOut <= t.momentum.buildWeeks;
}

export interface ReleaseStep {
  weeklyStreams: number;
  momentum: ReleaseMomentum;
  fansWon: number;
}

/**
 * One week of a song's life (`weeksOut` ≥ 1). `fans` is the artist's live fan
 * count: a growing artist lifts the song, a shrinking one drags it. Damped and
 * capped, since the song's own fans feed back into it.
 */
export function stepRelease(
  t: Track & { momentum: ReleaseMomentum },
  weeksOut: number,
  fans?: number
): ReleaseStep {
  const m = t.momentum;
  const phase = weeksOut <= m.buildWeeks ? m.growth : m.fade;
  const popularity =
    fans === undefined
      ? 1
      : clamp(
          Math.pow(Math.max(AUDIENCE_FLOOR, fans) / Math.max(AUDIENCE_FLOOR, m.audienceFans), 0.35),
          0.85,
          1.2
        );
  const weeklyStreams = Math.round(t.weeklyStreams * phase * popularity);
  return {
    weeklyStreams,
    momentum: fans === undefined ? m : { ...m, audienceFans: fans },
    fansWon: Math.round(weeklyStreams * m.fansPerStream),
  };
}

/**
 * An upcoming artist's song can catch fire while it builds. Rolled once per
 * building week, before that week's step; returns the broken-out track or null.
 */
export function rollBreakout(
  t: Track,
  weeksOut: number,
  rng: () => number = Math.random
): Track | null {
  const m = t.momentum;
  if (!m || t.wentViral || m.breakoutChance <= 0) return null;
  if (t.status === 'forgotten' || t.status === 'classic') return null;
  if (!isBuilding(t, weeksOut)) return null;
  if (rng() >= m.breakoutChance) return null;
  return {
    ...t,
    wentViral: true,
    momentum: {
      ...m,
      growth: Math.max(m.growth * 1.25, 1.4),
      buildWeeks: Math.max(m.buildWeeks, weeksOut + 1),
      fade: VIRAL_FADE,
      breakoutChance: 0,
    },
  };
}

/** One line for the release screen: how this song is expected to move. */
export function releaseOutlook(t: Track): string | null {
  const m = t.momentum;
  if (!m) return null;
  if (m.buildWeeks >= 3 && m.growth >= 1.3) {
    return 'A slow burn. It should keep growing for weeks as people find it.';
  }
  if (m.growth >= 1.1) {
    return 'Still building. Expect it to grow over the next couple of weeks.';
  }
  return 'Front-loaded. Your fans showed up on day one.';
}

/** Where a released song stands in `week`, for the studio's latest-release card. */
export function releasePulse(t: Track, week: number): string | null {
  const weeksOut = week - t.releasedAtWeek;
  if (weeksOut < 1) return releaseOutlook(t);
  if (!t.momentum) return null;
  if (t.status === 'classic') return 'Its run is over. It went down as a classic.';
  if (t.status === 'forgotten') return 'Its run is over.';
  const streams = `${formatFanCount(t.weeklyStreams)} streams this week`;
  return isBuilding(t, weeksOut + 1) ? `Still building: ${streams}.` : `Fading: ${streams}.`;
}

export interface ReleaseNote {
  kind: 'breakout' | 'entry' | 'peak' | 'building';
  text: string;
}

/**
 * A week-summary line about a song finding its audience, or null when there's
 * nothing worth saying. `prev` is the track before this week's step.
 */
export function releaseProgressNote(
  prev: Track,
  next: Track,
  position: number | null,
  fansWon: number
): ReleaseNote | null {
  if (!next.momentum) return null;
  const title = `"${next.title}"`;
  const fans = fansWon > 0 ? `, +${formatFanCount(fansWon)} fans` : '';
  const streams = `${formatFanCount(next.weeklyStreams)} streams this week${fans}`;

  if (!prev.wentViral && next.wentViral) {
    return { kind: 'breakout', text: `🔥 ${title} is breaking out. Clips of it are everywhere: ${streams}.` };
  }
  if (position !== null && prev.peakChartPosition === null) {
    return { kind: 'entry', text: `🎶 ${title} entered the chart at #${position} (${streams}).` };
  }
  if (position !== null && prev.peakChartPosition !== null && position < prev.peakChartPosition) {
    return { kind: 'peak', text: `🎶 ${title} climbed to a new peak at #${position} (${streams}).` };
  }
  if (next.weeklyStreams > prev.weeklyStreams) {
    return { kind: 'building', text: `📈 ${title} is still building: ${streams}.` };
  }
  return null;
}
