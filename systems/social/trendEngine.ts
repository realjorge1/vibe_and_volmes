import type {
  TrendingTopic,
  PostSentiment,
  TrendKind,
} from '../../types/social';
import type { Player } from '../../types/player';
import type { SocialReactionType } from '../../types/events';
import type { Track } from '../../types/music';
import { HASHTAG_TEMPLATES } from '../../data/social/postTemplates';
import { pick, randInt, shuffle, chance } from '../../utils/random';
import { getGenre } from '../../data/genres';
import { getCultureBias } from '../culture/cultureEngine';

/**
 * TREND CALCULATION SYSTEM.
 *
 * Promotes the week's cultural moments — viral songs, scandals, memes, fashion
 * waves, and social movements — into a ranked trending board. Beyond display,
 * trends feed back into the world: an on-trend song gets a streaming boost
 * (`trendStreamMultiplier`) and on-trend posts are surfaced to non-followers
 * (`trendAlignmentFor`), so discovery and chart performance move with culture.
 */

export interface TrendInput {
  player: Player;
  week: number;
  recentReactions: SocialReactionType[];
  recentEventIds: string[];
  latestTrack: Track | null;
  hasActiveBeef: boolean;
}

function volumeFor(playerFans: number, intensity: number): number {
  const base = Math.max(2000, playerFans * 0.4);
  return Math.round(base * intensity * (0.6 + Math.random()));
}

export function generateTrending(input: TrendInput): TrendingTopic[] {
  const { player, week, recentReactions, recentEventIds, latestTrack } = input;
  const name = player.artistName;
  const topics: TrendingTopic[] = [];
  const used = new Set<string>();

  const push = (
    hashtag: string,
    sentiment: PostSentiment,
    intensity: number,
    kind: TrendKind,
    relatedEventId?: string
  ) => {
    if (used.has(hashtag)) return;
    used.add(hashtag);
    topics.push({
      hashtag,
      volume: volumeFor(player.stats.fans, intensity),
      sentiment,
      kind,
      momentum: intensity >= 2.2 ? 'rising' : intensity >= 1.1 ? 'steady' : 'cooling',
      relatedEventId,
      peakWeek: week,
    });
  };

  const hasNegative = recentReactions.some(
    (r) => r === 'negative' || r === 'cancel'
  );
  const hasViral = recentReactions.includes('viral');
  const eventId = recentEventIds[0];
  const genre = getGenre(player.genre);

  // ── Viral song moment ────────────────────────────────────────────────
  if (hasViral) {
    push(pick(HASHTAG_TEMPLATES.hype(name)), 'hype', 3.5, 'meme', eventId);
  }

  // ── Scandal ──────────────────────────────────────────────────────────
  if (hasNegative || input.hasActiveBeef) {
    push(pick(HASHTAG_TEMPLATES.drama(name)), 'shade', 3, 'scandal', eventId);
  }

  // ── Beef ─────────────────────────────────────────────────────────────
  if (input.hasActiveBeef) {
    push(pick(HASHTAG_TEMPLATES.beef(name)), 'critical', 2.5, 'beef', eventId);
  }

  // ── The song itself ──────────────────────────────────────────────────
  if (latestTrack && week - latestTrack.releasedAtWeek <= 2) {
    push(
      pick(HASHTAG_TEMPLATES.track(name, latestTrack.title)),
      'hype',
      2,
      'song'
    );
  }

  // ── Fashion / aesthetic wave — charismatic, visible artists spawn looks.
  if (player.stats.fans >= 20_000 && player.stats.charisma >= 55 && chance(0.5)) {
    push(pick(HASHTAG_TEMPLATES.fashion(name)), 'positive', 1.4, 'fashion');
  }

  // ── Social movement the artist is adjacent to (genre flavored). ────────
  if (player.stats.fans >= 10_000 && chance(0.35)) {
    push(pick(HASHTAG_TEMPLATES.movement()), 'neutral', 1.2, 'movement');
  }

  // ── Baseline name trend once the artist is known at all. ───────────────
  if (player.stats.fans >= 1000) {
    push(`#${name.replace(/\s/g, '')}`, 'neutral', 1.2, 'artist');
  }

  // ── Era-flavored ambient trends (Phase 5 culture). ─────────────────────
  const culture = getCultureBias();
  const eraTags = shuffle(culture.trendDescriptors.map((d) => `#${d}`)).slice(
    0,
    randInt(1, 2)
  );
  for (const t of eraTags) push(t, 'neutral', 1.0, 'ambient');
  if (culture.ascendantGenres.length) {
    const g = pick(culture.ascendantGenres).replace(/[^a-z]/gi, '');
    push(`#${g}Wave`, 'hype', 1.1, 'fashion');
  }
  // The player's own genre as a cultural current.
  if (genre.viralPotential >= 8 && chance(0.4)) {
    push(`#${genre.label.replace(/[^a-z]/gi, '')}Renaissance`, 'positive', 0.9, 'movement');
  }

  const ambient = shuffle(['#NewMusicFriday', '#MusicTwitter', '#NowPlaying']).slice(
    0,
    randInt(1, 2)
  );
  for (const a of ambient) push(a, 'neutral', 0.7, 'ambient');

  return topics.sort((a, b) => b.volume - a.volume).slice(0, 8);
}

/**
 * Per-post trend alignment, 0..1 — how much a post rides the prevailing wind.
 * Posts whose sentiment matches a hot trend get algorithmic discovery.
 */
export function trendAlignmentFor(
  sentiment: PostSentiment,
  topics: TrendingTopic[]
): number {
  const own = topics.filter((t) => !t.world);
  if (own.length === 0) return 0;
  const top = own.slice(0, 4);
  let best = 0;
  for (const t of top) {
    if (t.sentiment === sentiment) {
      const heat = t.momentum === 'rising' ? 1 : t.momentum === 'steady' ? 0.6 : 0.3;
      best = Math.max(best, heat);
    }
  }
  return best;
}

/**
 * Streaming multiplier from the trend board for the player's latest track.
 * A hot `song` trend (or a strong fashion/meme wave) lifts streams — the
 * concrete "trends influence chart performance" link.
 */
export function trendStreamMultiplier(
  topics: TrendingTopic[],
  latestTrack: Track | null,
  week: number
): number {
  if (!latestTrack || week - latestTrack.releasedAtWeek > 4) return 1;
  let boost = 1;
  for (const t of topics.filter((x) => !x.world).slice(0, 5)) {
    if (t.kind === 'song') boost += t.momentum === 'rising' ? 0.35 : 0.18;
    else if (t.kind === 'meme' && t.sentiment === 'hype') boost += 0.2;
    else if (t.kind === 'fashion') boost += 0.06;
  }
  return Math.min(boost, 2.0);
}
