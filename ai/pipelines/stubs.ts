import type {
  GenSpec,
  AIFeature,
  AwardOutcome,
  CommentThreadEntry,
} from '../../types/ai';
import type { InterviewSession } from '../../types/industry';
import type { LyricTheme } from '../../types/audio';
import { buildContextCapsule, capsuleSignature } from '../memory/capsule';
import { requestGeneration } from '../gateway';

/**
 * Phase 4 specialized pipelines. Each is a thin, typed shell over the
 * gateway: build a feature GenSpec from live state → generate → parse →
 * return text. They are DECORATORS — the deterministic systems
 * (mediaEngine, lyricGenerator, rivalryEngine, eventEngine, documentary
 * Engine) remain the source of truth; these only ever supply richer
 * surface text and degrade silently to deterministic local output.
 *
 * Integration rule: tick-bound systems (news/event/rivalry resolve inside
 * the synchronous weekly sim) must NOT await these — call them from an
 * async surface and patch optimistically, exactly like the social enhancer.
 */

interface RunOut {
  lines: string[];
  provider: 'local' | 'cloud' | 'none';
  /** True only when a real cloud model produced the text (adds value over
   *  hand-authored baselines — used to gate authored-text overrides). */
  cloudAuthored: boolean;
}

async function run(
  feature: AIFeature,
  params: GenSpec['params'],
  week: number
): Promise<RunOut> {
  const capsule = buildContextCapsule();
  if (!capsule) return { lines: [], provider: 'none', cloudAuthored: false };
  const spec: GenSpec = {
    feature,
    capsule,
    params,
    seed: `${capsuleSignature(capsule)}|${feature}|${JSON.stringify(params)}`,
  };
  const r = await requestGeneration(spec, week);
  const lines = r.text.split('\n').map((l) => l.trim()).filter(Boolean);
  return {
    lines,
    provider: r.provider,
    cloudAuthored: r.provider === 'cloud' && !r.degraded,
  };
}

// ─── Primary callables (back-compat: return raw lines) ─────────────────────

export const interviewWriter = (week: number, tone = 'probing', count = 4) =>
  run('interview-write', { tone, count }, week).then((o) => o.lines);

export const lyricAssistant = (week: number, theme = 'flex', lines = 4) =>
  run('lyric-assist', { theme, lines }, week).then((o) => o.lines);

export const rivalryVoice = (week: number, mode = 'sneak-diss') =>
  run('rivalry-voice', { mode }, week).then((o) => o.lines[0] ?? null);

export const newsRewriter = (week: number, outlet = 'gossip', count = 2) =>
  run('news-rewrite', { outlet, count }, week).then((o) => o.lines);

export const eventEnricher = (week: number, eventId: string) =>
  run('event-enrich', { eventId }, week).then((o) => o.lines[0] ?? null);

/**
 * Argument thread under a hot post. Returns typed entries with the role each
 * line plays (roles alternate stan/hater, matching the template + local
 * renderer), so a UI can style the two sides differently without re-parsing.
 */
export async function commentThread(
  week: number,
  sentiment = 'hostile',
  count = 4
): Promise<CommentThreadEntry[]> {
  const out = await run('comment-thread', { sentiment, count }, week);
  return out.lines.map((text, i) => ({
    role: i % 2 === 0 ? 'stan' : 'hater',
    text,
  }));
}

/**
 * Live award-show broadcast commentary. `outcome` is decided by the
 * deterministic sim (the award event), never by AI — this only voices it.
 */
export const awardCommentary = (
  week: number,
  outcome: AwardOutcome = 'nomination',
  ceremony = 'The Meridian Music Awards',
  category = 'Best New Artist',
  count = 3
) =>
  run(
    'award-commentary',
    {
      outcome,
      ceremony,
      category,
      sentiment: outcome === 'win' ? 'hype' : outcome === 'snub' ? 'shade' : 'news',
      count,
    },
    week
  ).then((o) => o.lines);

/**
 * Phase 5: optional richer documentary narration. The deterministic
 * documentaryEngine output is the source of truth and always shown; this
 * only fires when AI is enabled/affordable and merely returns extra prose.
 */
export const documentaryWriter = (week: number, count = 5) =>
  run('documentary', { count }, week).then((o) => o.lines);

// ─── Typed integration helpers (used by the UI seams) ──────────────────────

/**
 * Rewrite an interview's question prompts in-character around the live
 * controversy/rivalry. Returns a questionId→prompt map. ONLY overrides when
 * a cloud model actually authored richer text — otherwise the hand-written
 * deterministic prompts stay the truth (returns {}).
 */
export async function enhanceInterviewPrompts(
  session: InterviewSession,
  week: number
): Promise<Record<string, string>> {
  const tone = session.outletKind === 'press-conference' ? 'hostile' : 'probing';
  const out = await run(
    'interview-write',
    { tone, count: session.questionIds.length },
    week
  );
  if (!out.cloudAuthored || out.lines.length === 0) return {};
  const map: Record<string, string> = {};
  session.questionIds.forEach((qid, i) => {
    if (out.lines[i]) map[qid] = out.lines[i];
  });
  return map;
}

/** Lyric line ideas. Deterministic local is acceptable here — the brief
 *  scopes this as inspiration, not pro songwriting, offline-first. */
export async function suggestLyricLines(
  theme: LyricTheme,
  week: number,
  count = 4
): Promise<string[]> {
  const out = await run('lyric-assist', { theme, lines: count }, week);
  return out.lines;
}

/**
 * Optionally enrich documentary narration. Returns the original paragraphs
 * unless a cloud model produced a richer set of the same shape.
 */
export async function enhanceDocumentary(
  base: string[],
  week: number
): Promise<string[]> {
  const out = await run('documentary', { count: base.length }, week);
  if (!out.cloudAuthored || out.lines.length < Math.min(3, base.length)) {
    return base;
  }
  return out.lines;
}

/**
 * Chronicle biography. Optionally rewrites the deterministic biography
 * paragraphs richer. Same decorator contract as enhanceDocumentary: the
 * baseline is the truth and is returned unless a cloud model produced a
 * fuller version of the same shape.
 */
export async function enhanceBiography(
  base: string[],
  week: number
): Promise<string[]> {
  const out = await run('chronicle-bio', { mode: 'biography', count: base.length }, week);
  if (!out.cloudAuthored || out.lines.length < Math.min(3, base.length)) {
    return base;
  }
  return out.lines;
}

/**
 * Chronicle "Top Moments" article. Optionally rewrites the deterministic
 * ranked entries richer; baseline is returned otherwise.
 */
export async function enhanceTopMoments(
  base: string[],
  week: number
): Promise<string[]> {
  const out = await run('top-moments', { mode: 'top-moments', count: base.length }, week);
  if (!out.cloudAuthored || out.lines.length < Math.min(2, base.length)) {
    return base;
  }
  return out.lines;
}
