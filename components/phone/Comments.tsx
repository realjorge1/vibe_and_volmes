import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { SocialPost } from '../../types/social';
import type { ThreadReply } from '../../systems/social/threadGenerator';
import { T } from './T';
import { Avatar } from './Avatar';
import { Verified, compactTime, countShort, sinceMs } from './bits';
import { useSendComment, useThread } from './hooks';
import { KeyboardSpacer } from './KeyboardSpacer';

interface Props {
  post: SocialPost;
  /** `gram`: VibeGram's sheet. `tok`: TokTalk's. */
  look: 'gram' | 'tok';
  /** The comment a notification pointed at: pinned on top, tinted, its replies open. */
  highlight?: string;
  liked: ReadonlySet<string>;
  like: (id: string) => void;
  meName: string;
  meHandle: string;
  week: number;
  onClose: () => void;
}

const QUICK = ['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'];

/** One row of the sheet: a comment, one of its replies, or the "View replies" toggle. */
type Row =
  | { kind: 'comment'; reply: ThreadReply; depth: 0 | 1; topId: string }
  | { kind: 'toggle'; topId: string; count: number; open: boolean };

/**
 * The comments sheet: slides up over the post, drag it down to close. The
 * comment a notification pointed at sits on top. Replies sit under the
 * comment they answer ("View 3 replies"), Reply answers anyone, and what you
 * write stays: people answer it over the next minutes.
 */
