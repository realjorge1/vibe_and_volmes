import type { CareerDossier } from '../../types/legacy';
import { buildDossier } from './chronicleEngine';
import type { EndingId } from '../../types/life';
import { getEnding } from '../../data/life/endings';
import { fillFinalLine } from '../life/endingEngine';
import { ageAtWeek } from '../life/age';
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
import { useActivityStore } from '../../store/activityStore';
import { usePeopleStore } from '../../store/peopleStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useDramaStore } from '../../store/dramaStore';
import { useIdentityStore } from '../../store/identityStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useLegalStore } from '../../store/legalStore';
import { useMogulStore } from '../../store/mogulStore';
import { useShowStore } from '../../store/showStore';
import { useRealPhotoStore } from '../../store/realPhotoStore';
import { clearSchedule } from '../notifications/schedule';
import { pastLifeFrom } from '../meta/legends';
import { clearShade } from '../notifications/deliver';

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
export function retireCareer(endingId: EndingId = 'retirement'): RetirementResult {
  const game = useGameStore.getState();
  const week = game.week;
  const dossier = buildDossier(week);
  const player = usePlayerStore.getState().player;
  const def = getEnding(endingId);
  const age = game.ending?.age ?? (player ? ageAtWeek(player.startAge, week) : 0);
  dossier.ending = {
    id: def.id,
    label: def.label,
    kind: def.kind,
    age,
    finalLine: fillFinalLine(def, dossier.artistName, age),
  };

  const minted = useMetaStore.getState().recordRetirement(dossier);
  // The artist lives on in the worlds of the lives after this one.
  const life = pastLifeFrom(dossier);
  if (life) useMetaStore.getState().addPastLife(life);

  // Wipe persisted per-save data (NOT meta_profile — see gameRepository).
  clearAllData();

  // Reset in-memory per-save stores so nothing leaks into the next career.
  usePlayerStore.getState().reset();
  useGameStore.getState().reset();
  useMusicStore.getState().reset();
  useSocialStore.getState().reset();
  // The old artist's posts are gone, so are the private copies of their real photos.
  useRealPhotoStore.getState().reset();
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
  useActivityStore.getState().reset();
  usePeopleStore.getState().reset();
  // The old career's phone goes quiet: nothing pending, nothing in the shade.
  useNotificationStore.getState().reset();
  useDramaStore.getState().reset();
  useIdentityStore.getState().reset();
  useCalendarStore.getState().reset();
  useLegalStore.getState().reset();
  useMogulStore.getState().reset();
  useShowStore.getState().reset();
  clearSchedule();
  clearShade();
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
