import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getDb } from '../database/db';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  useEffect(() => {
    // Open the DB once on boot so the schema is ready before any save.
    getDb();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="stats-modal" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="interview-modal"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="chronicle-modal"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="thread-modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile-modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="plan-modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="store-modal" options={{ presentation: 'modal' }} />
          <Stack.Screen name="community-modal" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
