import type { StartingPerk } from '../../types/meta';

/**
 * Cross-save starting perks. Unlocked by accumulating lifetime legacy across
 * retired careers, opted into at onboarding. They are deliberately MODEST
 * stat nudges + flavor tags, not power spikes — the point is the feeling of
 * an inheritance ("my last legend opened this door"), not trivializing the
 * game. Data-driven: a new perk is one entry here.
 */
export const STARTING_PERKS: StartingPerk[] = [
  {
    id: 'second-generation',
    label: 'Second-Generation Artist',
    description:
      'You grew up around the industry. You start with contacts and a little less to prove.',
    statBonuses: { industryRespect: 8, charisma: 4 },
    startingMoneyBonus: 1500,
    startingFansBonus: 300,
    startingTags: ['nepotism-whispers'],
    unlockAtLegacy: 250,
  },
  {
    id: 'old-soul',
    label: 'Old Soul',
    description:
      'You absorbed a previous legend’s craft. Sharper instincts from day one.',
    statBonuses: { writing: 6, creativity: 6, authenticity: 4 },
    startingMoneyBonus: 0,
    startingFansBonus: 0,
    startingTags: ['old-soul'],
    unlockAtLegacy: 500,
  },
  {
    id: 'thick-skin',
    label: 'Thick Skin',
    description:
      'You watched a career get torn apart once. The internet does not scare you the way it used to.',
    statBonuses: { mentalHealth: 10, reputation: 3 },
    startingMoneyBonus: 0,
    startingFansBonus: 0,
    startingTags: ['battle-tested'],
    unlockAtLegacy: 800,
  },
  {
    id: 'viral-instinct',
    label: 'Viral Instinct',
    description:
      'Something about your timing. You feel the culture before it turns.',
    statBonuses: { charisma: 6, creativity: 4 },
    startingMoneyBonus: 0,
    startingFansBonus: 1200,
    startingTags: ['culture-radar'],
    unlockAtLegacy: 1200,
  },
  {
    id: 'war-chest',
    label: 'War Chest',
    description:
      'An inherited fortune. Money is not the thing standing in your way this time.',
    statBonuses: {},
    startingMoneyBonus: 12_000,
    startingFansBonus: 0,
    startingTags: ['old-money'],
    unlockAtLegacy: 1800,
  },
];

export function getPerk(id: string): StartingPerk | undefined {
  return STARTING_PERKS.find((p) => p.id === id);
}
