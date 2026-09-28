import type {
  GenSpec,
  AwardGenParams,
  ChronicleGenParams,
  InterviewGenParams,
  NewsGenParams,
} from '../../types/ai';
import { compressCapsule } from '../memory/compress';
import { SENTIMENT_DIRECTIVE } from '../personas/voices';

/**
 * AI PROMPT TEMPLATES — NARRATIVE & EDITORIAL CONTENT.
 *
 * Companion to socialPrompts.ts. Every builder turns a structured GenSpec into
 * a cloud prompt with three invariants the gateway depends on:
 *   - the structured CONTEXT (the capsule brief) is front-and-center so the
 *     model can only re-voice facts the sim already decided,
 *   - the output contract is "exactly N items, one per line, no numbering",
 *     so the line-based parser + per-line moderation work identically to the
 *     local provider, and
 *   - nothing instructs the model to invent stats, outcomes, or real people —
 *     consistency guardrails are appended centrally in prompts/index.ts and
 *     safety in moderation/preConstraints.
 *
 * The LOCAL provider ignores all of this prose and renders the same GenSpec
 * deterministically, so behaviour is identical with AI off.
 */

/** Tone direction for interview questioners, by escalation level. */
const INTERVIEW_TONE: Record<string, string> = {
  softball: 'friendly, fan-facing, lets the artist look good',
  neutral: 'professional, even-handed, genuinely curious',
  probing: 'sharp but fair, willing to name the uncomfortable thing',
  gotcha: 'adversarial, baiting a soundbite, looking for the slip',
  hostile: 'openly accusatory, treats the interview as a reckoning',
};

/** How each outlet slants a music-news line. */
const OUTLET_REGISTER: Record<string, string> = {
  gossip: 'messy blind-item energy, "sources say", zero proof, maximum implication',
  critic: 'craft-literate, weighs the work, qualified praise then the knife',
  industry: 'dry trade-press insider, market framing, careful wording',
  tabloid: 'screaming tabloid, manufactured outrage, ranked-list bait',
};

/** What the room is reacting to at an awards ceremony. */
const AWARD_FRAME: Record<string, string> = {
  win: 'they just WON — capture the upset/coronation energy and the room',
  nomination: 'they were nominated, not yet called — anticipation and odds',
  snub: 'they were snubbed/lost — the cutaway face, the discourse it sparks',
  performance: 'they just performed live on the broadcast — the spectacle of it',
};

export function buildInterviewPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const p = spec.params as unknown as InterviewGenParams;
  const tone = INTERVIEW_TONE[p.tone] ?? INTERVIEW_TONE.probing;
  const count = Number(p.count ?? 4);
  return [
    `CONTEXT: ${brief}`,
    `ROLE: An interviewer questioning this artist on the record. Style: ${tone}.`,
    `TASK: Write ${count} interview QUESTIONS (not answers) aimed at this artist.`,
    `RULES:`,
    `- One question per line. Exactly ${count} lines. No numbering, no answers.`,
    `- Build on the CONTEXT — their scandal, rival, momentum, latest release.`,
    `- Each question must be answerable as either a deflection or a confession.`,
  ].join('\n');
}

export function buildNewsPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const p = spec.params as unknown as NewsGenParams;
  const register = OUTLET_REGISTER[p.outlet] ?? OUTLET_REGISTER.gossip;
  const count = Number(p.count ?? 2);
  return [
    `CONTEXT: ${brief}`,
    `OUTLET VOICE: ${register}.`,
    `TASK: Write ${count} music-news headlines about this artist this week.`,
    `RULES:`,
    `- One headline per line. Exactly ${count} lines. No numbering, no source tags, no dates.`,
    `- Reference the CONTEXT; never fabricate chart numbers, sales, or quotes.`,
  ].join('\n');
}

