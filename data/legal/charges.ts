import type { ChargeDef } from '../../types/legal';

/**
 * What the artist can be charged with. An outcome or event choice names a
 * charge with `legalCharge`; the case runs from there (data → systems/legal).
 * Sentences are in game weeks (a week is about a month of life).
 */
export const CHARGES: ChargeDef[] = [
  {
    id: 'assault',
    label: 'Assault',
    blurb: 'The fight made it onto three phones and one police report.',
    severity: 'serious',
    evidence: 0.62,
    sentence: [3, 8],
    fine: 25_000,
    headline: '{playerName} charged with assault after a fight outside a club',
  },
  {
    id: 'dui',
    label: 'DUI',
    blurb: 'Blue lights in the mirror at 3 a.m.',
    severity: 'minor',
    evidence: 0.75,
    sentence: [1, 3],
    fine: 8_000,
    headline: '{playerName} arrested for driving under the influence',
  },
  {
    id: 'possession',
    label: 'Possession',
    blurb: 'It was in your bag. Whose it was is a long story.',
    severity: 'minor',
    evidence: 0.65,
    sentence: [1, 4],
    fine: 5_000,
    headline: '{playerName} arrested on possession charges',
  },
  {
    id: 'weapons',
    label: 'Weapons possession',
    blurb: 'A traffic stop, a search, and a gun under the seat.',
    severity: 'serious',
    evidence: 0.55,
    sentence: [4, 10],
    fine: 15_000,
    headline: 'Police found a gun in {playerName}’s car',
  },
  {
    id: 'vandalism',
    label: 'Vandalism',
    blurb: 'The hotel suite will need a new everything.',
    severity: 'minor',
    evidence: 0.7,
    sentence: [0, 2],
    fine: 12_000,
    headline: '{playerName} charged after trashing a hotel suite',
  },
  {
    id: 'trespassing',
    label: 'Trespassing',
    blurb: 'You were not on the list. Security was very sure about that.',
    severity: 'minor',
    evidence: 0.8,
    sentence: [0, 1],
    fine: 2_000,
    headline: '{playerName} arrested for crashing a private party',
  },
  {
    id: 'tax-evasion',
    label: 'Tax evasion',
    blurb: 'The accountant you trusted did not trust the IRS.',
    severity: 'major',
    evidence: 0.5,
    sentence: [6, 16],
    fine: 150_000,
    headline: '{playerName} indicted for tax evasion',
  },
  {
    id: 'fraud',
    label: 'Fraud',
    blurb: 'The coin you promoted went to zero. The investors went to court.',
    severity: 'major',
    evidence: 0.45,
    sentence: [8, 18],
    fine: 250_000,
    headline: '{playerName} charged with fraud over a crypto coin they pushed to fans',
  },
  {
    id: 'parole-violation',
    label: 'Parole violation',
    blurb: 'One missed check-in. One wrong room. That is all it takes.',
    severity: 'minor',
    evidence: 0.9,
    sentence: [2, 6],
    fine: 0,
    headline: '{playerName} back in custody over a parole violation',
  },
  {
    id: 'inside-fight',
    label: 'Assault (inside)',
    blurb: 'A fight on the inside. The guards wrote it up.',
    severity: 'serious',
    evidence: 0.85,
    sentence: [2, 5],
    fine: 0,
    headline: '{playerName} gets more time after a fight behind bars',
  },
];

const BY_ID = new Map(CHARGES.map((c) => [c.id, c]));

export function getCharge(id: string): ChargeDef | undefined {
  return BY_ID.get(id);
}
