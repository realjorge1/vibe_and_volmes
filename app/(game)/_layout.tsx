import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Redirect, Tabs, useSegments } from 'expo-router';
import { useGameStore } from '../../store/gameStore';
import { COLORS } from '../../constants/theme';
import { useLiveResume } from '../../hooks/useLiveResume';
import { AwayReportModal } from '../../components/live/AwayReportModal';
import { askNotificationPermissionOnce, consumePendingOpen } from '../../systems/notifications/open';
import { AmbientBackground } from '../../components/fx/AmbientBackground';
import { BackdropProvided } from '../../components/fx/Backdrop';
import { GlassTabBar, TAB_META } from '../../components/nav/GlassTabBar';

export default function GameLayout() {
  // Living-world heartbeat: energy regen + "while you were away" on focus.
  useLiveResume();
  const segments = useSegments();
  useEffect(() => {
    // A notification tapped while the game was closed lands now.
    consumePendingOpen();
    // The first time in, ask Android for permission to post notifications.
    const t = setTimeout(() => void askNotificationPermissionOnce(), 1500);
    return () => clearTimeout(t);
  }, []);
  // A career that has ended belongs to the end screen, not the tabs.
  const ended = useGameStore((s) => s.ending !== null);
  if (ended) return <Redirect href="/ending" />;

  // One stage behind every tab; its light takes on the focused tab's color.
  const tab = segments[1] ?? 'index';
  const tint = TAB_META[tab]?.color ?? COLORS.primary;

  return (
    <View style={styles.root}>
      <AmbientBackground tint={tint} />
      <BackdropProvided>
        <Tabs
          tabBar={(props) => <GlassTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: styles.scene,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Deck' }} />
          <Tabs.Screen name="studio" options={{ title: 'Studio' }} />
          <Tabs.Screen name="social" options={{ title: 'Social' }} />
          <Tabs.Screen name="life" options={{ title: 'Life' }} />
          <Tabs.Screen name="empire" options={{ title: 'Empire' }} />
        </Tabs>
      </BackdropProvided>

      <AwayReportModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scene: { backgroundColor: 'transparent' },
});
