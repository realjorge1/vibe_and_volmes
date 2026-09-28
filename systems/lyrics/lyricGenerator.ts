import type { Lyrics, LyricTheme, LyricSection } from '../../types/audio';
import { LYRIC_TEMPLATES, MONEY_WORDS } from '../../data/lyrics/lyricTemplates';
import { pick, pickN, shuffle } from '../../utils/random';

/**
 * Procedural, offline lyric generation. No API. Stitches modular line pools
 * (hooks / verses / adlibs / bridge / intro / outro) into a real-looking
 * structure and fills tokens from the player's world. Players can also write
 * their own — both produce the same `Lyrics` shape the scorer reads.
 */

export interface LyricContext {
  name: string;
  city: string;
  genre: string;
  rival?: string;
  ex?: string;
}

function fill(line: string, ctx: LyricContext): string {
  return line
    .replace(/\{name\}/g, ctx.name)
    .replace(/\{city\}/g, ctx.city)
    .replace(/\{genre\}/g, ctx.genre)
    .replace(/\{rival\}/g, ctx.rival ?? 'they')
    .replace(/\{ex\}/g, ctx.ex ?? 'you')
    .replace(/\{moneyWord\}/g, pick(MONEY_WORDS));
}

function take(pool: string[] | undefined, n: number, ctx: LyricContext): string[] {
  if (!pool || pool.length === 0) return [];
  return pickN(pool, Math.min(n, pool.length)).map((l) => fill(l, ctx));
}

function countWords(sections: LyricSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.lines.join(' ').trim().split(/\s+/).filter(Boolean).length,
    0
  );
}

/** Generate a full song structure for a theme. */
export function generateLyrics(theme: LyricTheme, ctx: LyricContext): Lyrics {
  const t = LYRIC_TEMPLATES[theme];
  const hook: string[] = take(t.hook, 4, ctx);
  const adlibs = take(t.adlib, 3, ctx);

  const sections: LyricSection[] = [];
  const intro = take(t.intro, 1, ctx);
  if (intro.length) sections.push({ type: 'intro', lines: intro });

  sections.push({ type: 'hook', lines: hook });
  sections.push({ type: 'verse', lines: take(t.verse, 6, ctx) });
  sections.push({ type: 'hook', lines: hook });

  const bridge = take(t.bridge, 2, ctx);
  if (bridge.length) sections.push({ type: 'bridge', lines: bridge });

  sections.push({ type: 'verse', lines: shuffle(take(t.verse, 5, ctx)) });
  sections.push({ type: 'hook', lines: hook });
  if (adlibs.length) sections.push({ type: 'adlib', lines: adlibs });

  const outro = take(t.outro, 1, ctx);
  if (outro.length) sections.push({ type: 'outro', lines: outro });

  return {
    theme,
    sections,
    source: 'generated',
    wordCount: countWords(sections),
  };
}

/** Wrap player-authored text into the same model (theme tags their intent). */
export function makeWrittenLyrics(theme: LyricTheme, raw: string): Lyrics {
  const blocks = raw
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const sections: LyricSection[] = (blocks.length ? blocks : [raw.trim()]).map(
    (block) => ({
      type: 'verse' as const,
      lines: block.split('\n').map((l) => l.trim()).filter(Boolean),
    })
  );

  return {
    theme,
    sections,
    source: 'written',
    wordCount: countWords(sections),
  };
}

/** A short prompt to nudge a player who chose to write their own. */
export const THEME_PROMPTS: Record<LyricTheme, string> = {
  flex: 'Where you started vs. where you are now. Make them feel the distance.',
  heartbreak: 'One specific detail of the person. Specifics hurt more than "I miss you".',
  diss: 'Don\'t say their name in line one. Build to it.',
  motivational: 'Talk to one person who almost quit. You.',
  party: 'Put us in the room. What does it smell, sound, feel like?',
  introspective: 'The thought you have at 3am that you don\'t say out loud.',
  love: 'A small ordinary moment, not the grand gesture.',
};
