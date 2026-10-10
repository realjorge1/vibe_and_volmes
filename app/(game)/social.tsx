import { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { Platform } from '../../types/social';
import type { PhoneNotification } from '../../types/notifications';
import { useSocialStore } from '../../store/socialStore';
import { usePlayerStore } from '../../store/playerStore';
import { useMusicStore } from '../../store/musicStore';
import { useNotificationStore } from '../../store/notificationStore';
import { PLATFORM_ORDER, platformOf } from '../../data/social/platforms';
import { playerAccount, playerHandle } from '../../systems/social/playerAccount';
import { openNotification } from '../../systems/notifications/open';
import { clearShade } from '../../systems/notifications/deliver';
import { NOTIFY_APPS } from '../../systems/notifications/compose';
import { photoByKey } from '../../systems/visuals/photoIndex';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Text } from '../../components/ui/Typography';
import { Card } from '../../components/ui/Card';
import { Grid } from '../../components/ui/Grid';
import { Orb3D } from '../../components/fx/Orb3D';
import { AppFace, AppIcon } from '../../components/phone/AppIcon';
import { Avatar } from '../../components/phone/Avatar';
import { T } from '../../components/phone/T';
import { Photo } from '../../components/visuals/Photo';
import { OwnCover } from '../../components/visuals/CoverPoster';
import type { IconOrigin } from '../../components/phone/PhoneApp';
import { COLORS, GRADIENTS, SPACING, ifAnimated } from '../../constants/theme';
import { shortNumber } from '../../utils/formatters';

/** The apps where the artist has an account (VibeNews is read-only). */
const SOCIAL_APPS: Platform[] = ['chirper', 'flashpic', 'tunetok'];

/** The screen's side padding, undone so the shade reaches both edges. */
const BLEED = SPACING.lg - 4;

/** "now", "4m", "2h", "3d": how a phone stamps a notification. */
function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}

/**
 * Social is the artist's phone: a couple of widgets, the apps, and the
 * notification shade underneath, everything the apps pinged about. Tapping a
 * notification opens that app on that post or story; tapping an app opens it
 * full screen, grown out of its icon.
 */
export default function Social() {
  const router = useRouter();
  const trending = useSocialStore((s) => s.trending);
  const aiEnhancing = useSocialStore((s) => s.aiEnhancing);
  const items = useNotificationStore((s) => s.items);
  const player = usePlayerStore((s) => s.player);
  const discography = useMusicStore((s) => s.discography);

  const reach = useMemo(
    () =>
      player
        ? SOCIAL_APPS.map((p) => ({ platform: p, followers: playerAccount(player, p, discography).account.followers }))
        : [],
    [player, discography]
  );
  const totalFollowers = reach.reduce((s, r) => s + r.followers, 0);

  const badges = useMemo(() => {
    const out = {} as Record<Platform, number>;
    for (const p of PLATFORM_ORDER) out[p] = 0;
    for (const n of items) if (!n.read && n.app !== 'game') out[n.app] += 1;
    return out;
  }, [items]);
  const unread = PLATFORM_ORDER.reduce((s, p) => s + badges[p], 0);

  const open = (platform: Platform, origin: IconOrigin | null, tab?: string) => {
    const params: Record<string, string> = { platform };
    if (origin) {
      params.x = String(Math.round(origin.x));
      params.y = String(Math.round(origin.y));
    }
    if (tab) params.tab = tab;
    router.push({ pathname: '/phone-app', params });
  };

  const shown = items.slice(0, 24);
  const now = Date.now();

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="SOCIAL"
        title={player ? `@${playerHandle(player)}` : 'Your phone'}
        subtitle={
          aiEnhancing
            ? '✦ the internet is reacting to you…'
            : unread > 0
              ? `${unread} new notification${unread === 1 ? '' : 's'}`
              : 'You’re all caught up.'
        }
        accent={COLORS.accent}
        right={<Orb3D size={48} color={COLORS.accent} icon="phone-portrait" />}
      />

      <Grid columns={2} gap={SPACING.sm + 2} style={styles.widgets}>
        <Card accent={COLORS.accent} style={styles.widget}>
          <Text variant="label" muted>
            FOLLOWERS
          </Text>
          <Text variant="metric" style={styles.widgetBig}>
            {shortNumber(totalFollowers)}
          </Text>
          <View style={styles.reach}>
            {reach.map((r) => (
              <View key={r.platform} style={styles.reachRow}>
                <AppFace platform={r.platform} size={16} />
                <Text variant="caption" muted numberOfLines={1} style={styles.flex}>
                  {platformOf(r.platform).name}
                </Text>
                <Text variant="caption" weight="bold">
                  {shortNumber(r.followers)}
                </Text>
              </View>
            ))}
          </View>
        </Card>
        <Card accent={COLORS.warning} style={styles.widget} onPress={() => open('chirper', null, 'explore')}>
          <View style={styles.widgetHead}>
            <Text variant="label" muted>
              TRENDING
            </Text>
            <Ionicons name="flame" size={13} color={COLORS.warning} />
          </View>
          {trending.length === 0 ? (
            <Text variant="caption" muted style={styles.widgetEmpty}>
              Nothing yet. Make some noise.
            </Text>
          ) : (
            <View style={styles.trends}>
              {trending.slice(0, 3).map((t, i) => (
                <View key={t.hashtag} style={styles.trendRow}>
                  <Text variant="caption" weight="bold" color={COLORS.warning} style={styles.rank}>
                    {i + 1}
                  </Text>
                  <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.flex}>
                    {t.hashtag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </Grid>

      <Animated.View entering={ifAnimated(FadeInDown.delay(80).duration(420).springify().damping(16))}>
        <Grid columns={4} gap={SPACING.sm} style={styles.apps}>
          {PLATFORM_ORDER.map((p) => (
            <AppIcon key={p} platform={p} size={62} badge={badges[p]} onOpen={(o) => open(p, o)} />
          ))}
        </Grid>
      </Animated.View>

      <View style={styles.shade}>
        <View style={styles.shadeHead}>
          <T size={20} weight="700">
            Notifications
          </T>
          {items.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => {
                useNotificationStore.getState().clearAll();
                useNotificationStore.getState().save();
                clearShade();
              }}
              style={styles.clear}
            >
              <T size={13} weight="600" color="#C4C7C5">
                Clear all
              </T>
            </Pressable>
          ) : null}
        </View>

        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={30} color="#8E918F" />
            <T size={15} weight="600" color="#C4C7C5">
              No notifications
            </T>
            <T size={13} color="#8E918F" center>
              Likes, comments, follows and news about you land here and on your phone.
            </T>
          </View>
        ) : (
          shown.map((n) => <ShadeRow key={n.id} n={n} now={now} />)
        )}
      </View>

      <View style={styles.tabPad} />
    </Screen>
  );
}

