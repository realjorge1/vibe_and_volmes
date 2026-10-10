/**
 * HOW PEOPLE TYPE (pure). The same words read differently from different
 * people: all lowercase, ALL CAPS when they're excited, "sooo", an extra
 * "!!", a heart at the end. Every change here keeps the words themselves,
 * so the real-photo guard (systems/social/protect) still recognises a vetted
 * line after it was typed out by someone.
 */

type Rnd = () => number;

/** Emoji people tack on the end (all kind; the guard knows them). */
export const TAIL_EMOJI: readonly string[] = ['❤️', '🥹', '😍', '🔥', '✨', '🙌', '😭', '🫶', '💯'];

const STRETCH: Record<string, readonly string[]> = {
  so: ['sooo', 'soooo'],
  omg: ['omggg', 'omgggg'],
  yes: ['yesss', 'yessss'],
  love: ['loveee'],
  cute: ['cuteee'],
  wait: ['waittt'],
  stop: ['stoppp'],
  hi: ['hiii', 'hiiii'],
  okay: ['okayyy'],
  please: ['pleaseee'],
  wow: ['wowww'],
  girl: ['girlll'],
  why: ['whyyy'],
  now: ['nowww'],
  good: ['gooood'],
  pretty: ['prettyyy'],
};

const HAS_EMOJI = /\p{Extended_Pictographic}/u;

/** Who is typing: how loud they are, how much they bother with capitals. */
export interface Typist {
  lower: number;
  caps: number;
  stretch: number;
  bang: number;
  tail: number;
}

export const TYPISTS: Record<'casual' | 'stan' | 'calm' | 'hater', Typist> = {
  casual: { lower: 0.55, caps: 0.05, stretch: 0.2, bang: 0.15, tail: 0.18 },
  stan: { lower: 0.45, caps: 0.16, stretch: 0.35, bang: 0.3, tail: 0.3 },
  calm: { lower: 0.2, caps: 0, stretch: 0.05, bang: 0.05, tail: 0.1 },
  hater: { lower: 0.7, caps: 0.06, stretch: 0.05, bang: 0, tail: 0 },
};

export function typed(text: string, r: Rnd, who: Typist = TYPISTS.casual): string {
  let t = text;
  const tagged = /@/.test(t);
  if (r() < who.caps && t.length <= 32 && !tagged) t = t.toUpperCase();
  else if (r() < who.lower) t = t.toLowerCase();
  if (r() < who.stretch) {
    const words = Object.keys(STRETCH).filter((w) => new RegExp(`(^|\\s)${w}(?=$|[\\s!?.,])`, 'i').test(t));
    if (words.length > 0) {
      const w = words[Math.floor(r() * words.length)];
      const forms = STRETCH[w];
      const form = forms[Math.floor(r() * forms.length)];
      t = t.replace(new RegExp(`(^|\\s)${w}(?=$|[\\s!?.,])`, 'i'), (_m, pre: string) => `${pre}${t === t.toUpperCase() ? form.toUpperCase() : form}`);
    }
  }
  if (r() < who.bang && /[a-z]$/i.test(t)) t = `${t}!!`;
  if (r() < who.tail && !HAS_EMOJI.test(t)) t = `${t} ${TAIL_EMOJI[Math.floor(r() * TAIL_EMOJI.length)]}`;
  return t;
}
