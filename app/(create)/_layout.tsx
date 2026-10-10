import { Stack } from 'expo-router';
import { ANIMATIONS_ENABLED, COLORS } from '../../constants/theme';

/**
 * The song creation pipeline as its own stack, pushed over the tabs:
 *   beat → lyrics → record → mix → finalize
 * Each screen reads/writes the single in-progress draft in audioStore.
 */
export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: ANIMATIONS_ENABLED ? 'slide_from_right' : 'none',
        gestureEnabled: false,
      }}
    />
  );
}
