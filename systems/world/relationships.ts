import type {
  Npc,
  NpcRelationship,
  RelationshipDimensions,
  RelationshipStatus,
} from '../../types/world';
import { clamp } from './rng';

/**
 * Relationship subsystem. Friendship, trust, respect, attraction, resentment
 * and rivalry are tracked independently so feelings can be contradictory
 * (you can respect a rival you resent). Status is *derived* from the numbers
 * after every change, except a few "sticky" statuses that life events set
 * explicitly (dating, exes, mentorships, collaborations) and which the
 * derivation preserves unless open hostility overrides them.
 */

const HISTORY_CAP = 8;

const STICKY: RelationshipStatus[] = [
  'dating',
  'ex',
  'mentor',
  'protege',
  'collaborator',
];

const ZERO_DIMS: RelationshipDimensions = {
  friendship: 0,
  trust: 0,
  respect: 0,
  attraction: 0,
  resentment: 0,
  rivalry: 0,
};

export function emptyRelationship(targetId: string, week: number): NpcRelationship {
  return {
    targetId,
    status: 'stranger',
    dims: { ...ZERO_DIMS },
    sinceWeek: week,
    lastInteractionWeek: week,
    history: [],
  };
}

export function getOrCreateRelationship(
  npc: Npc,
  targetId: string,
  week: number,
): NpcRelationship {
  let rel = npc.relationships[targetId];
  if (!rel) {
    rel = emptyRelationship(targetId, week);
    npc.relationships[targetId] = rel;
  }
  return rel;
}

/** Single -100..100 summary of how `rel` feels about the target. */
export function overallSentiment(dims: RelationshipDimensions): number {
  const positive =
    dims.friendship * 0.35 +
    dims.trust * 0.25 +
    dims.respect * 0.2 +
    dims.attraction * 0.1;
  const negative = dims.resentment * 0.45 + dims.rivalry * 0.3;
  return clamp(positive - negative, -100, 100);
}

/** Derive the relationship label from its numbers + the current sticky state. */
export function deriveStatus(
  dims: RelationshipDimensions,
  current: RelationshipStatus,
): RelationshipStatus {
  // Open hostility overrides everything, even a romance gone toxic.
  if (dims.rivalry >= 60 && dims.resentment >= 55) return 'enemy';
  if (dims.rivalry >= 40 && current !== 'dating') return 'rival';

  // Preserve life-event statuses that numbers alone shouldn't undo.
  if (STICKY.includes(current)) return current;

  if (dims.friendship >= 65 && dims.trust >= 40) return 'close-friend';
  if (dims.friendship >= 30) return 'friend';
  if (dims.friendship >= 5 || dims.respect >= 25) return 'acquaintance';
  return 'stranger';
}

function clampDim(key: keyof RelationshipDimensions, value: number): number {
  // resentment & rivalry are one-sided 0..100; the rest are -100..100.
  return key === 'resentment' || key === 'rivalry'
    ? clamp(value, 0, 100)
    : clamp(value, -100, 100);
}

/**
 * Apply deltas to a relationship's dimensions, clamp, refresh status and
 * record a short beat. Mutates and returns the relationship.
 */
export function adjustRelationship(
  rel: NpcRelationship,
  delta: Partial<RelationshipDimensions>,
  week: number,
  beat?: string,
): NpcRelationship {
  for (const key of Object.keys(delta) as (keyof RelationshipDimensions)[]) {
    const d = delta[key];
    if (d === undefined) continue;
    rel.dims[key] = clampDim(key, rel.dims[key] + d);
  }
  rel.status = deriveStatus(rel.dims, rel.status);
  rel.lastInteractionWeek = week;
  if (beat) {
    rel.history.push(beat);
    if (rel.history.length > HISTORY_CAP) rel.history.shift();
  }
  return rel;
}

/** Force a sticky status (romance, mentorship, collaboration, …). */
export function setStatus(
  rel: NpcRelationship,
  status: RelationshipStatus,
  week: number,
  beat?: string,
): void {
  rel.status = status;
  rel.lastInteractionWeek = week;
  if (beat) {
    rel.history.push(beat);
    if (rel.history.length > HISTORY_CAP) rel.history.shift();
  }
}

/**
 * Relationships fade toward neutral when neglected. Applied weekly only to
 * edges that weren't touched this week, so active relationships stay vivid
 * while forgotten ones quietly cool off.
 */
export function decayRelationship(rel: NpcRelationship, week: number): void {
  const idle = week - rel.lastInteractionWeek;
  if (idle < 4) return; // grace period — recent ties don't decay
  const pull = 0.5; // points pulled toward zero per eligible week
  for (const key of Object.keys(rel.dims) as (keyof RelationshipDimensions)[]) {
    const v = rel.dims[key];
    if (v > 0) rel.dims[key] = Math.max(0, v - pull);
    else if (v < 0) rel.dims[key] = Math.min(0, v + pull);
  }
  rel.status = deriveStatus(rel.dims, rel.status);
}
