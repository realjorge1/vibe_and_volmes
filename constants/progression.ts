import type { CareerLevel, XpSource } from '../types/progression';

/**
 * The 30-level fame ladder: complete nobody → immortal icon.
 *
 * XP curve: each level costs ~1.32x the previous band, so early levels
 * pop fast (onboarding dopamine) and the back half feels earned and
 * legendary. xpToReach is CUMULATIVE total XP to stand at that level.
 */
function buildCurve(): number[] {
  const out: number[] = [0]; // level 1 = 0 XP
  let band = 120; // cost of level 1 → 2
  let total = 0;
  for (let lvl = 2; lvl <= 30; lvl++) {
    total += Math.round(band);
    out.push(total);
    band *= 1.32;
  }
  return out;
}

const CURVE = buildCurve();

const META: Array<Omit<CareerLevel, 'xpToReach'>> = [
  { level: 1,  title: 'Unknown Talent',      blurb: 'Nobody knows your name. Yet.',                 unlocks: ['Bedroom recording'],            milestone: 'Your journey begins.',                 color: '#5C636B' },
  { level: 2,  title: 'Local Performer',     blurb: 'Open mics and tiny rooms.',                    unlocks: ['Local gigs'],                   milestone: 'First people clapped.',                color: '#5C636B' },
  { level: 3,  title: 'Underground Prospect', blurb: 'The scene is whispering.',                    unlocks: ['Feature requests'],             milestone: 'The underground noticed you.',         color: '#5C636B' },
  { level: 4,  title: 'Buzzing Artist',      blurb: 'A little heat. A little pressure.',            unlocks: ['Blog coverage'],                milestone: 'You are officially buzzing.',          color: '#9BA1A8' },
  { level: 5,  title: 'Rising Voice',        blurb: 'People are picking sides about you.',          unlocks: ['Indie label offers'],           milestone: 'A real fanbase forms.',                color: '#2E8DFF' },
  { level: 6,  title: 'Local Hero',          blurb: 'Your city claims you.',                        unlocks: ['Headline local shows'],         milestone: 'Hometown hero status.',                color: '#2E8DFF' },
  { level: 7,  title: 'Breakout Act',        blurb: 'The algorithm found you.',                     unlocks: ['Playlist placement'],           milestone: 'You broke containment.',               color: '#2E8DFF' },
  { level: 8,  title: 'Charting Artist',     blurb: 'You exist on the charts now.',                 unlocks: ['Chart tracking'],               milestone: 'First chart entry.',                   color: '#2E8DFF' },
  { level: 9,  title: 'In-Demand Name',      blurb: 'Everyone wants a verse.',                      unlocks: ['Major collaborations'],         milestone: 'Collabs unlocked.',                    color: '#2E8DFF' },
  { level: 10, title: 'Certified Artist',    blurb: 'No longer a question mark.',                   unlocks: ['Label deals', 'Magazine press'], milestone: 'You are certified.',                  color: '#2E8DFF' },
  { level: 11, title: 'Radio Regular',       blurb: 'They can’t skip you.',                    unlocks: ['Radio campaigns'],              milestone: 'Radio rotation.',                      color: '#2E8DFF' },
  { level: 12, title: 'Festival Draw',       blurb: 'Your name is on the poster.',                  unlocks: ['Festival slots'],               milestone: 'Festival main stages.',                color: '#2E8DFF' },
  { level: 13, title: 'Headliner',           blurb: 'People come for YOU.',                         unlocks: ['Headline tours'],               milestone: 'You headline now.',                    color: '#2E8DFF' },
  { level: 14, title: 'Chart Threat',        blurb: 'Rivals reschedule around you.',                unlocks: ['Strategic release windows'],    milestone: 'A genuine chart threat.',              color: '#2E8DFF' },
  { level: 15, title: 'Household Name',      blurb: 'Your mom’s coworkers know you.',          unlocks: ['Brand endorsements'],           milestone: 'Mainstream crossover.',                color: '#2E8DFF' },
  { level: 16, title: 'Hitmaker',            blurb: 'You manufacture moments.',                     unlocks: ['Guaranteed hit features'],      milestone: 'Hitmaker reputation.',                 color: '#2E8DFF' },
  { level: 17, title: 'Tastemaker',          blurb: 'You move culture, not just charts.',           unlocks: ['Trendsetting'],                 milestone: 'You set the trends.',                  color: '#2E8DFF' },
  { level: 18, title: 'A-List Artist',       blurb: 'The room rearranges when you enter.',          unlocks: ['Award nominations'],            milestone: 'A-list status.',                       color: '#FFFFFF' },
  { level: 19, title: 'Award Contender',     blurb: 'Your name is in the envelopes.',               unlocks: ['Major award campaigns'],        milestone: 'Award season player.',                 color: '#FFFFFF' },
  { level: 20, title: 'Superstar',           blurb: 'You are the main event of the industry.',      unlocks: ['Stadium tours', 'Luxury sponsorships'], milestone: 'Full superstar.',              color: '#FFFFFF' },
  { level: 21, title: 'Global Force',        blurb: 'Continents stream you simultaneously.',        unlocks: ['World tours'],                  milestone: 'Global reach.',                        color: '#FFFFFF' },
  { level: 22, title: 'Culture Shifter',     blurb: 'A release from you is a national event.',      unlocks: ['Event releases'],               milestone: 'You bend the culture.',                color: '#FFFFFF' },
  { level: 23, title: 'Genre Titan',         blurb: 'Your name defines the sound.',                 unlocks: ['Genre ownership'],              milestone: 'Titan of the genre.',                  color: '#FFFFFF' },
  { level: 24, title: 'Industry Power',      blurb: 'Labels fear and court you.',                   unlocks: ['Own imprint'],                  milestone: 'Real industry power.',                 color: '#FFFFFF' },
  { level: 25, title: 'Icon',                blurb: 'A silhouette people recognize.',               unlocks: ['Iconic status perks'],          milestone: 'You are an icon.',                     color: '#FFFFFF' },
  { level: 26, title: 'Living Legend',       blurb: 'Documentaries are being pitched.',             unlocks: ['Legacy projects'],              milestone: 'Living legend.',                       color: '#D9C77E' },
  { level: 27, title: 'Generational Artist', blurb: 'Kids cite you as the reason.',                 unlocks: ['Generational influence'],       milestone: 'Generational impact.',                 color: '#D9C77E' },
  { level: 28, title: 'Hall of Famer',       blurb: 'Your spot is already reserved.',               unlocks: ['Hall of Fame'],                 milestone: 'Hall of Fame inductee.',               color: '#D9C77E' },
  { level: 29, title: 'Untouchable',         blurb: 'Criticism doesn’t reach you anymore.',    unlocks: ['Untouchable status'],           milestone: 'Beyond reach.',                        color: '#D9C77E' },
  { level: 30, title: 'Immortal Icon',       blurb: 'You will be played a hundred years from now.', unlocks: ['Immortality'],                  milestone: 'Immortalized forever.',                color: '#D9C77E' },
];

