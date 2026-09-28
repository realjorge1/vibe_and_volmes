import type { PRStrategy } from '../../types/industry';

/**
 * PR responses. Success is computed by the PR engine from these baselines
 * blended with the controversy's severity, whether the player is actually
 * guilty, charisma, and whether they have a PR team. The internet is
 * deliberately noisy — even a "good" strategy can backfire.
 */
export const PR_STRATEGIES: PRStrategy[] = [
  {
    id: 'ignore',
    label: 'Say Nothing',
    description: 'Refuse to acknowledge it and hope it dies.',
    cost: 0,
    baseSuccess: 0.4,
    successIfInnocent: 0.55,
    successIfGuilty: 0.3,
    backfireHeatGain: 14,
    requiresPRTeam: false,
  },
  {
    id: 'deny',
    label: 'Flat Denial',
    description: 'Publicly deny everything, no nuance.',
    cost: 0,
    baseSuccess: 0.45,
    successIfInnocent: 0.7,
    successIfGuilty: 0.2,
    backfireHeatGain: 22,
    requiresPRTeam: false,
  },
  {
    id: 'apology-sincere',
    label: 'Sincere Apology',
    description: 'Take real accountability in your own words.',
    cost: 0,
    baseSuccess: 0.5,
    successIfInnocent: 0.4,
    successIfGuilty: 0.62,
    backfireHeatGain: 10,
    requiresPRTeam: false,
  },
  {
    id: 'apology-forced',
    label: 'Notes-App Apology',
    description: 'A clearly lawyered, half-hearted statement.',
    cost: 0,
    baseSuccess: 0.35,
    successIfInnocent: 0.3,
    successIfGuilty: 0.4,
    backfireHeatGain: 20,
    requiresPRTeam: false,
  },
  {
    id: 'deflect',
    label: 'Change the Narrative',
    description: 'Drop news/music to bury the story.',
    cost: 15_000,
    baseSuccess: 0.48,
    successIfInnocent: 0.5,
    successIfGuilty: 0.46,
    backfireHeatGain: 12,
    requiresPRTeam: false,
  },
  {
    id: 'counterattack',
    label: 'Counterattack',
    description: 'Go after whoever started it, aggressively.',
    cost: 0,
    baseSuccess: 0.42,
    successIfInnocent: 0.6,
    successIfGuilty: 0.28,
    backfireHeatGain: 28,
    requiresPRTeam: false,
  },
  {
    id: 'lay-low',
    label: 'Disappear for a While',
    description: 'Go silent and offline until it cools.',
    cost: 0,
    baseSuccess: 0.52,
    successIfInnocent: 0.55,
    successIfGuilty: 0.5,
    backfireHeatGain: 6,
    requiresPRTeam: false,
  },
  {
    id: 'pr-team-spin',
    label: 'Deploy PR Team',
    description: 'Let professionals engineer the recovery.',
    cost: 40_000,
    baseSuccess: 0.66,
    successIfInnocent: 0.78,
    successIfGuilty: 0.58,
    backfireHeatGain: 8,
    requiresPRTeam: true,
  },
];

export function getStrategy(id: string): PRStrategy | undefined {
  return PR_STRATEGIES.find((s) => s.id === id);
}
