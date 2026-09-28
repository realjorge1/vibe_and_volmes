import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import type { SocialPost, Platform } from '../../types/social';
import { useSocialStore } from '../../store/socialStore';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { streamMorePosts } from '../../systems/social/feedStream';
import { PLATFORM_ORDER, platformOf } from '../../data/social/platforms';
import { Screen } from '../../components/ui/Screen';
import { Text } from '../../components/ui/Typography';
import {
  SegmentedControl,
  type Segment,
} from '../../components/ui/SegmentedControl';
import { PostCard } from '../../components/social/PostCard';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { shortNumber } from '../../utils/formatters';

const FEED_SEGMENTS: readonly Segment<Tab>[] = [
  { key: 'feed', label: 'For You' },
  { key: 'trending', label: 'Trending' },
];

type Tab = 'feed' | 'trending';

export default function Social() {
  const router = useRouter();
  const feed = useSocialStore((s) => s.feed);
  const trending = useSocialStore((s) => s.trending);
  const activePlatform = useSocialStore((s) => s.activePlatform);
  const setActivePlatform = useSocialStore((s) => s.setActivePlatform);
  const aiEnhancing = useSocialStore((s) => s.aiEnhancing);

  const [tab, setTab] = useState<Tab>('feed');
  const [extra, setExtra] = useState<SocialPost[]>([]);
  const [page, setPage] = useState(1);

  // Reset the lazy tail whenever the platform changes.
  useEffect(() => {
    setExtra([]);
    setPage(1);
  }, [activePlatform]);

  const seed = useMemo(
    () => feed.filter((p) => p.platform === activePlatform),
    [feed, activePlatform]
  );

  const data = useMemo(() => [...seed, ...extra], [seed, extra]);

  const loadMore = useCallback(() => {
    const player = usePlayerStore.getState().player;
    if (!player) return;
    const more = streamMorePosts({
      player,
      week: useGameStore.getState().week,
      platform: activePlatform,
      track: useMusicStore.getState().getLatestTrack(),
      count: 12,
      page,
    });
    setExtra((prev) => [...prev, ...more]);
    setPage((p) => p + 1);
  }, [activePlatform, page]);

  const openThread = useCallback(
    (post: SocialPost) => {
      useSocialStore.getState().setFocusedPost(post);
      router.push('/thread-modal');
    },
    [router]
  );

  const openProfile = useCallback(
    (post: SocialPost) => {
      useSocialStore.getState().setFocusedAccountId(post.account.id);
      router.push('/profile-modal');
    },
    [router]
  );

  const plat = platformOf(activePlatform);

  return (
    <Screen>
      <Text variant="title" style={styles.title}>
        {plat.name}
      </Text>
      <Text variant="caption" muted style={styles.tagline}>
        {aiEnhancing ? '✦ the internet is reacting to you…' : plat.tagline}
      </Text>

      <View style={styles.platforms}>
        {PLATFORM_ORDER.map((id: Platform) => {
          const p = platformOf(id);
          const active = activePlatform === id;
          return (
            <Pressable
              key={id}
              onPress={() => setActivePlatform(id)}
              style={[styles.pTab, active && { backgroundColor: p.color }]}
            >
              <Text
                variant="caption"
                weight="semibold"
                color={active ? COLORS.bg : COLORS.textSecondary}
              >
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SegmentedControl
        segments={FEED_SEGMENTS}
        value={tab}
        onChange={setTab}
        style={styles.segment}
      />

      {tab === 'trending' ? (
        <FlatList
          data={trending}
          keyExtractor={(t) => t.hashtag}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text variant="body" muted center style={styles.empty}>
              Nothing trending yet. Make some noise.
            </Text>
          }
          renderItem={({ item, index }) => (
            <Pressable
              style={styles.trendRow}
              onPress={() => setTab('feed')}
            >
              <Text variant="label" muted>
                {index + 1} · {(item.kind ?? 'trending').toString().toUpperCase()}
                {item.momentum === 'rising' ? ' · 🔥 RISING' : ''}
              </Text>
              <Text variant="subheading" color={COLORS.secondary}>
                {item.hashtag}
              </Text>
              <Text variant="caption" muted>
                {shortNumber(item.volume)} posts
              </Text>
            </Pressable>
          )}
          contentContainerStyle={styles.listPad}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          initialNumToRender={8}
          windowSize={11}
          removeClippedSubviews
          ListEmptyComponent={
            <Text variant="body" muted center style={styles.empty}>
              No chatter on {plat.name} yet. Make some noise.
            </Text>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={openThread}
              onPressAccount={openProfile}
            />
          )}
          ListFooterComponent={
            data.length > 0 ? (
              <Text variant="caption" muted center style={styles.footer}>
                the feed never sleeps…
              </Text>
            ) : null
          }
          contentContainerStyle={styles.listPad}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: SPACING.base },
  tagline: { marginBottom: SPACING.base },
  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  pTab: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segment: { marginBottom: SPACING.base },
  trendRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
    gap: 2,
  },
  empty: { paddingVertical: SPACING['3xl'] },
  footer: { paddingVertical: SPACING.xl },
  listPad: { paddingBottom: SPACING['3xl'] * 2.4 },
});
