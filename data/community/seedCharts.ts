import type { GlobalChartEntry } from '../../types/sync';

/**
 * Bundled anonymous global chart. Ships with the game so the Community screen
 * works with zero network — the local sync adapter serves these rows and
 * splices in the player's OWN anonymized standing at the right rank. Pure,
 * faceless content (stage names only, no PII, no multiplayer).
 */
export const SEED_GLOBAL_CHART: Omit<GlobalChartEntry, 'rank'>[] = [
  { artistName: 'NOVA REIGN', trackTitle: 'Afterglow', streamsLabel: '48.2M', seeded: true },
  { artistName: 'KAII', trackTitle: 'Gold Teeth', streamsLabel: '41.7M', seeded: true },
  { artistName: 'Saint Lyric', trackTitle: 'No Comment', streamsLabel: '37.9M', seeded: true },
  { artistName: 'mara blue', trackTitle: 'Sideways', streamsLabel: '33.1M', seeded: true },
  { artistName: 'THE LOUD', trackTitle: 'Pressure Cooker', streamsLabel: '29.6M', seeded: true },
  { artistName: 'Zephyr', trackTitle: 'Glass City', streamsLabel: '25.4M', seeded: true },
  { artistName: '8th Wonder', trackTitle: 'Run It Back', streamsLabel: '22.0M', seeded: true },
  { artistName: 'lowtide', trackTitle: 'Undertow', streamsLabel: '18.8M', seeded: true },
  { artistName: 'VICE GRIP', trackTitle: 'Headlock', streamsLabel: '15.2M', seeded: true },
  { artistName: 'Paper Saints', trackTitle: 'Origami', streamsLabel: '12.6M', seeded: true },
  { artistName: 'Cherry Void', trackTitle: 'Sugar Static', streamsLabel: '9.9M', seeded: true },
  { artistName: 'Demi Fortune', trackTitle: 'Lucky Number', streamsLabel: '7.3M', seeded: true },
  { artistName: 'Outer Borough', trackTitle: 'Crosstown', streamsLabel: '5.1M', seeded: true },
  { artistName: 'kid eclipse', trackTitle: 'Total Blackout', streamsLabel: '3.4M', seeded: true },
  { artistName: 'Nightschool', trackTitle: 'Detention', streamsLabel: '1.8M', seeded: true },
];
