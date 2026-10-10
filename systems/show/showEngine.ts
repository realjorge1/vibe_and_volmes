import type { PlayerStats } from '../../types/player';
import type { Track } from '../../types/music';
import type { Cue, CueGrade, CueKind, ShowSong, SongEnergy, StageOption } from '../../types/show';

/**
 * A live show, as numbers. Pure: how good a setlist is, how a tap on the
 * beat grades, how a stage choice lands, and what the night scores.
 *
 * The audio is the timing source: a cue asks for a tap on the first beat of
 * a bar, and the grade is how far from that beat the tap landed, measured
 * against the song's real tempo and the player's real playback position.
 */

export const BEATS_PER_BAR = 4;
/** Bars of each song played in the show (a highlight, not the whole song). */
export const SEGMENT_BARS = 8;
/** Bar (0-based) whose downbeat is the drop. */
export const DROP_BAR = 4;
/** Bar (0-based) of the effects cue. */
export const FX_BAR = 6;

// ─── Before the show ──────────────────────────────────────────────────────────

/** How good the artist is on a stage, before anything happens. */
export function stagePower(stats: PlayerStats): number {
  return stats.vocalSkill * 0.4 + stats.charisma * 0.4 + stats.talent * 0.2;
}

export function exhaustion(energy: number, burnout: number): number {
  return (100 - energy) * 0.5 + burnout * 0.5;
}

/** The night if the artist doesn't play it themselves (the old auto-sim). */
export function autoShowScore(
  stats: PlayerStats,
  burnout: number,
  showBonus: number,
  rng: () => number = Math.random
): number {
  const noise = (rng() + rng() + rng() - 1.5) * 8;
  return Math.max(5, Math.min(100, Math.round(stagePower(stats) - exhaustion(stats.energy, burnout) * 0.4 + showBonus + noise)));
}

export function songEnergy(bpm: number): SongEnergy {
  if (bpm >= 118) return 'high';
  if (bpm >= 92) return 'mid';
  return 'low';
}

/** 0..100: how much the crowd knows and wants this one. */
export function songHeat(track: Track, maxStreams: number): number {
  const peak = track.peakChartPosition;
  const peakPart = peak === null ? 10 : peak === 1 ? 60 : peak <= 10 ? 50 : peak <= 40 ? 35 : 22;
  const streamPart = maxStreams > 0 ? (Math.log10(track.totalStreams + 10) / Math.log10(maxStreams + 10)) * 30 : 0;
  return Math.round(Math.max(5, Math.min(100, peakPart + streamPart + (track.wentViral ? 10 : 0))));
}

export interface SetlistVerdict {
  bonus: number;
  notes: string[];
}

/** The strategy half of a show: what order the songs come in. */
export function judgeSetlist(songs: ShowSong[]): SetlistVerdict {
  const notes: string[] = [];
  let bonus = 0;
  if (songs.length === 0) return { bonus: -20, notes: ['No setlist.'] };
  const first = songs[0];
  const last = songs[songs.length - 1];
  if (first.energy === 'high') {
    bonus += 6;
    notes.push('Opened loud.');
  } else if (first.energy === 'low') {
    bonus -= 4;
    notes.push('Opened slow. The room needed a minute.');
  }
  const hottest = Math.max(...songs.map((s) => s.heat));
  if (last.heat === hottest && songs.length > 1) {
    bonus += 8;
    notes.push('Saved the hit for last.');
  } else if (songs[0].heat === hottest && songs.length > 2) {
    bonus -= 3;
    notes.push('Played the hit first. Nowhere to go after.');
  }
  const middle = songs.slice(1, -1);
  if (songs.length >= 4 && middle.some((s) => s.energy === 'low')) {
    bonus += 4;
    notes.push('A slow one in the middle. Lighters up.');
  }
  for (let i = 1; i < songs.length; i++) {
    if (songs[i].energy === 'low' && songs[i - 1].energy === 'low') {
      bonus -= 4;
      notes.push('Two slow ones back to back. Lost them for a stretch.');
      break;
    }
  }
  const avgHeat = songs.reduce((s, x) => s + x.heat, 0) / songs.length;
  bonus += Math.round((avgHeat - 35) / 6);
  return { bonus, notes };
}

// ─── During the show ──────────────────────────────────────────────────────────

export function secondsPerBeat(bpm: number): number {
  return 60 / Math.max(40, bpm);
}

export function secondsPerBar(bpm: number): number {
  return secondsPerBeat(bpm) * BEATS_PER_BAR;
}

/** Seconds of a song's segment in the show. */
export function segmentSeconds(bpm: number): number {
  return secondsPerBar(bpm) * SEGMENT_BARS;
}