/** One notification, expanded the way Android shows it in the shade. */
function ShadeRow({ n, now }: { n: PhoneNotification; now: number }) {
  const app = NOTIFY_APPS[n.app];
  const photo = photoByKey(n.image?.photoKey);
  const wide = !!photo && (n.app === 'flashpic' || n.app === 'tunetok' || n.app === 'vibestream');
  return (
    <Pressable onPress={() => openNotification(n)} style={({ pressed }) => [styles.row, !n.read && styles.rowUnread, pressed && styles.rowPressed]}>
      <View style={styles.rowHead}>
        {n.app === 'game' ? (
          <LinearGradient colors={GRADIENTS.brand} style={styles.gameFace}>
            <Ionicons name="sparkles" size={11} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <AppFace platform={n.app} size={18} />
        )}
        <T size={12} weight="500" color="#C4C7C5">
          {app.name}
        </T>
        <T size={12} color="#8E918F">
          · {ago(n.at, now)}
        </T>
        <View style={styles.flex} />
        {!n.read ? <View style={[styles.dot, { backgroundColor: app.color }]} /> : null}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.flex}>
          {n.title ? (
            <T size={15} weight="600" color="#E9E9EA" numberOfLines={2}>
              {n.title}
            </T>
          ) : null}
          <T size={14} color="#C4C7C5" lh={19} numberOfLines={4} style={styles.bodyText}>
            {n.body}
          </T>
        </View>
        {n.actor ? <Avatar id={n.actor.id} name={n.actor.name} size={42} /> : null}
      </View>
      {wide && photo ? (
        <Photo photo={photo} style={styles.picture} />
      ) : n.image?.trackId && n.post ? (
        <OwnCover trackId={n.image.trackId} title={n.post.media?.description.match(/"([^"]+)"/)?.[1] ?? ''} style={styles.cover} compact />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  widgets: { marginBottom: SPACING.xl },
  widget: { minHeight: 132 },
  widgetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  widgetBig: { marginTop: 2 },
  widgetEmpty: { marginTop: SPACING.sm },
  reach: { marginTop: SPACING.sm, gap: 5 },
  reachRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trends: { marginTop: SPACING.sm, gap: 7 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rank: { width: 12, textAlign: 'center' },
  apps: { marginBottom: SPACING.xl },

  shade: {
    marginHorizontal: -BLEED,
    backgroundColor: 'rgba(16,15,22,0.92)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  shadeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  clear: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  rowUnread: { backgroundColor: 'rgba(255,255,255,0.035)' },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.07)' },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowBody: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  bodyText: { marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  picture: { marginTop: 12, width: '100%', aspectRatio: 2, borderRadius: 14 },
  cover: { marginTop: 12, width: 96, height: 96, borderRadius: 10 },
  gameFace: { width: 18, height: 18, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 40, paddingVertical: 36 },
  tabPad: { height: SPACING['3xl'] * 1.5 },
});
