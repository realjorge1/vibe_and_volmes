import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';
import {
  Unbounded_400Regular,
  Unbounded_500Medium,
  Unbounded_600SemiBold,
  Unbounded_700Bold,
  Unbounded_800ExtraBold,
  Unbounded_900Black,
} from '@expo-google-fonts/unbounded';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { GrandHotel_400Regular } from '@expo-google-fonts/grand-hotel';
import { getDb } from '../database/db';
import { HeadsUpBanner } from '../components/live/HeadsUpBanner';
import { ANIMATIONS_ENABLED, COLORS } from '../constants/theme';

void SplashScreen.preventAutoHideAsync();
// Reanimated warns in dev whenever reduced motion is forced; that's intended here.
if (!ANIMATIONS_ENABLED) LogBox.ignoreLogs(['Reduced motion setting is overwritten']);

const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.bg,
    card: COLORS.surfaceSolid,
    text: COLORS.text,
    border: COLORS.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_400Regular,
    Unbounded_500Medium,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    Unbounded_800ExtraBold,
    Unbounded_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    // VibeGram's script wordmark.
    GrandHotel_400Regular,
  });
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    // Open the DB once on boot so the schema is ready before any save.
    getDb();
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return (
    <>
      {/* Animations off: every Reanimated animation jumps to its end. Mounted
          first and before fonts load, so it is set before any screen animates. */}
      {ANIMATIONS_ENABLED ? null : <ReducedMotionConfig mode={ReduceMotion.Always} />}
      {ready ? (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <SafeAreaProvider>
            <ThemeProvider value={NAV_THEME}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: COLORS.bg },
                  animation: ANIMATIONS_ENABLED ? 'fade' : 'none',
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
                {/* A social app: transparent, so it can zoom out of its home-screen icon. */}
                <Stack.Screen
                  name="phone-app"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                    gestureEnabled: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen name="plan-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="store-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="community-modal" options={{ presentation: 'modal' }} />
                {/* Who you are, the music year, and the big nights. */}
                <Stack.Screen name="you-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="era-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="chart-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="year-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="legacy-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="lineup-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="awards-modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="show-modal" options={{ presentation: 'modal', gestureEnabled: false }} />
                <Stack.Screen name="escape-modal" options={{ presentation: 'modal', gestureEnabled: false }} />
                <Stack.Screen name="wrapped-modal" options={{ presentation: 'fullScreenModal' }} />
                {/* The end of a career: no swiping back into a life that is over. */}
                <Stack.Screen name="ending" options={{ gestureEnabled: false }} />
              </Stack>
              {/* Heads-up notifications sit above every screen, apps included. */}
              <HeadsUpBanner />
              <StatusBar style="light" />
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      ) : null}
    </>
  );
}
