import type { Player } from '../../types/player';
import type { PostSentiment, SocialPost } from '../../types/social';
import type { WorldEvent, WorldEventType } from '../../types/world';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { RIVAL_ARTISTS } from '../../data/artists/rivalArtists';
import { LIVE_CONFIG } from '../../constants/liveConfig';
import { pick, pickN, randInt, chance } from '../../utils/random';

/**
 * The world keeps spinning while you're gone. This produces the world half of
 * the open-the-app hit: punchy headlines + fresh ambient feed posts, plus the
 * BASE passive fan drift (the plan layer modulates it; see
 * systems/passive/recapEngine).
 *
 * When the caller passes the *real* stories the living-world engine produced
 * while the player was away (`realEvents`), those drive the report — so coming
 * back genuinely reveals what rivals/relationships/trends actually did. The
 * templated beats below are only a fallback for short absences where the world
 * hasn't moved a full week yet. It still never mutates the sim itself.
 */

/** The world half of the away report — merged with the plan outcome by recapEngine. */
export interface WorldDigest {
  awaySpan: string;
  awayMs: number;
  /** World-only headlines (rivals/trends/charts). The fan-delta line is added
   *  by recapEngine using the final plan-modulated delta. */
  headlines: string[];
  /** Pre-plan passive fan drift; recapEngine multiplies by the plan's mult. */
  baseFanDelta: number;
  ambientPosts: SocialPost[];
}

const RIVAL_BEATS = [
  '{rival} dropped a surprise single overnight — the timeline is feral.',
  '{rival} is trending after a cryptic 3am post.',
  'Leak: {rival} reportedly locked in a huge feature.',
  '{rival} fans and {rival2} fans are at war again.',
  '{rival} just got a magazine cover. People have opinions.',
  'Rumor: {rival} and {rival2} have unfollowed each other.',
];

const TREND_BEATS = [
  '#{tag} is the #1 trend right now and nobody can agree why.',
  'The whole feed is arguing about {tag} tonight.',
  '{tag} discourse has officially gone too far.',
  'A 6-year-old clip resurfaced and #{tag} won’t stop.',
];

const WORLD_BEATS = [
  'The charts shuffled hard this week. New faces at the top.',
  'Award season speculation is already out of control.',
  'A "list of the decade" dropped and the replies are a bloodbath.',
  'Streaming numbers leaked. Some careers look very different now.',
];

const TAGS = [
  'IndustryPlant',
  'AlbumOfTheYear',
  'FlopEra',
  'Snubbed',
  'TheyAteThat',
  'Overrated',
  'ComebackSeason',
  'ChartWars',
];