export function buildEventPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  return [
    `CONTEXT: ${brief}`,
    `TASK: Write ONE vivid sentence of flavour layered over a game event that just`,
    `happened to this artist — the public/internet ripple, not the mechanics.`,
    `RULES: One line only. No new facts, no numbers, present tense, cinematic.`,
  ].join('\n');
}

export function buildRivalryPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const mode = String(spec.params.mode ?? 'sneak-diss');
  const rival = spec.capsule.topRival?.name ?? 'a rival';
  return [
    `CONTEXT: ${brief}`,
    `TASK: Write ONE in-character public line from the rival ${rival} (mode: ${mode}).`,
    `RULES:`,
    `- One line. Format it as: ${rival}: "<the quote>".`,
    `- Match the mode (sneak-diss = deniable, statement = on-record, threat, fake-apology, reconcile).`,
    `- Stay inside the CONTEXT feud; do not invent events.`,
  ].join('\n');
}

export function buildLyricPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const theme = String(spec.params.theme ?? 'flex');
  const lines = Number(spec.params.lines ?? 4);
  return [
    `CONTEXT: ${brief}`,
    `TASK: Write ${lines} candidate lyric LINES on the theme "${theme}" for this artist.`,
    `RULES:`,
    `- One line per line. Exactly ${lines} lines. No numbering, no section labels.`,
    `- Colour them with this artist's world (arc, rival, reputation) when natural.`,
    `- Inspiration only — singable fragments, not a finished verse.`,
  ].join('\n');
}

export function buildAwardPrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const p = spec.params as unknown as AwardGenParams;
  const frame = AWARD_FRAME[p.outcome] ?? AWARD_FRAME.nomination;
  const count = Number(p.count ?? 3);
  const sentiment = SENTIMENT_DIRECTIVE[String(spec.params.sentiment ?? 'news')] ?? '';
  return [
    `CONTEXT: ${brief}`,
    `SCENE: The ${p.ceremony} — category "${p.category}". ${frame}.`,
    `TASK: Write ${count} lines of live award-show BROADCAST COMMENTARY about this`,
    `artist as it happens (host quips, correspondent asides, the room reacting).`,
    sentiment ? `TONE: ${sentiment}.` : '',
    `RULES:`,
    `- One commentary beat per line. Exactly ${count} lines. No numbering.`,
    `- Stay in the moment; reference the CONTEXT; never announce a result the sim didn't decide.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Retrospective long-form: biography or "Top Moments" article. */
export function buildChroniclePrompt(spec: GenSpec): string {
  const brief = compressCapsule(spec.capsule);
  const p = spec.params as unknown as ChronicleGenParams;
  const count = Number(p.count ?? 5);
  const beats =
    spec.capsule.memorableBeats.map((b) => b.summary).join('; ') || 'a quiet career';

  if (p.mode === 'top-moments') {
    return [
      `CONTEXT: ${brief}`,
      `THE MOMENTS THAT DEFINED THEM: ${beats}.`,
      `TASK: Write a ranked "Top Moments" retrospective — ${count} entries, the`,
      `single most legendary/infamous beats of this artist's career so far.`,
      `RULES:`,
      `- One entry per line, exactly ${count} lines, most legendary first. No numbering.`,
      `- Each entry: a punchy headline-style recap of ONE real beat from CONTEXT.`,
      `- Dramatize, do not invent — only beats present in CONTEXT.`,
    ].join('\n');
  }

  return [
    `CONTEXT: ${brief}`,
    `THE INTERNET REMEMBERS: ${beats}.`,
    `TASK: Write a ${count}-paragraph career BIOGRAPHY of this artist — origin,`,
    `rise, the defining conflict, and where they stand now.`,
    `RULES:`,
    `- One paragraph per line. Exactly ${count} lines. No numbering, no headers.`,
    `- Documentary-prose register; ground every claim in the CONTEXT.`,
    `- Do not invent awards, sales figures, or real people.`,
  ].join('\n');
}
