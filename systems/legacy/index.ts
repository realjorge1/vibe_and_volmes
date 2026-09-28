/**
 * Phase 5 Chronicle / Legacy layer — public surface.
 *
 * Design contract (do not bypass):
 *  - This layer is a PURE PROJECTOR over data the deterministic sim already
 *    recorded. It never mutates a per-save store and never influences a
 *    mechanical outcome — same decorator rule as the Phase 4 AI layer.
 *  - The ONLY writes it performs are: (a) minting cross-save legacy into the
 *    meta-profile on retirement, and (b) the deliberate per-save wipe that
 *    retirement IS. Both go through retireCareer().
 *  - Documentary text is deterministic + offline by default; AI is optional
 *    cosmetic enhancement through the existing gateway, never required.
 */

export {
  buildDossier,
  computeLegacy,
  deriveIdentity,
  legendaryMoments,
} from './chronicleEngine';
export { buildDocumentary, buildBiography, buildTopMoments } from './documentaryEngine';
export { toStoryCard, shareStoryCard } from './storyCard';
export { retireCareer } from './retirement';
export type { RetirementResult } from './retirement';
