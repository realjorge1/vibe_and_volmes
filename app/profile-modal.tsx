import { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocialStore } from '../store/socialStore';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useMusicStore } from '../store/musicStore';
import { NPC_ACCOUNTS } from '../data/social/npcAccounts';
import { accountTimeline } from '../systems/social/feedStream';
import { platformOf } from '../data/social/platforms';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { PostCard } from '../components/social/PostCard';
import { shortNumber } from '../utils/formatters';
import { COLORS, SPACING } from '../constants/theme';

const TYPE_LABEL: Record<string, string> = {
  stan: 'Stan Account',
  fan: 'Fan',
  critic: 'Music Critic',
  gossip: 'Gossip Page',
  'rival-fan': 'Rival Fanbase',
  industry: 'Industry',
  public: 'Listener',
  news: 'Music News',
};

export default function ProfileModal() {
  const router = useRouter();
  const accountId = useSocialStore((s) => s.focusedAccountId);
  const player = usePlayerStore((s) => s.player);

  const account = useMemo(
    () => NPC_ACCOUNTS.find((a) => a.id === accountId) ?? null,
    [accountId]
  );

  const timeline = useMemo(
    () =>
      account && player
        ? accountTimeline(
            account,
            player,
            useGameStore.getState().week,
            useMusicStore.getState().getLatestTrack()
          )
        : [],
    [account, player]
  );

  if (!account || !player) {
    return (
      <Screen>
        <Text variant="body" muted center style={styles.empty}>
          No profile selected.
        </Text>
        <Button label="Close" onPress={() => router.back()} />
      </Screen>
    );
  }

  const plat = platformOf(account.preferredPlatforms[0]);

  return (
    <Screen>
      <View style={styles.topRow}>
        <Text variant="heading">Profile</Text>
        <Button label="Close" variant="outline" onPress={() => router.back()} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card accent={plat.color}>
          <Text variant="title">
            {account.username}
            {account.isVerified ? ' ✓' : ''}
          </Text>
          <Text variant="body" muted>
            @{account.handle}
          </Text>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text variant="subheading" color={COLORS.text}>
                {shortNumber(account.followers)}
              </Text>
              <Text variant="label" muted>
                FOLLOWERS
              </Text>
            </View>
            <View style={styles.metric}>
              <Text variant="subheading" color={plat.color}>
                {TYPE_LABEL[account.accountType] ?? account.accountType}
              </Text>
              <Text variant="label" muted>
                ACCOUNT TYPE
              </Text>
            </View>
          </View>
        </Card>

        <Text variant="label" muted style={styles.section}>
          RECENT POSTS
        </Text>
        {timeline.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onPress={(post) => {
              useSocialStore.getState().setFocusedPost(post);
              router.push('/thread-modal');
            }}
          />
        ))}
        <View style={styles.pad} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  metrics: { flexDirection: 'row', gap: SPACING.xl, marginTop: SPACING.base },
  metric: { gap: 2 },
  section: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  empty: { paddingVertical: SPACING['2xl'] },
  pad: { height: SPACING['3xl'] },
});
