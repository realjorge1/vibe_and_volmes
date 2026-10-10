import type { BeefWar, MomentSpec } from '../../types/drama';

/**
 * THE RIVAL WAR (pure).
 *
 * The rivalry engine decides what a rival DOES; this decides how the public
 * scores it. Every move swings a public-opinion share between the artist and
 * the rival (50 = dead even), escalation phases are what the internet can
 * see, and each rival move becomes a moment the feed argues about.
 */

export function phaseFor(intensity: number, war?: BeefWar | null, week?: number): BeefWar['phase'] {
  if (war?.phase === 'truce' && week !== undefined && week - war.lastMoveWeek < 6 && intensity < 45) return 'truce';
  if (intensity < 25) return 'cold';
  if (intensity < 40) return 'shade';
  if (intensity < 55) return 'subtweets';
  if (intensity < 72) return 'diss';
  return 'war';
}

export function newWar(rivalId: string, week: number): BeefWar {
  return { rivalId, score: 50, phase: 'cold', startedWeek: week, lastMoveWeek: week, log: [] };
}

export function swing(war: BeefWar, delta: number, week: number, text: string): BeefWar {
  const score = Math.max(4, Math.min(96, Math.round(war.score + delta)));
  return { ...war, score, lastMoveWeek: week, log: [{ week, text, swing: delta }, ...war.log].slice(0, 12) };
}

/** Quiet weeks pull public opinion back toward even. */
export function settle(war: BeefWar, weeks = 1): BeefWar {
  const pull = (50 - war.score) * 0.12 * weeks;
  return { ...war, score: Math.round(war.score + pull) };
}

/** Who the public thinks is winning, in words. */
export function standing(war: BeefWar, rival: string): string {
  const s = war.score;
  if (s >= 70) return `you're bodying ${rival} (${s}–${100 - s})`;
  if (s >= 56) return `you're ahead of ${rival} (${s}–${100 - s})`;
  if (s > 44) return `dead even with ${rival}`;
  if (s > 30) return `${rival} is winning (${100 - s}–${s})`;
  return `${rival} is cooking you (${100 - s}–${s})`;
}

/** What the internet makes of each rival move: the swing (artist's share) and a moment. */
export const RIVAL_MOVES: Record<string, { swing: number; moment: MomentSpec }> = {
  subtweet: {
    swing: -3,
    moment: { kind: 'beef', headline: '{rival} Subtweets {playerName}? Fans Are Connecting the Dots', topic: "{rival}'s subtweet", heat: 28, valence: -10, hashtag: '{rival}Subtweet', tags: ['beef'] },
  },
  'spread-rumor': {
    swing: -5,
    moment: { kind: 'scandal', headline: 'Rumors About {playerName} Traced Back to {rival}\'s Camp', topic: 'the rumors {rival} is spreading', heat: 42, valence: -35, tags: ['beef', 'rumor'] },
  },
  'steal-producer': {
    swing: -4,
    moment: { kind: 'beef', headline: "{rival} Poaches {playerName}'s Producer", topic: 'the producer poach', heat: 32, valence: -15, tags: ['beef'] },
  },
  'sabotage-collab': {
    swing: -5,
    moment: { kind: 'beef', headline: "{playerName}'s Collab Falls Apart — Fans Blame {rival}", topic: 'the collab sabotage', heat: 36, valence: -20, tags: ['beef'] },
  },
  'award-snipe': {
    swing: -6,
    moment: { kind: 'beef', headline: '{rival} Beats {playerName} to the Award Everyone Expected', topic: 'the award snub', heat: 40, valence: -15, hashtag: 'Robbed', tags: ['beef', 'award'] },
  },
  'trend-domination': {
    swing: -4,
    moment: { kind: 'beef', headline: "{rival} Drops on {playerName}'s Release Day", topic: 'the release-day clash', heat: 36, valence: -10, hashtag: 'ReleaseDayWar', tags: ['beef', 'charts'] },
  },
  'diss-track': {
    swing: -10,
    moment: { kind: 'beef', headline: '{rival} Drops a Full Diss Track Aimed at {playerName}', topic: "{rival}'s diss track", heat: 72, valence: -30, hashtag: '{rival}Diss', tags: ['beef', 'diss'] },
  },
  'public-praise': {
    swing: 3,
    moment: { kind: 'best', headline: '{rival} Shows {playerName} Unexpected Love', topic: "{rival}'s shoutout", heat: 24, valence: 40, tags: ['beef', 'peace'] },
  },
  'olive-branch': {
    swing: 2,
    moment: { kind: 'beef', headline: '{rival} Hints at Squashing the Beef With {playerName}', topic: "{rival}'s olive branch", heat: 26, valence: 20, tags: ['beef', 'peace'] },
  },
};

/** What a rival posts at each stage: veiled until the gloves come off, then by name. */
export const RIVAL_POSTS: Record<'veiled' | 'named', readonly string[]> = {
  veiled: [
    'funny how some people only get loud when they need streams 😂',
    "I don't do features with people who need features",
    'imagine copying my whole sound and still flopping',
    "they mad. they been mad. they'll stay mad 🤷",
    "the industry is full of plants. I'm a tree 🌳",
    "not gonna name names but the math ain't mathing on those streams 🤔",
    'number one. again. some people could never 🏆',
  ],
  named: [
    "{playerName} you're not on my level and you know it 😂",
    'everybody calm down, {playerName} will be forgotten by summer',
    '{playerName} wrote a diss about me with a ghostwriter. lol. lmao even',
    'I made {playerName} relevant. you are welcome',
    "{playerName}'s best song is a remix of my worst one",
    'tell {playerName} to stop checking my page every 5 minutes 👀',
    '{playerName} talking tough in songs, quiet in person. I know.',
  ],
};
