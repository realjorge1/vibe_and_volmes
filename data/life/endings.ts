import type { EndingDef } from '../../types/life';

/**
 * How careers end, besides choosing to retire. Pure content, checked once a
 * week at the end of the transition (systems/life/endingEngine.ts), in this
 * order: the first ending whose check passes and whose roll lands, ends it.
 * Every ending goes through the same end screen, dossier and retirement.
 */
export const ENDINGS: readonly EndingDef[] = [
  {
    id: 'died-reckless',
    label: 'Gone Too Soon',
    kind: 'died',
    check: { minWeek: 8, mentalGte: [{ axis: 'addictionRisk', value: 90 }] },
    chance: 0.05,
    finalLine: '{artist} died at {age}. The afterparties caught up. The tributes have not stopped.',
  },
  {
    id: 'died-of-health',
    label: 'Health Gave Out',
    kind: 'died',
    check: { minWeek: 8, minAge: 50, tags: ['health-risk'] },
    chance: 0.015,
    finalLine: '{artist} died at {age}. The doctor had warned them. The music did not stop playing.',
  },
  {
    id: 'died-of-age',
    label: 'Died of Old Age',
    kind: 'died',
    check: { minAge: 75 },
    chance: 0.02,
    ageRisk: { from: 75, perYear: 0.01 },
    finalLine: '{artist} died peacefully at {age}, surrounded by people who knew every word.',
  },
  {
    id: 'burnout',
    label: 'Burned Out',
    kind: 'quit',
    check: {
      minWeek: 8,
      statLte: [{ stat: 'mentalHealth', value: 10 }],
      mentalGte: [{ axis: 'burnout', value: 80 }],
    },
    chance: 0.25,
    finalLine: '{artist} walked away from music at {age}. There was nothing left to give.',
  },
  {
    id: 'cancelled',
    label: 'Cancelled for Good',
    kind: 'quit',
    check: {
      minWeek: 8,
      statLte: [
        { stat: 'reputation', value: 8 },
        { stat: 'industryRespect', value: 12 },
      ],
    },
    chance: 0.15,
    finalLine: 'At {age}, {artist} posted a notes-app apology and never released music again.',
  },
];

/** The ending the player chooses from the Chronicle. Never rolled. */
export const RETIREMENT: EndingDef = {
  id: 'retirement',
  label: 'Retired',
  kind: 'retired',
  check: {},
  chance: 0,
  finalLine: '{artist} retired at {age} and walked off the stage on their own terms.',
};

export function getEnding(id: string): EndingDef {
  return ENDINGS.find((e) => e.id === id) ?? RETIREMENT;
}
