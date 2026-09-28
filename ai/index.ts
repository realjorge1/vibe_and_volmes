/**
 * Phase 4 AI Immersion Layer — public surface.
 *
 * Design contract (do not bypass):
 *  - AI is a DECORATOR, never a driver. The deterministic Phase 1–3 sim
 *    (phase3Tick → InfluenceBundle → applyBundle) owns every mechanical
 *    outcome. AI only rewrites surface text / adds flavor.
 *  - Nothing calls a provider directly — everything goes through `gateway`.
 *  - Generation is async and fire-and-forget; the weekly tick never awaits.
 *  - With AI off / offline / over-budget the game is byte-for-byte playable
 *    via the local deterministic provider.
 */

export { requestGeneration } from './gateway';
export { enhanceFeed, enhanceCurrentFeedAsync } from './pipelines/socialEnhancer';
export {
  interviewWriter,
  lyricAssistant,
  rivalryVoice,
  newsRewriter,
  eventEnricher,
  commentThread,
  awardCommentary,
  documentaryWriter,
  enhanceInterviewPrompts,
  suggestLyricLines,
  enhanceDocumentary,
  enhanceBiography,
  enhanceTopMoments,
} from './pipelines/stubs';
export { buildFeaturePrompt } from './prompts';
export { buildContextCapsule } from './memory/capsule';
export { loadBudget, budgetSnapshot } from './budget/ledger';
export { pruneCache } from './cache/genCache';
export type {
  CareerCapsule,
  GenSpec,
  AIResult,
  AwardOutcome,
  CommentThreadEntry,
  ChronicleArticle,
} from '../types/ai';
