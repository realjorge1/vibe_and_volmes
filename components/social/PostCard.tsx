import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import type { SocialPost, PostSentiment } from '../../types/social';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';
import { shortNumber } from '../../utils/formatters';
import { platformOf } from '../../data/social/platforms';
import { SEGMENT_LABEL, SEGMENT_EMOJI } from '../../systems/social/fanbase';
import { Card } from '../ui/Card';
import { Text } from '../ui/Typography';

const SENTIMENT_COLOR: Record<PostSentiment, string> = {
  hype: COLORS.primary,
  positive: COLORS.positive,
  neutral: COLORS.neutral,
  critical: COLORS.warning,
  hostile: COLORS.negative,
  meme: COLORS.secondary,
  news: COLORS.chirper,
  shade: COLORS.gold,
};

interface Props {
  post: SocialPost;
  onPress?: (post: SocialPost) => void;
  onPressAccount?: (post: SocialPost) => void;
}

export function PostCard({ post, onPress, onPressAccount }: Props) {
  const plat = platformOf(post.platform);
  const tint = SENTIMENT_COLOR[post.sentiment];
  const initial = (post.account.username.trim()[0] ?? '?').toUpperCase();

  return (
    <Pressable onPress={() => onPress?.(post)}>
      <Card accent={tint}>
        <View style={styles.header}>
          <Pressable
            style={styles.identity}
            onPress={() => onPressAccount?.(post)}
            hitSlop={6}
          >
            <View style={[styles.avatar, { backgroundColor: plat.color }]}>
              <Text variant="subheading" weight="black" color={COLORS.bg}>
                {initial}
              </Text>
            </View>
            <View style={styles.nameWrap}>
              <View style={styles.nameRow}>
                <Text
                  variant="subheading"
                  weight="bold"
                  numberOfLines={1}
                  style={styles.name}
                >
                  {post.account.username}
                </Text>
                {post.account.isVerified ? (
                  <Text variant="caption" color={COLORS.chirper}>
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" muted numberOfLines={1}>
                @{post.account.handle}
              </Text>
            </View>
          </Pressable>
          <View style={[styles.platTag, { borderColor: plat.color }]}>
            <Text variant="label" color={plat.color}>
              {plat.name}
            </Text>
          </View>
        </View>

        <Text variant="body" style={styles.content}>
          {post.content}
        </Text>

        {post.media ? (
          <View style={[styles.media, { borderColor: plat.color }]}>
            <Text variant="label" color={plat.color} style={styles.mediaKind}>
              {post.media.kind === 'video' ? '🎬 SHORT VIDEO' : '📷 PHOTO'}
            </Text>
            <Text variant="caption" muted style={styles.mediaDesc}>
              {post.media.description}
            </Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.stats}>
          <Text variant="caption" muted>
            {plat.likeIcon} {shortNumber(post.likes)}
          </Text>
          <Text variant="caption" muted>
            {plat.replyIcon} {shortNumber(post.replies)}
          </Text>
          <Text variant="caption" muted>
            {plat.repostIcon} {shortNumber(post.reposts)}
          </Text>
          {post.shares !== undefined ? (
            <Text variant="caption" muted>
              ↗ {shortNumber(post.shares)}
            </Text>
          ) : null}
          <View style={styles.spacer} />
          {post.views !== undefined ? (
            <Text variant="label" muted>
              👁 {shortNumber(post.views)}
            </Text>
          ) : null}
          {post.aiEnhanced ? (
            <View style={styles.aiChip}>
              <Text variant="label" color={COLORS.secondary}>
                ✦ LIVE
              </Text>
            </View>
          ) : null}
        </View>

        {post.fanSegment ? (
          <View style={styles.segmentRow}>
            <Text variant="label" muted>
              {SEGMENT_EMOJI[post.fanSegment]} {SEGMENT_LABEL[post.fanSegment]} fan
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  identity: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameWrap: { flex: 1, flexShrink: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1 },
  platTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    backgroundColor: COLORS.glass,
  },
  content: { marginTop: SPACING.md, marginBottom: SPACING.sm, lineHeight: 21 },
  media: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    borderStyle: 'dashed',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.glass,
    gap: 3,
    marginBottom: SPACING.xs,
  },
  mediaKind: { letterSpacing: 0.5 },
  mediaDesc: { lineHeight: 18 },
  divider: {
    height: 1,
    backgroundColor: COLORS.hairline,
    marginVertical: SPACING.sm,
  },
  stats: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  spacer: { flex: 1 },
  segmentRow: { marginTop: SPACING.xs, flexDirection: 'row' },
  aiChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
});
