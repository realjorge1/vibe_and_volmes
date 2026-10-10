import type { AwardCategoryId, AwardResult, Nomination, Nominee } from '../../types/calendar';

/**
 * Award season. Pure: who gets nominated (the artist against the living
 * world's artists, five per category) and who wins (rolled once, when the
 * night begins, so it never re-rolls).
 */

export const AWARD_SHOW = 'The Meridians';

export interface AwardSong {
  title: string;
  critics: number;
  peak: number | null;
  viral: boolean;
}

export interface AwardContext {
  playerName: string;
  careerYear: number;
  genreLabel: string;
  fans: number;
  reputation: number;
  industryRespect: number;
  charisma: number;
  vocalSkill: number;
  /** Songs released in the eligibility year. */
  songs: AwardSong[];
  bestShow: number;
  showsThisYear: number;
  /** Already won Best New Artist (a once-in-a-life award). */
  hadBestNew: boolean;
}

export interface NpcCandidate {
  npcId: string;
  name: string;
  genre: string | null;
  followers: number;
  talent: number;
  marketability: number;
  influence: number;
  momentum: number;
  stage: string;
  /** A song title for the song categories. */
  work: string;
}

/** 0..100 from fans (a log curve: 50M fans is the ceiling). */
export function fameScore(fans: number): number {
  if (fans <= 0) return 0;
  return Math.max(0, Math.min(100, (Math.log10(fans + 1) / Math.log10(50_000_000)) * 100));
}

function peakScore(peak: number | null): number {
  if (peak === null) return 15;
  if (peak === 1) return 100;
  if (peak <= 10) return 88;
  if (peak <= 40) return 66;
  return 42;
}

export function songScore(s: AwardSong, industryRespect: number): number {
  return s.critics * 0.5 + peakScore(s.peak) * 0.35 + (s.viral ? 8 : 0) + industryRespect * 0.12;
}

function bestSong(ctx: AwardContext): AwardSong | null {
  return [...ctx.songs].sort((a, b) => songScore(b, ctx.industryRespect) - songScore(a, ctx.industryRespect))[0] ?? null;
}

/** The artist's appeal in a category, or null when not eligible. */
export function playerScore(id: AwardCategoryId, ctx: AwardContext): { score: number; work?: string } | null {
  const song = bestSong(ctx);
  const fame = fameScore(ctx.fans);
  switch (id) {
    case 'song-of-the-year':
      return song ? { score: songScore(song, ctx.industryRespect), work: song.title } : null;
    case 'artist-of-the-year':
      if (ctx.songs.length === 0) return null;
      return { score: fame * 0.55 + ctx.reputation * 0.15 + ctx.industryRespect * 0.3 };
    case 'best-new-artist':
      if (ctx.careerYear > 2 || ctx.hadBestNew || !song) return null;
      return { score: fame * 0.45 + songScore(song, ctx.industryRespect) * 0.4 + ctx.reputation * 0.15 + 8 };
    case 'best-genre':
      return song ? { score: song.critics * 0.6 + ctx.vocalSkill * 0.2 + ctx.industryRespect * 0.2, work: song.title } : null;
    case 'live-act':
      if (ctx.showsThisYear === 0) return null;
      return { score: ctx.bestShow * 0.7 + ctx.charisma * 0.3 };
  }
}

function npcScore(id: AwardCategoryId, n: NpcCandidate, rng: () => number): number {
  const fame = fameScore(n.followers);
  const noise = (rng() * 2 - 1) * 6;
  switch (id) {
    case 'best-new-artist':
      return fame * 0.5 + n.talent * 0.35 + Math.max(0, n.momentum) * 0.15 + noise;
    case 'live-act':
      return n.talent * 0.45 + n.marketability * 0.35 + fame * 0.2 + noise;
    default:
      return fame * 0.5 + n.talent * 0.3 + n.marketability * 0.1 + Math.max(0, n.momentum) * 0.1 + noise;
  }
}

export const CATEGORY_ORDER: AwardCategoryId[] = [
  'best-genre',
  'live-act',
  'best-new-artist',
  'song-of-the-year',
  'artist-of-the-year',
];

export function categoryLabel(id: AwardCategoryId, genreLabel: string): string {
  switch (id) {
    case 'best-new-artist':
      return 'Best New Artist';
    case 'song-of-the-year':
      return 'Song of the Year';
    case 'artist-of-the-year':
      return 'Artist of the Year';
    case 'best-genre':
      return `Best ${genreLabel} Performance`;
    case 'live-act':
      return 'Best Live Act';
  }
}

/**
 * Five nominees per category. The artist is in when their appeal beats the
 * fifth-best world artist; otherwise the category goes on without them.
 */
export function nominate(
  ctx: AwardContext,
  npcs: NpcCandidate[],
  playerGenre: string,
  rng: () => number = Math.random
): Nomination[] {
  return CATEGORY_ORDER.map((id) => {
    const pool = npcs.filter((n) => {
      if (id === 'best-new-artist') return n.stage === 'rising' || n.stage === 'undiscovered' || n.stage === 'established';
      if (id === 'best-genre') return n.genre === playerGenre;
      return n.stage !== 'undiscovered';
    });
    const scored = pool
      .map((n) => ({ n, score: npcScore(id, n, rng) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const nominees: Nominee[] = scored.map(({ n, score }) => ({
      name: n.name,
      npcId: n.npcId,
      isPlayer: false,
      work: id === 'song-of-the-year' || id === 'best-genre' ? n.work : undefined,
      score: Math.round(score),
    }));
    const mine = playerScore(id, ctx);
    const bar = nominees.length >= 5 ? nominees[4].score : 0;
    if (mine && mine.score >= bar) {
      if (nominees.length >= 5) nominees.pop();
      nominees.push({ name: ctx.playerName, isPlayer: true, work: mine.work, score: Math.round(mine.score) });
    }
    return {
      category: id,
      label: categoryLabel(id, ctx.genreLabel),
      // Envelope order, not score order: nobody should guess from the list.
      nominees: [...nominees].sort((a, b) => a.name.localeCompare(b.name)),
    };
  });
}

/** What a "for your consideration" campaign adds to the artist's appeal. */
export function campaignBonus(spend: number): number {
  return Math.min(10, Math.sqrt(Math.max(0, spend) / 10_000) * 3);
}

/**
 * Roll the winners. `edge` is everything that moves voters on the night:
 * traits, the campaign, and minus the heat of any scandal.
 */
export function rollWinners(
  noms: Nomination[],
  edge: number,
  rng: () => number = Math.random
): AwardResult[] {
  return noms.map((nom) => {
    const weights = nom.nominees.map((n) => Math.exp(((n.isPlayer ? n.score + edge : n.score) - 70) / 7));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = rng() * total;
    let winner = nom.nominees[0];
    for (let i = 0; i < nom.nominees.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        winner = nom.nominees[i];
        break;
      }
    }
    const playerNominated = nom.nominees.some((n) => n.isPlayer);
    return {
      category: nom.category,
      label: nom.label,
      winner,
      playerNominated,
      playerWon: winner?.isPlayer ?? false,
    };
  });
}
