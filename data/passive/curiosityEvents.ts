import type { CuriosityEventDef } from '../../types/passive';

/**
 * Curiosity beats — the "you'll never guess what happened" hooks that make
 * opening the app a small surprise. Weighted by the activities scheduled, then
 * rolled per resolved slot (see systems/passive/curiosityEngine). Effects are
 * bounded one-shot nudges folded into the recap totals. A few seed multi-step
 * storylines that advance across resumes (the brief's "evolving storylines").
 */
export const CURIOSITY_EVENTS: CuriosityEventDef[] = [
  {
    id: 'dj-spin',
    favoredBy: ['promotion', 'social'],
    weight: 3,
    headlines: [
      'A big-city DJ spun your track on air and the requests started.',
      'Your song soundtracked a viral clip overnight. Strangers are searching your name.',
    ],
    effect: { fanDriftMult: 1.2, xp: { source: 'engagement', amount: [10, 20] } },
  },
  {
    id: 'stylist-dm',
    favoredBy: ['networking', 'press'],
    weight: 2,
    headlines: [
      'A rising stylist slid into your DMs about a free fit for the next shoot.',
      'A boutique label offered to dress you for an upcoming appearance.',
    ],
    effect: { stats: { charisma: [1, 2] } },
  },
  {
    id: 'old-clip',
    favoredBy: ['social'],
    weight: 2,
    headlines: [
      'A 2-year-old clip of you resurfaced. The replies are… a lot.',
      'An old verse of yours became a meme template. Free promo, sort of.',
    ],
    effect: { fanDriftMult: 1.15 },
  },
  {
    id: 'studio-magic',
    favoredBy: ['studio', 'songwriting'],
    weight: 3,
    headlines: [
      'You cracked an idea at 4am that you cannot stop humming.',
      'A throwaway voice memo turned into the best hook you have written.',
    ],
    effect: { stats: { creativity: [1, 2], writing: [1, 2] }, xp: { source: 'engagement', amount: [10, 18] } },
  },
  {
    id: 'small-bag',
    favoredBy: ['promotion', 'press'],
    weight: 2,
    headlines: [
      'A sync agent licensed a snippet for an indie ad. Small bag, real bag.',
      'Merch you forgot about sold out while you were gone.',
    ],
    effect: { earn: [300, 700] },
  },
  {
    id: 'cosign-storyline',
    favoredBy: ['networking', 'social'],
    weight: 2,
    headlines: [
      'A bigger artist quote-tweeted you. People are watching to see what happens next.',
    ],
    effect: { fanDriftMult: 1.1, stats: { industryRespect: [1, 2] } },
    storyline: {
      title: 'The Co-Sign',
      steps: 3,
      cooldownMs: 6 * 60 * 60 * 1000,
    },
  },
  {
    id: 'rumor-storyline',
    favoredBy: ['social', 'press'],
    weight: 1,
    headlines: [
      'A blind item dropped and half the timeline thinks it is about you.',
    ],
    effect: { fanDriftMult: 1.1 },
    storyline: {
      title: 'The Blind Item',
      steps: 3,
      cooldownMs: 5 * 60 * 60 * 1000,
    },
  },
];

/** Storyline continuation lines, keyed by storyline def id and step (1-indexed). */
export const STORYLINE_STEPS: Record<string, string[]> = {
  'cosign-storyline': [
    'The co-sign is gaining traction — fans are tagging the bigger artist daily.',
    'Word is a studio session might actually happen. Nothing confirmed.',
    'The session happened. Whatever it becomes, you are on their radar now.',
  ],
  'rumor-storyline': [
    'The blind item is still spreading. You said nothing, which said everything.',
    'A "source close to the situation" weighed in. The plot thickened.',
    'It fizzled out, like these always do — but your name trended for a week.',
  ],
};

export function getCuriosityEvent(id: string): CuriosityEventDef | undefined {
  return CURIOSITY_EVENTS.find((e) => e.id === id);
}
