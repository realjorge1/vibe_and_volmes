import type { CareerDossier } from '../../types/legacy';
import { buildDossier } from './chronicleEngine';
import { useMetaStore } from '../../store/metaStore';
import { clearAllData } from '../../database/gameRepository';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useSocialStore } from '../../store/socialStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { useAudioStore } from '../../store/audioStore';
import { useLabelStore } from '../../store/labelStore';
import { useTourStore } from '../../store/tourStore';
import { usePressStore } from '../../store/pressStore';
import { useCareerStore } from '../../store/careerStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useCultureStore } from '../../store/cultureStore';
import { useProgressionStore } from '../../store/progressionStore';
import { useLiveStore } from '../../store/liveStore';
import { useStatusStore } from '../../store/statusStore';
import { usePlanStore } from '../../store/planStore';
import { useCommunityStore } from '../../store/communityStore';
import { useWorldStore } from '../../store/worldStore';
import { useLifeSimStore } from '../../store/lifeSimStore';

export interface RetirementResult {
  dossier: CareerDossier;
  unlockedPerkIds: string[];
  unlockedBloodlineIds: string[];
  legacyGained: number;
  lifetimeLegacy: number;
}

/**
 * End the current career. Finalizes the dossier, mints cross-save legacy +
 * unlocks into the meta-profile (which lives in its own table and SURVIVES
 * this), then wipes the per-save world so the next run starts clean. The
 * meta-profile is deliberately untouched — that is the whole point of the
 * cross-save boundary.
 *
 * UI should show the returned dossier, then route the player to onboarding.
 */
export function retireCareer(): RetirementResult {
  const week = useGameStore.getState().week;
  const dossier = buildDossier(week);

  const minted = useMetaStore.getState().recordRetirement(dossier);

  // Stop the Crib's minute driver BEFORE the wipe so no tick re-saves it.
  useLifeSimStore.getState().reset();

  // Wipe persisted per-save data (NOT meta_profile — see gameRepository).
  clearAllData();

  // Reset in-memory per-save stores so nothing leaks into the next career.
  usePlayerStore.getState().reset();
  useGameStore.getState().reset();
  useMusicStore.getState().reset();
  useSocialStore.getState().reset();
  useRelationshipStore.getState().reset();
  useAudioStore.getState().reset();
  useLabelStore.getState().reset();
  useTourStore.getState().reset();
  usePressStore.getState().reset();
  useCareerStore.getState().reset();
  useRivalryStore.getState().reset();
  useCultureStore.getState().reset();
  useProgressionStore.getState().reset();
  useLiveStore.getState().reset();
  useStatusStore.getState().reset();
  usePlanStore.getState().reset();
  useCommunityStore.getState().reset();
  // The NPC world must be null here, or initializeFirstWeek() skips
  // bootstrapWorld() and the next career inherits this one's cast.
  useWorldStore.getState().reset();
  // useMetaStore and usePremiumStore intentionally have no reset — cross-save
  // legacy AND purchased premium cosmetics carry forward to the next career.

  return {
    dossier,
    unlockedPerkIds: minted.perkIds,
    unlockedBloodlineIds: minted.bloodlineIds,
    legacyGained: minted.legacyGained,
    lifetimeLegacy: useMetaStore.getState().lifetimeLegacy,
  };
}
