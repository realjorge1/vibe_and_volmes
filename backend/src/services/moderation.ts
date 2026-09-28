/**
 * Server-side content safety — a copy of the client filter (app
 * ai/moderation/filter.ts) run on every cloud generation so the proxy NEVER
 * returns unsafe text, even if a client is modified or bypassed. The client
 * keeps its own copy for local (offline) output; duplication is intentional so
 * each tier is self-contained.
 *
 *   screenLines(): drops unsafe lines, salvages/redacts the rest.
 */

const REAL_PERSON_BLOCK = [
  'taylor swift', 'drake', 'kanye', 'beyonce', 'beyoncé', 'rihanna', 'eminem',
  'kendrick', 'travis scott', 'nicki minaj', 'cardi b', 'billie eilish',
  'the weeknd', 'ariana grande', 'justin bieber', 'bad bunny', 'sza',
];

const HARD_BLOCK = [
  'n1gg', 'f4gg', 'r4pe', 'kys', 'kill yourself', 'child p', 'cp ',
  'how to make a bomb', 'school shoot',
];

const SOFT_REDACT: [RegExp, string][] = [
  [/\bn[\W_]*[i1][\W_]*g[\W_]*g[\W_]*[ae3]r?\b/gi, '[redacted]'],
  [/\bf[\W_]*a[\W_]*g[\W_]*g?[o0]?t?\b/gi, '[redacted]'],
];

export interface ScreenResult {
  ok: boolean;
  cleaned: string;
}

/**
 * Returns ok=false when the line must be dropped entirely (caller falls back
 * to a safe template). Returns ok=true with `cleaned` when it could be salvaged.
 */
export function screen(text: string): ScreenResult {
  const lower = text.toLowerCase();

  for (const term of HARD_BLOCK) {
    if (lower.includes(term)) return { ok: false, cleaned: '' };
  }
  for (const name of REAL_PERSON_BLOCK) {
    if (lower.includes(name)) return { ok: false, cleaned: '' };
  }

  let cleaned = text;
  for (const [re, rep] of SOFT_REDACT) cleaned = cleaned.replace(re, rep);

  // Trim runaway length / emoji floods defensively.
  cleaned = cleaned.replace(/(\p{Emoji}\s*){4,}/gu, '🔥🔥 ').slice(0, 260).trim();
  if (!cleaned) return { ok: false, cleaned: '' };
  return { ok: true, cleaned };
}

/** Screen a multi-line block; drops unsafe lines, keeps the rest. */
export function screenLines(block: string): { lines: string[]; rejected: number } {
  const out: string[] = [];
  let rejected = 0;
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const r = screen(line);
    if (r.ok) out.push(r.cleaned);
    else rejected++;
  }
  return { lines: out, rejected };
}
