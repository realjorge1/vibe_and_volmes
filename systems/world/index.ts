/**
 * Living World / NPC Life Engine — public surface.
 *
 * A deterministic, pure simulation of a music-industry world full of
 * celebrities, labels, journalists, influencers, producers and fan
 * communities that live their lives independently of the player.
 *
 * See ./README.md for the full simulation-loop documentation.
 */

export * from '../../types/world';
export { Rng, hash32, hashString, clamp } from './rng';
export {
  generateNpc,
  generateWorld,
  DEFAULT_WORLD_CONFIG,
} from './generateNpc';
export {
  simulateWeek,
  simulateWeeks,
  cloneWorld,
  cloneNpc,
  summarizeWorld,
  type WeekResult,
  type WorldSummary,
} from './worldEngine';
export {
  careerStageFor,
  fameLevel,
  reach,
  opportunityScore,
  reputationAverage,
  type OpportunityKind,
} from './reputation';
export {
  overallSentiment,
  deriveStatus,
  adjustRelationship,
} from './relationships';
export { NPC_EVENTS, EVENTS_BY_ROLE } from '../../data/world/npcEvents';