export const CAREER_LEVELS: CareerLevel[] = META.map((m, i) => ({
  ...m,
  xpToReach: CURVE[i],
}));

export const MAX_LEVEL = 30;

/** Base XP yields. Scaled by magnitude at the call site. */
export const XP_REWARDS: Record<XpSource, number> = {
  release: 80,
  viral: 220,
  'fan-growth': 1, // per-unit, scaled by sqrt of fans gained
  chart: 60,
  controversy: 110,
  event: 25,
  performance: 70,
  milestone: 150,
  engagement: 15,
  luxury: 40,
};

/** Career level standing for a given cumulative XP. */
export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < CAREER_LEVELS.length; i++) {
    if (xp >= CAREER_LEVELS[i].xpToReach) lvl = CAREER_LEVELS[i].level;
    else break;
  }
  return lvl;
}

export function levelInfo(level: number): CareerLevel {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, level));
  return CAREER_LEVELS[clamped - 1];
}

/** Progress (0-1) and raw numbers within the current level band. */
export function levelProgress(xp: number): {
  level: number;
  intoLevel: number;
  span: number;
  ratio: number;
  nextAt: number;
} {
  const level = levelForXp(xp);
  const cur = levelInfo(level).xpToReach;
  const isMax = level >= MAX_LEVEL;
  const nextAt = isMax ? cur : levelInfo(level + 1).xpToReach;
  const span = isMax ? 1 : nextAt - cur;
  const intoLevel = xp - cur;
  return {
    level,
    intoLevel,
    span,
    ratio: isMax ? 1 : Math.max(0, Math.min(1, intoLevel / span)),
    nextAt,
  };
}
