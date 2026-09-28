import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
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
import { useMetaStore } from '../store/metaStore';
import { useProgressionStore } from '../store/progressionStore';
import { useLiveStore } from '../store/liveStore';
import { useStatusStore } from '../store/statusStore';
import { usePlanStore } from '../store/planStore';
import { usePremiumStore } from '../store/premiumStore';
import { useCommunityStore } from '../store/communityStore';
import { useWorldStore } from '../store/worldStore';
import { useActivityStore } from '../store/activityStore';
import { usePeopleStore } from '../store/peopleStore';
import { ensureFamily } from '../systems/life/peopleTick';
import { refreshCommunity } from '../systems/community';
import { bootstrapWorld } from '../systems/weekEngine';
import { loadBudget } from '../ai/budget/ledger';
import { COLORS } from '../constants/theme';

export default function Index() {
  const [ready, setReady] = useState(false);
  const player = usePlayerStore((s) => s.player);

  useEffect(() => {
    usePlayerStore.getState().loadPlayer();
    useGameStore.getState().loadGameState();
    useMusicStore.getState().load();
    useSocialStore.getState().load();
    useRelationshipStore.getState().load();
    useAudioStore.getState().load();
    useLabelStore.getState().load();
    useTourStore.getState().load();
    usePressStore.getState().load();
    useCareerStore.getState().load();
    useRivalryStore.getState().load();
    useSettingsStore.getState().load();
    useCultureStore.getState().load();
    useMetaStore.getState().load();
    useProgressionStore.getState().load();
    useLiveStore.getState().load();
    useStatusStore.getState().load();
    usePlanStore.getState().load();
    useCommunityStore.getState().load();
    useActivityStore.getState().load();
    usePeopleStore.getState().load();
    // Account-level premium entitlements (own table; survive retirement).
    usePremiumStore.getState().load();
    usePremiumStore.getState().ensureStarter();
    loadBudget();

    // Living world (NPC life engine). Load the saved world; if a career exists
    // but predates this system, bootstrap one now so it starts remembering.
    useWorldStore.getState().loadWorld();
    const existing = usePlayerStore.getState().player;
    if (existing && !useWorldStore.getState().world) {
      bootstrapWorld(existing.createdAt);
    }
    // Careers from before People get their family now.
    if (existing) ensureFamily();

    setReady(true);
    // Fire-and-forget: refresh the anonymous community snapshot (offline-safe).
    void refreshCommunity();
  }, []);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={player ? '/(game)' : '/onboarding'} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
