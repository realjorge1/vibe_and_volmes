/**
 * Wire contracts shared with the client. Deliberately DUPLICATED here (a small,
 * stable subset of the app's `types/ai.ts` and `types/sync.ts`) so the backend
 * has zero import coupling to the Expo app and lifts out cleanly for separate
 * deployment. Keep these in sync with the client by hand — they are tiny.
 */

// ─── AI proxy ──────────────────────────────────────────────────────────────

/** Body of POST /ai/generate. The client builds the prompt; we hold the key. */
export interface AIGenerateRequest {
  feature: string;
  system: string;
  promptText: string;
  /** Optional overrides; server falls back to its env defaults. */
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

/** Response of POST /ai/generate. Maps onto the client's cloud AIResult. */
export interface AIGenerateResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  /** True when moderation dropped one or more lines from the model output. */
  moderated: boolean;
}

// ─── Community sync ─────────────────────────────────────────────────────────

/** Mirrors client `CommunityLegend` (types/sync.ts). */
export interface CommunityLegend {
  id: string;
  artistName: string;
  identityTitle: string;
  legacyTier: string;
  legacyTotal: number;
  era: string;
  signatureMoment: string;
  /** True for shipped seed data, false for community-published entries. */
  seeded: boolean;
}

/** Minimal subset of the client `StoryCard` (types/legacy.ts) we persist. */
export interface PublishedStoryCard {
  artistName: string;
  tagline?: string;
  signatureMoment?: string;
  legacyTier?: string;
  legacyTotal?: number;
}