/** The current beat in the bar (0..3) at a playback position. */
export function beatInBar(positionSec: number, bpm: number): number {
  return Math.floor(positionSec / secondsPerBeat(bpm)) % BEATS_PER_BAR;
}

/** The current bar (0-based) at a playback position. */
export function barAt(positionSec: number, bpm: number): number {
  return Math.floor(positionSec / secondsPerBar(bpm));
}

/** Milliseconds from a tap to a target bar's downbeat (negative = early). */
export function offsetToBar(positionSec: number, bpm: number, bar: number): number {
  return (positionSec - bar * secondsPerBar(bpm)) * 1000;
}

export function gradeOffset(offsetMs: number): CueGrade {
  const off = Math.abs(offsetMs);
  if (off <= 90) return 'perfect';
  if (off <= 170) return 'great';
  if (off <= 290) return 'ok';
  return 'miss';
}

export const CUE_POINTS: Record<CueGrade, number> = { perfect: 10, great: 7, ok: 3, miss: -4 };

const FX_FOR_ENERGY: Record<SongEnergy, CueKind> = { high: 'drive', mid: 'filter', low: 'echo' };

const FX_PROMPT: Record<CueKind, string> = {
  drop: 'THE DROP: hit it on the one',
  filter: 'Sweep the FILTER into the next bar',
  echo: 'Throw an ECHO on the next downbeat',
  drive: 'Slam the DRIVE on the next downbeat',
};

/** Two cues per song: the drop, then an effect that suits the song. */
export function cuesForSong(song: ShowSong): Cue[] {
  const fx = FX_FOR_ENERGY[song.energy];
  return [
    { kind: 'drop', bar: DROP_BAR, prompt: FX_PROMPT.drop },
    { kind: fx, bar: FX_BAR, prompt: FX_PROMPT[fx] },
  ];
}

/** A stage choice: does it work? Better at the stat behind it. */
export function resolveStageOption(
  option: StageOption,
  statValue: number,
  rng: () => number = Math.random
): { worked: boolean; energy: number; line: string } {
  const fail = Math.max(0.05, Math.min(0.9, option.risk * (1.5 - statValue / 100)));
  const worked = rng() >= fail;
  return { worked, energy: worked ? option.good : option.bad, line: worked ? option.goodLine : option.badLine };
}

/** Crowd energy after a song: what the song brings, plus how it was played. */
export function nextCrowdEnergy(current: number, song: ShowSong, cuePoints: number, momentEnergy: number): number {
  const fromSong = (song.heat - 45) / 5 + (song.energy === 'high' ? 3 : song.energy === 'low' ? -2 : 0);
  return Math.max(0, Math.min(100, current + fromSong + cuePoints * 0.8 + momentEnergy));
}

// ─── After the show ───────────────────────────────────────────────────────────

export interface ShowTally {
  stats: PlayerStats;
  burnout: number;
  showBonus: number;
  setBonus: number;
  /** Sum of cue points across the set. */
  cuePoints: number;
  /** Crowd energy after each song. */
  energies: number[];
}

export function finalScore(t: ShowTally): number {
  const base = stagePower(t.stats) - exhaustion(t.stats.energy, t.burnout) * 0.4;
  const crowd = t.energies.length > 0 ? t.energies.reduce((a, b) => a + b, 0) / t.energies.length : 50;
  const raw = base * 0.5 + crowd * 0.4 + t.setBonus + t.cuePoints * 0.35 + t.showBonus;
  return Math.max(5, Math.min(100, Math.round(raw)));
}

export function starsFor(score: number): number {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 58) return 3;
  if (score >= 40) return 2;
  return 1;
}

const REVIEWS: [number, string][] = [
  [92, 'One of those nights people lie about being at for the rest of their lives.'],
  [80, 'A complete command of the room. The best show in town this year.'],
  [65, 'Strong, sweaty, a few moments that will be on everyone’s story tomorrow.'],
  [50, 'Solid. Nothing went wrong, nothing went legendary.'],
  [35, 'Uneven. Long stretches where the crowd was watching their phones.'],
  [0, 'Rough. The kind of night you don’t post about.'],
];

export function reviewFor(score: number): string {
  return (REVIEWS.find(([min]) => score >= min) ?? REVIEWS[REVIEWS.length - 1])[1];
}

/** New fans a night wins: the crowd you converted. */
export function showFans(crowd: number, score: number): number {
  return Math.round(crowd * Math.max(0, (score - 30) / 140));
}

/** A club gig's pay: the door, for an artist this size. */
export function gigPayout(capacity: number, fans: number): number {
  const sold = Math.min(capacity, Math.round(150 + fans * 0.02));
  return Math.round(sold * 18);
}