function span(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h}h ${rem}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function ago(ms: number): string {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function fill(tpl: string): string {
  const [r1, r2] = pickN(RIVAL_ARTISTS, 2);
  return tpl
    .replace(/\{rival2\}/g, r2?.name ?? 'a rival')
    .replace(/\{rival\}/g, r1?.name ?? 'a rival')
    .replace(/\{tag\}/g, pick(TAGS));
}

/** How a real world story reads on the feed, by what kind of thing happened. */
const EVENT_SENTIMENT: Record<WorldEventType, PostSentiment> = {
  debut: 'news',
  release: 'news',
  'viral-moment': 'hype',
  collaboration: 'positive',
  'feud-started': 'shade',
  'diss-track': 'shade',
  reconciliation: 'positive',
  'romance-started': 'hype',
  breakup: 'shade',
  'deal-signed': 'news',
  'deal-dropped': 'critical',
  'tour-announced': 'hype',
  scandal: 'hostile',
  award: 'hype',
  lawsuit: 'critical',
  'mental-crisis': 'neutral',
  comeback: 'hype',
  retirement: 'news',
};

/** Accounts that plausibly *break* world news (gossip/press/industry/critics). */
const NEWS_ACCOUNTS = NPC_ACCOUNTS.filter((a) =>
  ['gossip', 'news', 'industry', 'critic'].includes(a.accountType)
);

/** Turn the living world's real stories into ambient feed posts. */
function postsFromEvents(events: WorldEvent[], effMs: number, week: number): SocialPost[] {
  const chosen = events.slice(0, LIVE_CONFIG.AWAY_AMBIENT_POSTS_MAX);
  const posts: SocialPost[] = [];
  for (let i = 0; i < chosen.length; i++) {
    const ev = chosen[i];
    const account = NEWS_ACCOUNTS.length ? pick(NEWS_ACCOUNTS) : pick(NPC_ACCOUNTS);
    // Spread the posts back across the time the player was away.
    const postedAgo = Math.round((effMs / (chosen.length + 1)) * (chosen.length - i));
    const reach = Math.sqrt(account.followers + 1) * 5;
    const likes = Math.round(reach * (0.5 + Math.random() * 2));
    posts.push({
      id: `away-evt-${week}-${ev.id}`,
      platform: pick(account.preferredPlatforms),
      account,
      content: `${ev.headline}  ·  ${ago(Math.max(60000, postedAgo))}`,
      sentiment: EVENT_SENTIMENT[ev.type] ?? 'news',
      likes,
      reposts: Math.round(likes * (0.05 + Math.random() * 0.2)),
      replies: Math.round(likes * (0.05 + Math.random() * 0.25)),
      week,
    });
  }
  return posts;
}

/** Fallback ambient posts (templated) for when the world hasn't moved a week. */
function templatePosts(effMs: number, week: number): SocialPost[] {
  const count = randInt(
    LIVE_CONFIG.AWAY_AMBIENT_POSTS_MIN,
    LIVE_CONFIG.AWAY_AMBIENT_POSTS_MAX
  );
  const posts: SocialPost[] = [];
  for (let i = 0; i < count; i++) {
    const account = pick(NPC_ACCOUNTS);
    const tpl = pick(
      chance(0.5) ? RIVAL_BEATS : chance(0.5) ? TREND_BEATS : WORLD_BEATS
    );
    const postedAgo = Math.round((effMs / count) * (count - i) * (0.5 + Math.random()));
    const reach = Math.sqrt(account.followers + 1) * 5;
    const likes = Math.round(reach * (0.5 + Math.random() * 2));
    posts.push({
      id: `away-${week}-${i}-${Date.now()}`,
      platform: pick(account.preferredPlatforms),
      account,
      content: `${fill(tpl)}  ·  ${ago(Math.max(60000, postedAgo))}`,
      sentiment: chance(0.5) ? 'news' : chance(0.5) ? 'meme' : 'neutral',
      likes,
      reposts: Math.round(likes * (0.05 + Math.random() * 0.2)),
      replies: Math.round(likes * (0.05 + Math.random() * 0.25)),
      week,
    });
  }
  return posts;
}

/**
 * Simulate the world gap. `awayMs` is real elapsed time; drift is computed on
 * a capped value so a week offline can't run the world away from you. Returns
 * only the world half — recapEngine merges this with the resolved plan outcome.
 *
 * `realEvents` are the actual stories the living-world engine produced while the
 * player was away (already biggest/newest first). When present they drive the
 * report; otherwise we fall back to templated beats.
 */
export function simulateWorld(
  player: Player,
  awayMs: number,
  week: number,
  realEvents: WorldEvent[] = []
): WorldDigest {
  const effMs = Math.min(awayMs, LIVE_CONFIG.AWAY_SIM_CAP_MS);
  const effHours = effMs / 3_600_000;

  // Passive fan drift: loyal fanbases grow a little on their own; a fragile
  // reputation bleeds. Bounded and gentle — momentum, not gameplay.
  const loyalty = player.stats.fanLoyalty / 100;
  const repSwing = (player.stats.reputation - 45) / 100;
  const perHour =
    LIVE_CONFIG.PASSIVE_FAN_PER_HOUR_BASE *
    (0.4 + loyalty) *
    (1 + repSwing) *
    Math.sqrt(Math.max(1, player.stats.fans) / 1000 + 1);
  const baseFanDelta = Math.round(perHour * effHours);

  const headlineCount = Math.min(4, 1 + Math.floor(effHours / 4));

  let headlines: string[];
  let ambientPosts: SocialPost[];
  if (realEvents.length > 0) {
    // The world genuinely moved — show what actually happened to real names.
    headlines = realEvents.slice(0, headlineCount).map((e) => e.headline);
    ambientPosts = postsFromEvents(realEvents, effMs, week);
  } else {
    const pool = [...RIVAL_BEATS, ...TREND_BEATS, ...WORLD_BEATS];
    headlines = pickN(pool, headlineCount).map(fill);
    ambientPosts = templatePosts(effMs, week);
  }

  return {
    awaySpan: span(awayMs),
    awayMs,
    headlines,
    baseFanDelta,
    ambientPosts,
  };
}
