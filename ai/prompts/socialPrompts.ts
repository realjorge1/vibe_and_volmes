import type { GenSpec } from '../../types/ai';
import type { Platform, PostSentiment, FanSegment } from '../../types/social';
import { compressCapsule } from '../memory/compress';

/**
 * AI PROMPT TEMPLATES — SOCIAL CONTENT.
 *
 * The deterministic sim decides WHAT happened (which posts, what sentiment,
 * which platform, which fan segment, the engagement numbers). The AI layer only
 * rewrites the natural-language *surface* of selected posts. These templates
 * make that contract explicit to the cloud model:
 *
 *   - it is handed the structured metadata (platform voice, segment, sentiment),
 *   - it must return EXACTLY one rewritten post per line, N lines, no metadata,
 *   - it must not invent engagement numbers, hashtags counts, or change which
 *     platform/segment is speaking.
 *
 * The local provider ignores prose entirely and renders from the same spec, so
 * behaviour is identical with AI off.
 */

/** How each platform "sounds" — injected so rewrites match the medium. */
export const PLATFORM_VOICE: Record<Platform, string> = {
  chirper:
    'Chirp (microblogging): terse, quote-tweet energy, lowercase, ratio-bait, ≤220 chars',
  flashpic:
    'VibeSnap (photo/lifestyle): aspirational caption voice, emojis, aesthetic, hashtag-light',
  tunetok:
    'HypeFeed (short video): hook-first, trend-aware, "POV:" / "the way…", chaotic-gen-z',
  vibestream:
    'PulseNews (music news): clipped headline/blurb register, sourced, industry-literate',
};

/** How each fan segment talks — the same event in six different voices. */
export const SEGMENT_VOICE_PROMPT: Record<FanSegment, string> = {
  hardcore: 'a devoted day-one fan: protective, references the deep cuts',
  casual: 'a casual listener: lukewarm, only half-paying-attention',
  stan: 'an unhinged stan: ALL CAPS bursts, parasocial, will fight anyone',
  toxic: 'a hater/troll: sneering, bad-faith, dunking for engagement',
  local: 'a hometown fan: proud, regional, "we knew them before" energy',
  international: 'an international fan: trend-driven, mixes languages, emoji-forward',
};

const SENTIMENT_DIRECTION: Record<PostSentiment, string> = {
  hype: 'euphoric hype, stan-energy praise',
  positive: 'warm, genuine approval',
  neutral: 'detached, observational',
  critical: 'measured criticism, "it’s not that deep"',
  hostile: 'openly hostile, pile-on energy',
  meme: 'absurd, format-driven joke',
  news: 'breaking-news / report register',
  shade: 'plausible-deniability shade, side-eye',
};

export interface SocialPromptParams {
  sentiment: PostSentiment;
  count: number;
  platform?: Platform;
  segment?: FanSegment;
}

/**
 * Build the cloud prompt for a batch of social-post rewrites. Keeps the
 * structured contract front-and-center so the model can only change wording.
 */
export function buildSocialPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const p = spec.params as unknown as SocialPromptParams;
  const platform = p.platform ? PLATFORM_VOICE[p.platform] : 'a general social feed';
  const segment = p.segment ? SEGMENT_VOICE_PROMPT[p.segment] : 'mixed members of the public';
  const sentiment = SENTIMENT_DIRECTION[p.sentiment] ?? 'neutral';
  const count = Number(p.count ?? 3);

  return [
    `CONTEXT: ${brief}`,
    `MEDIUM: ${platform}`,
    `SPEAKER: ${segment}`,
    `TONE: ${sentiment}`,
    `TASK: Write ${count} distinct in-world social posts reacting to this artist.`,
    `RULES:`,
    `- One post per line. Exactly ${count} lines. No numbering, no quotes, no labels.`,
    `- Stay in the MEDIUM and SPEAKER voice; match the TONE.`,
    `- Reference the CONTEXT (their scandal/rival/arc) when natural — never invent new facts.`,
    `- Do NOT include engagement counts, metadata, or @-handles. Body text only.`,
  ].join('\n');
}

/**
 * Prompt for AI-written comment/reply threads under a hot post. The replies
 * alternate stan/hater so the parser can label roles by index (see the
 * commentThread pipeline). News headlines live in contentPrompts.buildNewsPrompt.
 */
export function buildCommentPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const p = spec.params as unknown as SocialPromptParams;
  const count = Number(p.count ?? 4);
  return [
    `CONTEXT: ${brief}`,
    `TASK: Write ${count} replies in a comment thread arguing about this artist.`,
    `Alternate strictly: line 1 a defensive stan, line 2 a hostile hater, repeat. ${SENTIMENT_DIRECTION[p.sentiment]}.`,
    `One reply per line, exactly ${count} lines, no numbering, body text only.`,
  ].join('\n');
}
