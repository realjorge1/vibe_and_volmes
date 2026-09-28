/**
 * Always-on, local, deterministic content safety. Runs for BOTH providers so
 * generated drama stays edgy but app-store-safe and never defames real
 * people. Two stages:
 *   1. preConstraints() — injected into every cloud system prompt.
 *   2. screen() — post-generation scrub/reject (also covers local output).
 */

const SYSTEM_SAFETY = [
  'You write FICTIONAL in-game social chatter for a music-career sim.',
  'All artists, labels, and outlets are fictional. NEVER reference real public figures, real brands, or real platforms.',
  'Allowed: petty, dramatic, messy, sarcastic, gossipy tone.',
  'Forbidden: slurs, hate toward protected groups, sexual content, sexualized minors, real-person defamation, self-harm or illegal how-to, threats of real violence.',
  'Keep each line under 240 characters. No hashtags spam, no emojis flood.',
].join(' ');

export function preConstraints(): string {
  return SYSTEM_SAFETY;
}

// Obvious real-world music figures we must never surface as "real". Fictional
// game NPCs won't collide with these; a model hallucinating one will.
const REAL_PERSON_BLOCK = [
  'taylor swift', 'drake', 'kanye', 'beyonce', 'beyoncé', 'rihanna', 'eminem',
  'kendrick', 'travis scott', 'nicki minaj', 'cardi b', 'billie eilish',
  'the weeknd', 'ariana grande', 'justin bieber', 'bad bunny', 'sza',
];

const HARD_BLOCK = [
  // hate / slurs (stems) and unsafe categories — kept terse on purpose
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
