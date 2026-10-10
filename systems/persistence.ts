import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMusicStore } from '../store/musicStore';
import { useSocialStore } from '../store/socialStore';
import { useRelationshipStore } from '../store/relationshipStore';
import { useAudioStore } from '../store/audioStore';
import { useLabelStore } from '../store/labelStore';
import { useTourStore } from '../store/tourStore';
import { usePressStore } from '../store/pressStore';
import { useCareerStore } from '../store/careerStore';
import { useRivalryStore } from '../store/rivalryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useCultureStore } from '../store/cultureStore';
import { useProgressionStore } from '../store/progressionStore';
import { useLiveStore } from '../store/liveStore';
import { useStatusStore } from '../store/statusStore';
import { usePlanStore } from '../store/planStore';
import { useCommunityStore } from '../store/communityStore';
import { useWorldStore } from '../store/worldStore';
import { useActivityStore } from '../store/activityStore';
import { usePeopleStore } from '../store/peopleStore';
import { useNotificationStore } from '../store/notificationStore';
import { useDramaStore } from '../store/dramaStore';
import { useIdentityStore } from '../store/identityStore';
import { useCalendarStore } from '../store/calendarStore';
import { useLegalStore } from '../store/legalStore';
import { useMogulStore } from '../store/mogulStore';
import { useShowStore } from '../store/showStore';

/**
 * Every per-save store except the NPC world. Cheap enough to call after each
 * mid-week decision, so a relaunch resumes exactly where the player was.
 */
export function saveProgress(): void {
  usePlayerStore.getState().save();
  useGameStore.getState().saveGameState();
  useMusicStore.getState().save();
  useSocialStore.getState().save();
  useRelationshipStore.getState().save();
  useAudioStore.getState().save();
  useLabelStore.getState().save();
  useTourStore.getState().save();
  usePressStore.getState().save();
  useCareerStore.getState().save();
  useRivalryStore.getState().save();
  useSettingsStore.getState().save();
  useCultureStore.getState().save();
  useProgressionStore.getState().save();
  useLiveStore.getState().save();
  useStatusStore.getState().save();
  usePlanStore.getState().save();
  useCommunityStore.getState().save();
  useActivityStore.getState().save();
  usePeopleStore.getState().save();
  useNotificationStore.getState().save();
  useDramaStore.getState().save();
  useIdentityStore.getState().save();
  useCalendarStore.getState().save();
  useLegalStore.getState().save();
  useMogulStore.getState().save();
  useShowStore.getState().save();
  // Premium entitlements self-save on mutation (own table), like metaStore.
}

/**
 * Everything, including the NPC world (thousands of NPCs — only worth
 * writing when it actually moved: week transitions and first boot).
 */
export function saveAll(): void {
  saveProgress();
  useWorldStore.getState().saveWorld();
}
