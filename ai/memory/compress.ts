import type { CareerCapsule } from '../../types/ai';
import { AI_CONFIG } from '../../constants/aiConfig';

/** Rough token estimate — no tokenizer ships on RN, chars/4 is close enough. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / AI_CONFIG.charsPerToken);
}

/**
 * Serialize a capsule to the most compact natural-language brief a cloud
 * model needs, then hard-trim to the token budget. The local provider never
 * uses this (it reads the struct directly); this only exists so cloud calls
 * stay bounded and predictable in cost.
 */
export function compressCapsule(c: CareerCapsule): string {
  const parts: string[] = [
    `${c.artistName}, ${c.genre} artist. ${c.fameTier} (${c.fanBand} fans), reputation: ${c.reputationTier}.`,
    `Career: ${c.arcPhase}, momentum ${c.momentum}.`,
  ];
  if (c.latestTrack) parts.push(`Latest release: "${c.latestTrack}".`);
  if (c.activeControversy)
    parts.push(
      `ACTIVE SCANDAL: ${c.activeControversy.kind} (heat ${c.activeControversy.heat}).`
    );
  if (c.topRival)
    parts.push(
      `Rival: ${c.topRival.name} (intensity ${c.topRival.intensity}${
        c.topRival.legendary ? ', legendary feud' : ''
      }).`
    );
  if (c.memorableBeats.length)
    parts.push(
      `The internet remembers: ${c.memorableBeats
        .map((b) => b.summary)
        .join('; ')}.`
    );
  if (c.moodTags.length) parts.push(`Tags: ${c.moodTags.join(', ')}.`);

  let brief = parts.join(' ');
  const maxChars = AI_CONFIG.maxCapsuleTokens * AI_CONFIG.charsPerToken;
  if (brief.length > maxChars) brief = brief.slice(0, maxChars) + '…';
  return brief;
}
