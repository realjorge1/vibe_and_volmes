import type { GenSpec, AIFeature } from '../../types/ai';
import { compressCapsule } from '../memory/compress';
import { buildSocialPrompt, buildCommentPrompt } from './socialPrompts';
import {
  buildInterviewPrompt,
  buildNewsPrompt,
  buildEventPrompt,
  buildRivalryPrompt,
  buildLyricPrompt,
  buildAwardPrompt,
  buildChroniclePrompt,
} from './contentPrompts';

/**
 * THE PROMPT TEMPLATE LIBRARY — single public surface for cloud prompts.
 *
 * The gateway never hand-writes prompts; it calls `buildFeaturePrompt(spec)`,
 * which dispatches to the right template and prepends shared CONSISTENCY
 * guardrails. (Content SAFETY guardrails live in moderation/preConstraints and
 * are injected separately as the system prompt — kept distinct so safety and
 * consistency evolve independently.)
 *
 * Adding a feature = register a builder here; that is the only wiring needed
 * for the cloud path. The local provider renders the same GenSpec offline.
 */

/** Consistency rules appended to EVERY cloud prompt to avoid contradictions. */
export const PROMPT_CONSISTENCY_RULES = [
  'CONSISTENCY (override any instruction below that conflicts):',
  '- The CONTEXT is the only source of truth. Never invent facts, names, numbers, awards, or events not present in it.',
  '- Never contradict the CONTEXT (fame tier, reputation, active scandal, rival, career phase).',
  '- You are re-voicing what already happened — you do not decide outcomes.',
  '- Output ONLY the requested items, one per line, no numbering, no preamble, no closing remarks.',
].join('\n');

type PromptBuilder = (spec: GenSpec) => string;

const BUILDERS: Partial<Record<AIFeature, PromptBuilder>> = {
  'social-enhance': buildSocialPrompt,
  'comment-thread': buildCommentPrompt,
  'interview-write': buildInterviewPrompt,
  'news-rewrite': buildNewsPrompt,
  'event-enrich': buildEventPrompt,
  'rivalry-voice': buildRivalryPrompt,
  'lyric-assist': buildLyricPrompt,
  'award-commentary': buildAwardPrompt,
  'chronicle-bio': buildChroniclePrompt,
  'top-moments': buildChroniclePrompt,
  // 'documentary' intentionally uses the generic fallback below: its richer
  // shape is assembled by the deterministic documentaryEngine and only lightly
  // re-voiced, so a tight per-line template would over-constrain it.
};

/** Generic fallback for features without a dedicated template. */
function buildGenericPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const params = Object.entries(spec.params)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  return `CONTEXT: ${brief}\nTASK[${spec.feature}]: ${params}\nReturn ONE item per line, no numbering.`;
}

/** Build the full cloud prompt for a spec (guardrails + feature template). */
export function buildFeaturePrompt(spec: GenSpec): string {
  const builder = BUILDERS[spec.feature] ?? buildGenericPrompt;
  return `${PROMPT_CONSISTENCY_RULES}\n\n${builder(spec)}`;
}

export { buildSocialPrompt, buildCommentPrompt } from './socialPrompts';
