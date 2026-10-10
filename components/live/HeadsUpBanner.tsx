import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import type { PhoneNotification } from '../../types/notifications';
import { useNotificationStore } from '../../store/notificationStore';
import { NOTIFY_APPS } from '../../systems/notifications/compose';
import { openNotification } from '../../systems/notifications/open';
import { photoByKey } from '../../systems/visuals/photoIndex';
import { GRADIENTS } from '../../constants/theme';
import { AppFace } from '../phone/AppIcon';
import { Avatar } from '../phone/Avatar';
import { T } from '../phone/T';
import { Photo } from '../visuals/Photo';

const SHOW_MS = 5200;

/**
 * The heads-up notification, drawn the way Android draws it, for when the
 * device's own can't be used (permission off, or a build without the native
 * module). It drops from the top edge across the full width, can be swiped
 * away, and a tap opens exactly what it is about.
 */
export function HeadsUpBanner() {
  const banner = useNotificationStore((s) => s.banner);
  if (!banner) return null;
  return <Banner key={banner.id} n={banner} />;
}

function Banner({ n }: { n: PhoneNotification }) {
  const insets = useSafeAreaInsets();
  const y = useSharedValue(-260);
  const drag = useSharedValue(0);
  const gone = useRef(false);
  const dismiss = useNotificationStore((s) => s.dismissBanner);

  const leave = () => {
    if (gone.current) return;
    gone.current = true;
    y.value = withTiming(-260, { duration: 200 }, (done) => {
      if (done) runOnJS(dismiss)();
    });
  };

  useEffect(() => {
    y.value = withSpring(0, { damping: 20, stiffness: 210, mass: 0.9 });
    const t = setTimeout(leave, SHOW_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = () => {
    leave();
    openNotification(n);
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((e) => {
      drag.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < -40 || e.velocityY < -600) runOnJS(leave)();
      else drag.value = withSpring(0);
    });
  const tap = Gesture.Tap().onEnd((_e, ok) => {
    if (ok) runOnJS(open)();
  });

  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value + drag.value }] }));
  const app = NOTIFY_APPS[n.app];
  const photo = photoByKey(n.image?.photoKey);

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <Animated.View style={[styles.card, { paddingTop: insets.top + 10 }, st]} accessibilityRole="button" accessibilityLabel={`${app.name}: ${n.title}. ${n.body}`}>
        <View style={styles.head}>
          {n.app === 'game' ? <GameFace /> : <AppFace platform={n.app} size={18} />}
          <T size={12} weight="500" color="#C4C7C5">
            {app.name}
          </T>
          <T size={12} color="#8E918F">
            · now
          </T>
          <View style={styles.flex} />
          <Ionicons name="chevron-down" size={16} color="#8E918F" />
        </View>
        <View style={styles.row}>
          <View style={styles.flex}>
            {n.title ? (
              <T size={15} weight="600" color="#E3E3E3" numberOfLines={1}>
                {n.title}
              </T>
            ) : null}
            <T size={14} color="#C4C7C5" lh={19} numberOfLines={3} style={styles.body}>
              {n.body}
            </T>
          </View>
          {n.actor ? (
            <Avatar id={n.actor.id} name={n.actor.name} size={44} />
          ) : photo ? (
            <Photo photo={photo} style={styles.thumb} />
          ) : null}
        </View>
        <View style={styles.handle} />
      </Animated.View>
    </GestureDetector>
  );
}

/** Vibe & Volumes' own icon for career notifications. */
function GameFace() {
  return (
    <LinearGradient colors={GRADIENTS.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.game}>
      <Ionicons name="sparkles" size={11} color="#FFFFFF" />
    </LinearGradient>
  );
}

/** Opens a notification row anywhere else (the Social tab's shade). */
export function NotificationPress({ n, children, style }: { n: PhoneNotification; children: React.ReactNode; style?: object }) {
  return (
    <Pressable onPress={() => openNotification(n)} style={({ pressed }) => [style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
    backgroundColor: '#1F2023',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    paddingHorizontal: 18,
    paddingBottom: 10,
    boxShadow: '0px 10px 28px rgba(0,0,0,0.55)',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  flex: { flex: 1 },
  body: { marginTop: 2 },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', marginTop: 12 },
  game: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
});