export function CommentsSheet({ post, look, highlight, liked, like, meName, meHandle, week, onClose }: Props) {
  const { height } = useWindowDimensions();
  const thread = useThread(post);
  const send = useSendComment(post);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ThreadReply | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set());
  const listRef = useRef<FlatList<Row>>(null);
  const inputRef = useRef<TextInput>(null);
  const drag = useSharedValue(0);
  const gram = look === 'gram';
  const bg = gram ? '#262626' : '#161616';

  // A notification about a reply opens the comment it sits under.
  const pinnedTop = useMemo(() => {
    if (!highlight) return undefined;
    return thread.find((r) => r.id === highlight || (r.children ?? []).some((k) => k.id === highlight));
  }, [thread, highlight]);
  const pinnedId = pinnedTop?.id;
  useEffect(() => {
    if (pinnedId && (pinnedTop?.children?.length ?? 0) > 0) setOpen((s) => (s.has(pinnedId) ? s : new Set(s).add(pinnedId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId]);

  const rows = useMemo<Row[]>(() => {
    const ordered = pinnedTop ? [pinnedTop, ...thread.filter((r) => r.id !== pinnedTop.id)] : thread;
    const out: Row[] = [];
    for (const top of ordered) {
      out.push({ kind: 'comment', reply: top, depth: 0, topId: top.id });
      const kids = top.children ?? [];
      if (kids.length === 0) continue;
      const isOpen = open.has(top.id);
      if (isOpen) for (const k of kids) out.push({ kind: 'comment', reply: k, depth: 1, topId: top.id });
      out.push({ kind: 'toggle', topId: top.id, count: kids.length, open: isOpen });
    }
    return out;
  }, [thread, pinnedTop, open]);

  const myCount = useMemo(() => thread.reduce((n, r) => n + (r.mine ? 1 : 0) + (r.children ?? []).filter((k) => k.mine).length, 0), [thread]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(onClose)();
      else drag.value = withSpring(0);
    });
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  const topOf = (r: ThreadReply): string => thread.find((t) => t.id === r.id || (t.children ?? []).some((k) => k.id === r.id))?.id ?? r.id;

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    send(t, replyTo);
    if (replyTo) {
      const top = topOf(replyTo);
      setOpen((s) => (s.has(top) ? s : new Set(s).add(top)));
    } else {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
    setDraft('');
    setReplyTo(null);
  };

  const startReply = (r: ThreadReply) => {
    setReplyTo(r);
    // Instagram starts the reply with their @; TikTok shows who you're answering above the box.
    if (gram && !r.mine) setDraft(`@${r.handle} `);
    inputRef.current?.focus();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Close comments" />
      </Animated.View>
      <Animated.View entering={SlideInDown.duration(240)} exiting={SlideOutDown.duration(200)} style={[styles.sheet, { height: height * 0.68, backgroundColor: bg }]}>
        <Animated.View style={[styles.flex, st]}>
          <GestureDetector gesture={pan}>
            <View style={styles.head}>
              <View style={styles.grab} />
              <View style={styles.titleRow}>
                <T size={gram ? 16 : 14} weight="700" center style={styles.flex}>
                  {gram ? 'Comments' : `${countShort(post.replies + myCount)} comments`}
                </T>
                {!gram ? (
                  <Pressable onPress={onClose} hitSlop={12} style={styles.close} accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </Pressable>
                ) : null}
              </View>
            </View>
          </GestureDetector>
          {gram ? <View style={styles.rule} /> : null}
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => (r.kind === 'comment' ? r.reply.id : `more-${r.topId}`)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) =>
              item.kind === 'toggle' ? (
                <Pressable
                  onPress={() =>
                    setOpen((s) => {
                      const n = new Set(s);
                      if (n.has(item.topId)) n.delete(item.topId);
                      else n.add(item.topId);
                      return n;
                    })
                  }
                  style={styles.moreRow}
                  hitSlop={6}
                >
                  <View style={styles.moreLine} />
                  <T size={12} weight="600" color={gram ? '#A8A8A8' : 'rgba(255,255,255,0.5)'}>
                    {item.open ? 'Hide replies' : gram ? `View ${item.count} more ${item.count === 1 ? 'reply' : 'replies'}` : `View ${item.count} ${item.count === 1 ? 'reply' : 'replies'}`}
                  </T>
                  {!gram ? <Ionicons name={item.open ? 'chevron-up' : 'chevron-down'} size={12} color="rgba(255,255,255,0.5)" /> : null}
                </Pressable>
              ) : (
                <Comment
                  reply={item.reply}
                  depth={item.depth}
                  gram={gram}
                  on={liked.has(item.reply.id)}
                  like={() => like(item.reply.id)}
                  onReply={() => startReply(item.reply)}
                  pinned={item.reply.id === highlight}
                  week={week}
                />
              )
            }
            showsVerticalScrollIndicator={false}
          />
          {gram ? (
            <View style={styles.quick}>
              {QUICK.map((e) => (
                <Pressable key={e} onPress={() => submit(e)} hitSlop={6}>
                  <T size={24}>{e}</T>
                </Pressable>
              ))}
            </View>
          ) : null}
          {replyTo ? (
            <View style={[styles.replying, { backgroundColor: gram ? '#363636' : '#222222' }]}>
              <T size={13} color={gram ? '#A8A8A8' : 'rgba(255,255,255,0.6)'} numberOfLines={1} style={styles.flex}>
                Replying to {replyTo.mine ? 'yourself' : gram ? replyTo.handle : replyTo.username}
              </T>
              <Pressable
                onPress={() => {
                  setReplyTo(null);
                  if (gram) setDraft((d) => d.replace(/^@\S+\s/, ''));
                }}
                hitSlop={10}
                accessibilityLabel="Cancel reply"
              >
                <Ionicons name="close" size={18} color={gram ? '#A8A8A8' : 'rgba(255,255,255,0.6)'} />
              </Pressable>
            </View>
          ) : null}
          <View style={[styles.inputRow, { borderTopColor: gram ? '#363636' : '#2A2A2A' }]}>
            <Avatar id="player" name={meName} size={gram ? 36 : 32} />
            <View style={[styles.field, gram ? styles.fieldGram : styles.fieldTok]}>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder={replyTo ? `Reply to ${replyTo.mine ? 'yourself' : replyTo.handle}…` : gram ? `Add a comment for ${post.account.handle}…` : 'Add comment...'}
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={styles.input}
                onSubmitEditing={() => submit(draft)}
                returnKeyType="send"
              />
              {draft.trim() ? (
                <Pressable onPress={() => submit(draft)} hitSlop={8}>
                  {gram ? (
                    <T size={15} weight="700" color="#0095F6">
                      Post
                    </T>
                  ) : (
                    <View style={styles.sendTok}>
                      <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              ) : !gram ? (
                <View style={styles.tokIcons}>
                  <Ionicons name="at" size={20} color="rgba(255,255,255,0.8)" />
                  <Ionicons name="happy-outline" size={20} color="rgba(255,255,255,0.8)" />
                </View>
              ) : null}
            </View>
          </View>
          <KeyboardSpacer />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/** "now", "4m", "2h" for comments that arrived on the clock; the post's week otherwise. */
function ageOf(reply: ThreadReply, week: number): string {
  if (reply.at !== undefined) return sinceMs(reply.at);
  return compactTime(null, week, reply.id);
}

function Comment({
  reply,
  depth,
  gram,
  on,
  like,
  onReply,
  pinned,
  week,
}: {
  reply: ThreadReply;
  depth: 0 | 1;
  gram: boolean;
  on: boolean;
  like: () => void;
  onReply: () => void;
  pinned: boolean;
  week: number;
}) {
  const age = ageOf(reply, week);
  const small = depth === 1;
  // A reply that answers someone other than the comment it sits under names them first.
  const mention = small && reply.toHandle && !reply.content.startsWith('@') ? `@${reply.toHandle} ` : '';
  return (
    <View style={[styles.comment, small && styles.child, pinned && styles.pinned]}>
      <Avatar id={reply.accountId} name={reply.username} size={small ? 26 : 34} />
      <View style={styles.flex}>
        {gram ? (
          <View style={styles.who}>
            <T size={13} weight="700">
              {reply.handle}
            </T>
            {reply.verified ? <Verified app="gram" size={13} /> : null}
            <T size={13} color="#A8A8A8">
              {age}
            </T>
          </View>
        ) : (
          <View style={styles.who}>
            <T size={13} color="rgba(255,255,255,0.6)">
              {reply.username}
            </T>
            {reply.verified ? <Verified app="tok" size={12} /> : null}
            {reply.mine ? (
              <T size={11} weight="700" color="#FE2C55">
                · Creator
              </T>
            ) : null}
          </View>
        )}
        <T size={gram ? 14 : 15} lh={gram ? 19 : 20} style={styles.text}>
          {mention ? (
            <T size={gram ? 14 : 15} color={gram ? '#E0F1FF' : 'rgba(255,255,255,0.6)'}>
              {mention}
            </T>
          ) : null}
          {reply.content}
        </T>
        <View style={styles.metaRow}>
          {!gram ? (
            <T size={13} color="rgba(255,255,255,0.5)">
              {age}
            </T>
          ) : null}
          <Pressable onPress={onReply} hitSlop={8}>
            <T size={12} weight="600" color={gram ? '#A8A8A8' : 'rgba(255,255,255,0.5)'}>
              Reply
            </T>
          </Pressable>
          {gram && !reply.mine ? (
            <T size={12} weight="600" color="#A8A8A8">
              See translation
            </T>
          ) : null}
        </View>
      </View>
      <Pressable onPress={like} hitSlop={10} style={styles.heart}>
        <Ionicons name={on ? 'heart' : 'heart-outline'} size={gram ? 14 : 18} color={on ? (gram ? '#FF3040' : '#FE2C55') : gram ? '#A8A8A8' : 'rgba(255,255,255,0.55)'} />
        {reply.likes + (on ? 1 : 0) > 0 ? (
          <T size={11} color={gram ? '#A8A8A8' : 'rgba(255,255,255,0.55)'}>
            {countShort(reply.likes + (on ? 1 : 0))}
          </T>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  head: { paddingTop: 8, paddingBottom: 10 },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  close: { position: 'absolute', right: 14 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: '#363636' },
  comment: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  child: { paddingLeft: 62, paddingVertical: 7, gap: 10 },
  pinned: { backgroundColor: 'rgba(255,255,255,0.07)' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  text: { marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 6 },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 62, paddingTop: 2, paddingBottom: 10 },
  moreLine: { width: 24, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.4)' },
  heart: { alignItems: 'center', gap: 2, paddingTop: 4, minWidth: 24 },
  quick: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#363636' },
  replying: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  field: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40, paddingHorizontal: 14 },
  fieldGram: { borderRadius: 20, borderWidth: 1, borderColor: '#363636' },
  fieldTok: { borderRadius: 6, backgroundColor: '#2A2A2A' },
  input: { flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 8 },
  tokIcons: { flexDirection: 'row', gap: 14 },
  sendTok: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FE2C55', alignItems: 'center', justifyContent: 'center' },
});
