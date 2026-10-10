import type { ChartBoard, ChartDay, ChartRow, NpcSong } from '../../types/calendar';

/**
 * The chart, as a board: the artist's songs at the positions the chart
 * engine gave them, and the world's songs filling every other slot. Pure.
 *
 * The world's songs live a life of their own: they debut when a living-world
 * artist releases (bigger names debut higher), climb or slide each week, and
 * fall off. The artist's positions stay authoritative; the board only gives
 * them company — and a rival two spots away.
 */

export const BOARD_SIZE = 50;
/** Keep at least this many world songs in rotation. */
const MIN_POOL = 70;
const MAX_POOL = 120;

export interface WorldRelease {
  npcId: string;
  artist: string;
  followers: number;
  momentum: number;
  title: string;
}

export interface PlayerEntry {
  trackId: string;
  title: string;
  position: number;
  streams: number;
  peak: number | null;
  weeksOn: number;
}

export interface BoardInput {
  week: number;
  prev: ChartBoard | null;
  pool: NpcSong[];
  playerName: string;
  playerEntries: PlayerEntry[];
  releases: WorldRelease[];
  /** Artists to draw filler songs from when the world was quiet. */
  filler: WorldRelease[];
  rival?: { id: string; name: string; fans: number; title: string } | null;
  rng: () => number;
}

/** A world song's debut strength, 0..100, from the artist's reach. */
export function debutScore(followers: number, momentum: number, rng: () => number): number {
  const reach = Math.log10(Math.max(10, followers)) * 11;
  return Math.max(12, Math.min(97, reach - 18 + momentum * 0.15 + (rng() * 2 - 1) * 8));
}

let songCounter = 0;
function songId(week: number): string {
  songCounter = (songCounter + 1) % 1_000_000;
  return `npcsong-${week}-${songCounter}`;
}

function newSong(r: WorldRelease, week: number, rng: () => number, rivalId?: string): NpcSong {
  return {
    id: songId(week),
    title: r.title,
    artist: r.artist,
    npcId: r.npcId || undefined,
    rivalId,
    score: debutScore(r.followers, r.momentum, rng),
    debutWeek: week,
    peak: null,
    weeksOn: 0,
    lastPos: null,
  };
}

/** One week of the world's songs: age, decay, debut, refill. */
export function stepPool(input: BoardInput): NpcSong[] {
  const { week, rng } = input;
  // Songs climb for a couple of weeks, then slide.
  let pool = input.pool
    .map((s) => {
      const age = week - s.debutWeek;
      const growth = age <= 2 ? 1.04 : 0.86;
      return { ...s, score: s.score * (growth + (rng() * 2 - 1) * 0.05) };
    })
    .filter((s) => s.score >= 10 && week - s.debutWeek <= 40);

  const have = new Set(pool.map((s) => `${s.artist}|${s.title}`));
  for (const r of input.releases) {
    const key = `${r.artist}|${r.title}`;
    if (have.has(key)) continue;
    pool.push(newSong(r, week, rng));
    have.add(key);
  }
  // The rival always has something out (that's the point of a rival).
  if (input.rival) {
    const theirs = pool.filter((s) => s.rivalId === input.rival!.id);
    if (theirs.length === 0 || theirs.every((s) => week - s.debutWeek > 8)) {
      pool.push(
        newSong(
          { npcId: '', artist: input.rival.name, followers: input.rival.fans, momentum: 10, title: input.rival.title },
          week,
          rng,
          input.rival.id
        )
      );
    }
  }
  let i = 0;
  while (pool.length < MIN_POOL && input.filler.length > 0 && i < MIN_POOL * 2) {
    const r = input.filler[i % input.filler.length];
    i += 1;
    const key = `${r.artist}|${r.title}`;
    if (have.has(key)) continue;
    // Filler is mid-chart catalog, not a debut event.
    const s = newSong(r, week - Math.floor(rng() * 6), rng);
    pool.push({ ...s, score: s.score * (0.5 + rng() * 0.5) });
    have.add(key);
  }
  pool.sort((a, b) => b.score - a.score);
  pool = pool.slice(0, MAX_POOL);
  return pool;
}

/** Place the artist's songs, fill the rest with the world, by position. */
export function buildBoard(input: BoardInput): { board: ChartBoard; pool: NpcSong[] } {
  const pool = stepPool(input);
  const slots: (ChartRow | null)[] = Array.from({ length: BOARD_SIZE }, () => null);
  const prevPos = new Map<string, number>();
  for (const row of input.prev?.rows ?? []) {
    if (row.trackId) prevPos.set(`t:${row.trackId}`, row.pos);
    if (row.npcSongId) prevPos.set(`n:${row.npcSongId}`, row.pos);
  }

  const mine = [...input.playerEntries].sort((a, b) => a.position - b.position);
  for (const e of mine) {
    if (e.position > BOARD_SIZE) continue;
    let idx = e.position - 1;
    while (idx < BOARD_SIZE && slots[idx]) idx += 1;
    if (idx >= BOARD_SIZE) continue;
    slots[idx] = {
      pos: idx + 1,
      title: e.title,
      artist: input.playerName,
      trackId: e.trackId,
      isPlayer: true,
      isRival: false,
      lastPos: prevPos.get(`t:${e.trackId}`) ?? null,
      peak: Math.min(e.peak ?? idx + 1, idx + 1),
      weeksOn: e.weeksOn,
      streams: e.streams,
    };
  }

  let next = 0;
  const placed = new Map<string, number>();
  for (let idx = 0; idx < BOARD_SIZE; idx++) {
    if (slots[idx]) continue;
    const song = pool[next];
    next += 1;
    if (!song) break;
    const pos = idx + 1;
    placed.set(song.id, pos);
    slots[idx] = {
      pos,
      title: song.title,
      artist: song.artist,
      npcSongId: song.id,
      isPlayer: false,
      isRival: !!song.rivalId,
      lastPos: prevPos.get(`n:${song.id}`) ?? null,
      peak: song.peak === null ? pos : Math.min(song.peak, pos),
      weeksOn: song.weeksOn + 1,
    };
  }

  const nextPool = pool.map((s) => {
    const pos = placed.get(s.id);
    if (pos === undefined) return { ...s, lastPos: null };
    return { ...s, lastPos: pos, peak: s.peak === null ? pos : Math.min(s.peak, pos), weeksOn: s.weeksOn + 1 };
  });

  return {
    board: { week: input.week, rows: slots.filter((r): r is ChartRow => r !== null) },
    pool: nextPool,
  };
}

/**
 * Is this chart week worth stopping for? The loudest thing that happened to
 * one of the artist's songs, or null for a quiet week.
 */
export function chartDayBeat(
  entries: { trackId: string; position: number }[],
  lastWeek: Map<string, number>
): ChartDay['beat'] | null {
  let best: ChartDay['beat'] | null = null;
  const rank: Record<ChartDay['beat'], number> = {
    'number-one': 6,
    'top-10': 5,
    debut: 4,
    climb: 3,
    fall: 2,
    steady: 1,
  };
  for (const e of entries) {
    const last = lastWeek.get(e.trackId);
    let beat: ChartDay['beat'];
    if (e.position === 1 && last !== 1) beat = 'number-one';
    else if (e.position <= 10 && (last === undefined || last > 10)) beat = 'top-10';
    else if (last === undefined) beat = 'debut';
    else if (last - e.position >= 5) beat = 'climb';
    else if (e.position - last >= 8) beat = 'fall';
    else beat = 'steady';
    if (!best || rank[beat] > rank[best]) best = beat;
  }
  return best === 'steady' ? null : best;
}
