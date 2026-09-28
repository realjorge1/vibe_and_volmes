import type { MusicGenre } from './player';
import type { ReleaseResult } from './music';

// ─── Beats ─────────────────────────────────────────────────────────────────

export type BeatGenre =
  | 'trap'
  | 'drill'
  | 'afrobeats'
  | 'r&b'
  | 'pop'
  | 'indie'
  | 'hyperpop';

export type BeatMood =
  | 'dark'
  | 'hype'
  | 'melodic'
  | 'sad'
  | 'romantic'
  | 'aggressive'
  | 'dreamy'
  | 'triumphant';

/**
 * A bundled instrumental. `asset` is the result of `require()` on a shipped
 * audio file, or `null` when the slot has no file dropped in yet — the beat
 * is still fully selectable inside the simulation, it just won't play audio.
 */
export interface Beat {
  id: string;
  title: string;
  producer: string;
  genre: BeatGenre;
  mood: BeatMood;
  bpm: number;
  musicalKey: string;
  durationSec: number;
  /** Instrumental production quality, 0-100. Feeds the production pillar. */
  quality: number;
  /** How respected the producer is, 0-100. Feeds chart playlist support. */
  producerReputation: number;
  /** `require('../../assets/beats/...')` module id, or null if not shipped. */
  asset: number | null;
  /** Genres this beat naturally flatters, used by the scoring engine. */
  flattersGenres: MusicGenre[];
  license: string;
  /**
   * True for instrumentals delivered by a premium cosmetic beat pack. These
   * are cosmetic VARIETY only — their quality distribution matches the free
   * catalog, so owning a pack never confers a mechanical advantage.
   */
  premium?: boolean;
  /** Owning cosmetic pack id (a CosmeticItem id) when `premium` is true. */
  packId?: string;
}

// ─── Lyrics ────────────────────────────────────────────────────────────────

export type LyricSectionType =
  | 'intro'
  | 'verse'
  | 'hook'
  | 'bridge'
  | 'adlib'
  | 'outro';

export type LyricTheme =
  | 'flex'
  | 'heartbreak'
  | 'diss'
  | 'motivational'
  | 'party'
  | 'introspective'
  | 'love';

export interface LyricSection {
  type: LyricSectionType;
  lines: string[];
}

export interface Lyrics {
  theme: LyricTheme;
  sections: LyricSection[];
  source: 'written' | 'generated';
  wordCount: number;
}

// ─── Vocal recording ───────────────────────────────────────────────────────

export interface VocalRecording {
  id: string;
  /** Local file uri inside the app sandbox. */
  uri: string;
  durationSec: number;
  createdAt: number;
  /** Down-sampled 0..1 amplitude peaks for the waveform renderer. */
  peaks: number[];
  /** Average metering in dBFS (negative). Used as a confidence proxy. */
  meteringAvg: number;
}

// ─── Mixing ────────────────────────────────────────────────────────────────

export type ReverbPreset = 'none' | 'room' | 'hall' | 'plate';
export type CompressionPreset = 'none' | 'soft' | 'radio' | 'punch';

export interface MixSettings {
  vocalVolume: number; // 0..1
  beatVolume: number; // 0..1
  reverb: ReverbPreset;
  compression: CompressionPreset;
  // ── Live DJ FX (real-time, tweakable while it plays) ──
  /** DJ filter sweep. 0.5 = neutral; <0.5 closes a low-pass, >0.5 opens a high-pass. */
  filter: number; // 0..1
  /** Reverb send — sense of space/room. 0..1 */
  space: number; // 0..1
  /** Tempo-ish ping-pong delay send — echo/throws. 0..1 */
  echo: number; // 0..1
  /** Saturation / analog grit driven onto the beat bus. 0..1 */
  drive: number; // 0..1
}

// ─── Song draft + finished song ────────────────────────────────────────────

export type CreationStep =
  | 'beat'
  | 'lyrics'
  | 'record'
  | 'mix'
  | 'release'
  | 'finalize';

// ─── Release plan (collaborators, timing, marketing) ─────────────────────────

/**
 * How the record is rolled out. A strategic lever, not a calendar:
 * - `surprise`: drop with no warning — a buzz/authenticity spike, lower sustain.
 * - `standard`: a normal release, neutral.
 * - `campaign`: a marketing-backed rollout — big first-week + playlist push,
 *   rewards (and expects) a marketing budget behind it.
 */
export type ReleaseRollout = 'surprise' | 'standard' | 'campaign';

/** A featured artist credited on the record. */
export interface FeatureCredit {
  artistId: string;
  name: string;
  fans: number;
  /** Money paid to secure the feature. */
  cost: number;
  /** Reach the feature adds, 0-100 (scales first-week streams). */
  reachBonus: number;
  /** Credibility/industry push the feature adds, 0-100 (chart playlist). */
  credibilityBonus: number;
}

export type EmotionalTone =
  | 'euphoric'
  | 'confident'
  | 'melancholic'
  | 'angry'
  | 'tender'
  | 'reflective';

/** Work-in-progress song that lives only in the audio store until released. */
export interface SongDraft {
  id: string;
  step: CreationStep;
  beatId: string | null;
  lyrics: Lyrics | null;
  recording: VocalRecording | null;
  mix: MixSettings;
  title: string;
  coverArtId: string | null;
  /** Featured artists secured for this release. */
  collaborators: FeatureCredit[];
  /** Rollout strategy chosen on the Release Plan step. */
  rollout: ReleaseRollout;
  /** Money committed to marketing this release. */
  marketingBudget: number;
  createdAt: number;
  updatedAt: number;
}

export interface SongScoreBreakdown {
  performance: number; // vocal confidence + timing
  songwriting: number; // lyric quality + originality
  production: number; // beat fit + mix
  starPower: number; // fame + charisma + reputation
  zeitgeist: number; // genre trend + luck
}

export interface SongScore {
  critic: number; // 0-100
  fan: number; // 0-100
  replayability: number; // 0-100
  viralPotential: number; // 0-100
  authenticity: number; // 0-100
  overall: number; // 0-100
  verdict: string;
  breakdown: SongScoreBreakdown;
}

/**
 * A finished, released song. Carries the audio references plus the
 * simulation-facing numbers. It bridges into the Phase 1 `Track` model via
 * `systems/songs/songEngine` so charts/social keep working unchanged.
 */
export interface ProducedSong {
  id: string;
  trackId: string;
  title: string;
  genre: MusicGenre;
  beatId: string | null;
  beatTitle: string;
  durationSec: number;
  recordingUri: string | null;
  peaks: number[];
  coverArtId: string;
  lyricsTheme: LyricTheme | null;
  emotionalTone: EmotionalTone;
  mix: MixSettings;
  score: SongScore;
  releasedAtWeek: number;
  releasedAt: number;
  popularity: number; // mirrors weekly streams pressure, 0-100
  controversial: boolean;
  /** Featured artists credited on the release. */
  collaborators: FeatureCredit[];
  /** Rollout strategy used. */
  rollout: ReleaseRollout;
  /** Money spent marketing this release. */
  marketingBudget: number;
  exported: boolean;
  exportPath: string | null;
}

export interface ProduceSongInput {
  draft: SongDraft;
}

export interface ProduceSongResult {
  song: ProducedSong;
  release: ReleaseResult;
}

// ─── Export ────────────────────────────────────────────────────────────────

export interface ExportResult {
  ok: boolean;
  /** Absolute path of the exported song folder. */
  path: string | null;
  shared: boolean;
  error?: string;
}
