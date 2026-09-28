import type {
  MixSettings,
  ReverbPreset,
  CompressionPreset,
  EmotionalTone,
  LyricTheme,
} from '../types/audio';

// ─── Recording ─────────────────────────────────────────────────────────────

/** Hard ceiling on a single take. Keeps files small + UX game-like. */
export const MAX_RECORDING_SEC = 120;
/** Below this a take is treated as an accidental tap, not a real vocal. */
export const MIN_RECORDING_SEC = 2;
/** Metering poll cadence for the live waveform (ms). */
export const METERING_INTERVAL_MS = 90;
/** Number of amplitude buckets stored per recording for the waveform. */
export const WAVEFORM_BUCKETS = 64;

/**
 * Custom expo-audio recording preset: AAC in an .m4a container, mono, modest
 * bitrate. Small files, fine for a sim game, stable on low-end Android.
 * Mirrors the shape of `RecordingPresets.*` so it can be passed directly to
 * `useAudioRecorder`.
 */
export const VOCAL_RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 96000,
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 'mpeg4aac' as const,
    audioQuality: 0x60, // AVAudioQuality.high
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 96000,
  },
};

// ─── Mixing ────────────────────────────────────────────────────────────────

export const DEFAULT_MIX: MixSettings = {
  vocalVolume: 0.85,
  beatVolume: 0.7,
  reverb: 'room',
  compression: 'soft',
  // Tasteful starting point: neutral filter, a touch of space + grit, light echo.
  filter: 0.5,
  space: 0.25,
  echo: 0.12,
  drive: 0.1,
};

/**
 * Fill in any missing fields on a (possibly older / partial) mix with the
 * defaults. Persisted drafts saved before the DJ-FX fields existed come back
 * without them, so every read path normalizes through this.
 */
export function withMixDefaults(mix?: Partial<MixSettings> | null): MixSettings {
  return { ...DEFAULT_MIX, ...(mix ?? {}) };
}

/** Metadata for the DJ-FX knobs, used by the mix UI. */
export const FX_KNOBS: {
  key: 'filter' | 'space' | 'echo' | 'drive';
  label: string;
  hint: string;
  bipolar?: boolean;
}[] = [
  { key: 'filter', label: 'Filter', hint: 'LP ◄ ─ ► HP', bipolar: true },
  { key: 'space', label: 'Space', hint: 'reverb' },
  { key: 'echo', label: 'Echo', hint: 'delay throws' },
  { key: 'drive', label: 'Drive', hint: 'grit' },
];

/**
 * Runtime-layered playback can't truly DSP-process audio without a heavy
 * native module, so reverb/compression are *perceptual*: they nudge playback
 * gain and feed the scoring engine. This keeps the "fun creator tool" feel
 * without a mastering chain.
 */
export const REVERB_GAIN: Record<ReverbPreset, number> = {
  none: 1.0,
  room: 0.98,
  hall: 0.95,
  plate: 0.96,
};

export const COMPRESSION_GAIN: Record<CompressionPreset, number> = {
  none: 1.0,
  soft: 1.04,
  radio: 1.1,
  punch: 1.08,
};

/** How much a tasteful mix can swing the production sub-score (±). */
export const MIX_SCORE_SWING = 12;

// ─── Scoring weights ───────────────────────────────────────────────────────

/** Weights for the five score pillars. Must sum to 1. */
export const SCORE_PILLAR_WEIGHTS = {
  performance: 0.26,
  songwriting: 0.24,
  production: 0.2,
  starPower: 0.16,
  zeitgeist: 0.14,
};

/** Random spread applied to each pillar so two identical takes still differ. */
export const SCORE_PILLAR_JITTER = 6;

export const VERDICTS: { min: number; label: string }[] = [
  { min: 90, label: 'Instant classic' },
  { min: 80, label: 'Certified heat' },
  { min: 70, label: 'A real moment' },
  { min: 58, label: 'Solid drop' },
  { min: 45, label: 'It has its fans' },
  { min: 30, label: 'Mid, honestly' },
  { min: 0, label: 'A swing and a miss' },
];

// ─── Emotional tone mapping ────────────────────────────────────────────────

export const THEME_TONE: Record<LyricTheme, EmotionalTone> = {
  flex: 'confident',
  heartbreak: 'melancholic',
  diss: 'angry',
  motivational: 'confident',
  party: 'euphoric',
  introspective: 'reflective',
  love: 'tender',
};

// ─── Export ────────────────────────────────────────────────────────────────

export const SONGS_DIR = 'songs';
export const EXPORT_MANIFEST = 'song.json';
