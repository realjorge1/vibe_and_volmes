import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { Platform } from '../types/social';
import { PLATFORMS } from '../data/social/platforms';
import { useSocialStore } from '../store/socialStore';
import { useNotificationStore } from '../store/notificationStore';
import { clearAppFromShade } from '../systems/notifications/deliver';
import type { AppProps } from '../components/phone/hooks';
import { ChirpApp } from '../components/phone/apps/chirp/ChirpApp';
import { VibeGramApp } from '../components/phone/apps/vibegram/VibeGramApp';
import { TokTalkApp } from '../components/phone/apps/toktalk/TokTalkApp';
import { VibeNewsApp } from '../components/phone/apps/vibenews/VibeNewsApp';

const APPS: Record<Platform, (props: AppProps) => React.ReactNode> = {
  chirper: ChirpApp,
  flashpic: VibeGramApp,
  tunetok: TokTalkApp,
  vibestream: VibeNewsApp,
};

/**
 * A social app, full screen. It zooms out of the icon that was tapped (or
 * opens straight onto a post when a notification was tapped). While it is
 * on screen it gets no notifications of its own, and opening it clears its
 * notifications from the device's shade, like a real app.
 */
export default function PhoneAppScreen() {
  const params = useLocalSearchParams<{ platform?: string; x?: string; y?: string; n?: string; tab?: string }>();
  const platform: Platform =
    params.platform && params.platform in PLATFORMS ? (params.platform as Platform) : 'chirper';
  const origin = params.x && params.y ? { x: Number(params.x), y: Number(params.y) } : null;

  useEffect(() => {
    const store = useNotificationStore.getState();
    const before = store.openApp;
    store.setOpenApp(platform);
    useSocialStore.getState().markSeen(platform);
    clearAppFromShade(platform);
    store.markAppRead(platform);
    store.save();
    return () => {
      const s = useNotificationStore.getState();
      if (s.openApp === platform) s.setOpenApp(before === platform ? null : before);
    };
  }, [platform]);

  const App = APPS[platform];
  return <App origin={origin} notifId={params.n} tab={params.tab} />;
}
