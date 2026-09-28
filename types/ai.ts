import type { AIFeature } from '../constants/aiConfig';

export type { AIFeature };

/**
 * Token-bounded summary of the player's world. NEVER send raw history to a
 * provider — `buildContextCapsule` distills stores into this small struct so
 * generation references the career without paying for the whole save file.
 */
export interface CareerCapsule {
  artistName: string;
  genre: string;
  fameTier: string; // e.g. "Rising Star"
  fanBand: string; // bucketed, not raw count: "200K–1M"
  reputationTier: string; // e.g. "Controversial"
  arcPhase: string; // career-arc phase
  momentum: number; // -100..100
  latestTrack: string | null;
  /** Top scandals/feuds/triumphs by severity — the things the net remembers. */
  memorableBeats: { summary: string; kind: string; severity: number }[];
  topRival: {
    name: string;
    intensity: number;
    legendary: boolean;
  } | null;
  activeControversy: {
    kind: string;
    heat: number;
  } | null;
  /** Free-form tags the world reacts to (beef, comeback, …). */
  moodTags: string[];
}

/**
 * A structured generation intent. Pipelines build this; the LOCAL provider
 * renders it deterministically, the CLOUD provider serializes it to a prompt.
 * Same spec → same contract regardless of backend (no behavioural drift).
 */
export interface GenSpec {
  feature: AIFeature;
  capsule: CareerCapsule;
  /** Feature-specific knobs (post sentiment, persona id, line count…). */
  params: Record<string, string | number | boolean>;
  /** Deterministic seed so local output is cacheable and reproducible. */
  seed: string;
}

export interface AIRequest {
  feature: AIFeature;
  spec: GenSpec;
  /** Cloud-only natural-language rendering of the spec. */
  system: string;
  promptText: string;
  maxOutputTokens: number;
  temperature: number;
}

export interface AIResult {
  /** Newline-separated generated items (pipelines split as needed). */
  text: string;
  provider: 'local' | 'cloud';
  tokensIn: number;
  tokensOut: number;
  cached: boolean;
  /** True when we fell back to local after a cloud/moderation failure. */
  degraded: boolean;
  /** True when moderation rejected output and a safe template was used. */
  moderated: boolean;
}

export interface AIProvider {
  id: 'local' | 'cloud';
  /** Cheap, cached health probe. Local is always healthy. */
  isHealthy(): Promise<boolean>;
  generate(req: AIRequest): Promise<AIResult>;
}

// ─── Structured content schemas ────────────────────────────────────────────
//
// Every feature has a typed STRUCTURED INPUT (the params a pipeline feeds the
// gateway) and a STRUCTURED OUTPUT (the shape a pipeline parses lines back
// into). The wire format between provider and gateway is always newline-
// delimited lines — cheap to generate, trivial to moderate per-line, identical
// for local and cloud — but pipelines surface these typed shapes so callers
// never hand-parse raw text. These types are the contract the prompt-template
// library and the local renderer both render against.

export type InterviewTone =
  | 'softball'
  | 'neutral'
  | 'probing'
  | 'gotcha'
  | 'hostile';

/** Outcome an award-show beat is reacting to. */
export type AwardOutcome = 'win' | 'nomination' | 'snub' | 'performance';

export interface InterviewGenParams {
  tone: InterviewTone;
  count: number;
}

export interface CommentThreadGenParams {
  /** Sentiment that seeds the argument (matches PostSentiment keys). */
  sentiment: string;
  count: number;
}

export interface AwardGenParams {
  outcome: AwardOutcome;
  ceremony: string;
  category: string;
  count: number;
}

export interface NewsGenParams {
  outlet: string;
  count: number;
}

export interface ChronicleGenParams {
  /** Which retrospective article to write. */
  mode: 'biography' | 'top-moments';
  count: number;
}

/** One reply in a generated argument thread. */
export interface CommentThreadEntry {
  role: 'stan' | 'hater' | 'neutral';
  text: string;
}

/** A retrospective article (biography / Top Moments). Title + body paragraphs. */
export interface ChronicleArticle {
  title: string;
  paragraphs: string[];
}
