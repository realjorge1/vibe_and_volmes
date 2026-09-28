import { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocialStore } from '../store/socialStore';
import { usePlayerStore } from '../store/playerStore';
import { generateThread, type ReplySide } from '../systems/social/threadGenerator';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { platformOf } from '../data/social/platforms';
import { shortNumber } from '../utils/formatters';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const SIDE_COLOR: Record<ReplySide, string> = {
  stan: COLORS.primary,
  rival: COLORS.negative,
  neutral: COLORS.neutral,
  critic: COLORS.gold,
};

const SIDE_LABEL: Record<ReplySide, string> = {
  stan: 'STAN',
  rival: 'RIVAL FAN',
  neutral: 'BYSTANDER',
  critic: 'CRITIC',
};

export default function ThreadModal() {
  const router = useRouter();
  const post = useSocialStore((s) => s.focusedPost);
  const player = usePlayerStore((s) => s.player);

  const replies = useMemo(
    () => (post && player ? generateThread(post, player) : []),
    [post, player]
  );

  if (!post || !player) {
    return (
      <Screen>
        <Text variant="body" muted center style={styles.empty}>
          No thread selected.
        </Text>
        <Button label="Close" onPress={() => router.back()} />
      </Screen>
    );
  }

  const plat = platformOf(post.platform);
  const heated =
    post.sentiment === 'hostile' ||
    post.sentiment === 'shade' ||
    post.sentiment === 'hype' ||
    post.sentiment === 'meme';

  return (
    <Screen>
      <View style={styles.topRow}>
        <Text variant="heading">{plat.name} · Thread</Text>
        <Button label="Close" variant="outline" onPress={() => router.back()} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card accent={plat.color}>
          <Text variant="subheading">
            {post.account.username}
            {post.account.isVerified ? ' ✓' : ''}
          </Text>
          <Text variant="caption" muted>
            @{post.account.handle}
          </Text>
          <Text variant="body" style={styles.postBody}>
            {post.content}
          </Text>
          <Text variant="caption" muted>
            {plat.likeIcon} {shortNumber(post.likes)}   {plat.replyIcon}{' '}
            {shortNumber(post.replies)}
          </Text>
        </Card>

        {heated && (
          <Text variant="label" color={COLORS.negative} style={styles.warTag}>
            ⚔ STAN WAR IN THE REPLIES
          </Text>
        )}

        {replies.map((r) => (
          <View
            key={r.id}
            style={[styles.reply, { borderLeftColor: SIDE_COLOR[r.side] }]}
          >
            <View style={styles.replyHead}>
              <Text variant="caption" weight="semibold" numberOfLines={1} style={styles.flex}>
                {r.username}
                {r.verified ? ' ✓' : ''}{' '}
                <Text variant="caption" muted>
                  @{r.handle}
                </Text>
              </Text>
              <Text variant="label" color={SIDE_COLOR[r.side]}>
                {SIDE_LABEL[r.side]}
              </Text>
            </View>
            <Text variant="body" style={styles.replyBody}>
              {r.content}
            </Text>
            <Text variant="caption" muted>
              {plat.likeIcon} {shortNumber(r.likes)}
            </Text>
          </View>
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
  postBody: { marginVertical: SPACING.sm, lineHeight: 22 },
  warTag: { marginTop: SPACING.base, marginBottom: SPACING.sm },
  reply: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1 },
  replyBody: { marginVertical: SPACING.xs, lineHeight: 20 },
  empty: { paddingVertical: SPACING['2xl'] },
  pad: { height: SPACING['3xl'] },
});
