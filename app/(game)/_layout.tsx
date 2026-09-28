import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useLiveResume } from '../../hooks/useLiveResume';
import { NotificationStack } from '../../components/live/NotificationStack';
import { AwayReportModal } from '../../components/live/AwayReportModal';

export default function GameLayout() {
  // Living-world heartbeat: energy regen + "while you were away" on focus.
  useLiveResume();

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Deck',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="studio"
          options={{
            title: 'Studio',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="mic-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            title: 'Social',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="ellipsis-horizontal-circle-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="empire"
          options={{
            title: 'Empire',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" color={color} size={size} />
            ),
          }}
        />
        {/* The Crib (lifesim/) is shelved: the game is moving to a BitLife-style
            flow, and the real-time home sim ran its own clock and shared the
            career wallet. Hidden, not deleted — restore by removing `href: null`.
            While hidden the screen never mounts, so its sim driver never runs. */}
        <Tabs.Screen
          name="crib"
          options={{
            href: null,
            title: 'Crib',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      <NotificationStack />
      <AwayReportModal />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  // Flat, edge-to-edge bar separated from content by a single hairline.
  tabBar: {
    height: 64,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    elevation: 0,
  },
  tabItem: { paddingTop: 2 },
  tabLabel: {
    fontSize: 10,
    fontWeight: FONTS.weights.medium,
    letterSpacing: FONTS.tracking.wide,
    marginTop: 2,
  },
});
