import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { DmThread } from '../../../types/drama';
import { useDramaStore } from '../../../store/dramaStore';
import { playerReadDm, playerReplyDm } from '../../../systems/simulation/playerActions';
import { STORY_ARC } from '../../../systems/social/talk/stories';
import { answerStoryDm } from '../../../systems/social/talk/live';
import { Avatar } from '../Avatar';
import { PageHeader } from '../Page';
import { T } from '../T';
import { KeyboardSpacer } from '../KeyboardSpacer';

/** How each app draws its chat. */
export interface DmTheme {
  app: 'VibeGram' | 'Chirp' | 'TokTalk';
  bg: string;
  text: string;
  muted: string;
  line: string;
  field: string;
  bubbleIn: string;
  /** Out bubble: a gradient (VibeGram) or one color. */
  bubbleOut: readonly [string, string];
  outText: string;
  accent: string;
  chip: string;
  chipText: string;
  chevron: boolean;
  /** Corner radius of bubbles. */
  radius: number;
}

function ago(ms: number): string {
  const m = Math.max(1, Math.round((Date.now() - ms) / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

/**
 * One DM conversation, the way the real apps draw it: their messages arrive
 * with a typing indicator, quick replies sit above the keyboard, and message
 * requests ask before they become a conversation. Picking a reply is a game
 * move (systems/drama); typing freely is just talking.
 */
export function DmChat({ threadId, theme, onBack }: { threadId: string; theme: DmTheme; onBack: () => void }) {
  const thread = useDramaStore((s) => s.dms.find((d) => d.id === threadId)) as DmThread | undefined;
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState('');
  const [typed, setTyped] = useState<{ text: string; at: number }[]>([]);
  const [line, setLine] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    playerReadDm(threadId);
  }, [threadId]);

  const pending = thread ? thread.messages.some((m) => m.at > now) : false;
  // Tick while their answer is still "being typed".
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, [pending]);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [thread?.messages.length, typed.length, pending, now]);

  const visible = useMemo(() => {
    if (!thread) return [];
    const all = [...thread.messages.filter((m) => m.at <= now), ...typed.map((m) => ({ from: 'me' as const, ...m }))];
    return all.sort((a, b) => a.at - b.at);
  }, [thread, now, typed]);

  if (!thread) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.bg }]}>
        <PageHeader onBack={onBack} color={theme.text} background={theme.bg} chevron={theme.chevron} title="Messages" />
      </View>
    );
  }

  const p = thread.person;
  const canReply = thread.state === 'open' && thread.options.length > 0 && !pending;

  const choose = (replyId: string) => {
    const res = playerReplyDm(thread.id, replyId);
    if (res.ok && res.line) setLine(res.line);
    setNow(Date.now());
  };
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    // Answering someone who replied to a story: it's kept, and they write back.
    if (thread.arc === STORY_ARC) {
      answerStoryDm(thread.id, text);
      setNow(Date.now());
    } else {
      setTyped((t) => [...t, { text, at: Date.now() }]);
    }
    setDraft('');
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.bg }]}>
      <PageHeader
        onBack={onBack}
        color={theme.text}
        muted={theme.muted}
        background={theme.bg}
        border={theme.line}
        chevron={theme.chevron}
        titleSize={16}
        title={p.name}
        subtitle={pending ? 'typing…' : thread.state === 'blocked' ? 'Blocked' : `@${p.handle}`}
        right={
          <View style={styles.headIcons}>
            <Ionicons name="call-outline" size={22} color={theme.text} />
            <Ionicons name="videocam-outline" size={25} color={theme.text} />
          </View>
        }
      />
      <ScrollView ref={scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Avatar id={p.id} name={p.name} size={84} />
          <View style={styles.nameRow}>
            <T size={19} weight="700" color={theme.text}>
              {p.name}
            </T>
            {p.verified ? <Ionicons name="checkmark-circle" size={17} color={theme.accent} /> : null}
          </View>
          <T size={13} color={theme.muted}>
            @{p.handle} · {theme.app}
          </T>
          <T size={13} color={theme.muted}>
            {compact(p.followers)} followers
          </T>
        </View>

        {thread.request ? (
          <View style={[styles.request, { borderColor: theme.line }]}>
            <T size={13} color={theme.muted} center>
              {`${p.name} wants to send you a message. They won't know you've seen it until you reply.`}
            </T>
          </View>
        ) : null}

        {visible.map((m, i) => {
          const mine = m.from === 'me';
          const nextSame = visible[i + 1]?.from === m.from;
          if (mine) {
            return (
              <LinearGradient
                key={`${m.at}-${i}`}
                colors={theme.bubbleOut}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.out, { borderRadius: theme.radius, marginBottom: nextSame ? 2 : 8 }]}
              >
                <T size={15} color={theme.outText}>
                  {m.text}
                </T>
              </LinearGradient>
            );
          }
          return (
            <View key={`${m.at}-${i}`} style={[styles.inRow, { marginBottom: nextSame ? 2 : 8 }]}>
              {nextSame ? <View style={styles.avatarGap} /> : <Avatar id={p.id} name={p.name} size={26} />}
              <View style={[styles.in, { backgroundColor: theme.bubbleIn, borderRadius: theme.radius }]}>
                <T size={15} color={theme.text}>
                  {m.text}
                </T>
              </View>
            </View>
          );
        })}

        {pending ? (
          <View style={styles.inRow}>
            <Avatar id={p.id} name={p.name} size={26} />
            <View style={[styles.in, styles.typing, { backgroundColor: theme.bubbleIn, borderRadius: theme.radius }]}>
              <T size={18} color={theme.muted}>
                • • •
              </T>
            </View>
          </View>
        ) : null}

        {visible.length > 0 && visible[visible.length - 1].from === 'me' && !pending ? (
          <T size={11} color={theme.muted} style={styles.seen}>
            Seen {ago(visible[visible.length - 1].at)} ago
          </T>
        ) : null}

        {thread.state === 'blocked' ? (
          <T size={13} color={theme.muted} center style={styles.status}>
            You blocked this account.
          </T>
        ) : thread.state === 'closed' && !pending ? (
          <T size={12} color={theme.muted} center style={styles.status}>
            {ago(thread.messages[thread.messages.length - 1]?.at ?? Date.now())} ago
          </T>
        ) : null}

        {line ? (
          <View style={[styles.result, { borderColor: theme.line }]}>
            <T size={12} color={theme.muted} center>
              {line}
            </T>
          </View>
        ) : null}
      </ScrollView>

      {canReply ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipBar}>
          {thread.options.map((o) => (
            <Pressable
              key={o.id}
              onPress={() => choose(o.id)}
              style={({ pressed }) => [styles.chip, { backgroundColor: theme.chip, opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
            >
              <T size={14} weight="600" color={theme.chipText}>
                {o.label}
              </T>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {thread.state !== 'blocked' ? (
        <View style={styles.bar}>
          <View style={[styles.input, { backgroundColor: theme.field }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message..."
              placeholderTextColor={theme.muted}
              style={[styles.inputText, { color: theme.text }]}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            {draft.trim() ? (
              <Pressable onPress={send} hitSlop={8}>
                <T size={15} weight="700" color={theme.accent}>
                  Send
                </T>
              </Pressable>
            ) : (
              <View style={styles.headIcons}>
                <Ionicons name="mic-outline" size={22} color={theme.text} />
                <Ionicons name="image-outline" size={22} color={theme.text} />
              </View>
            )}
          </View>
        </View>
      ) : null}
      {/* The quick replies and the message bar ride on top of the keyboard. */}
      <KeyboardSpacer />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headIcons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  body: { paddingHorizontal: 12, paddingBottom: 16 },
  intro: { alignItems: 'center', gap: 3, paddingVertical: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  request: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, marginBottom: 14 },
  inRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  avatarGap: { width: 26 },
  in: { maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 9 },
  typing: { paddingVertical: 4 },
  out: { alignSelf: 'flex-end', maxWidth: '76%', paddingHorizontal: 14, paddingVertical: 9 },
  seen: { alignSelf: 'flex-end', marginTop: -2, marginRight: 2 },
  status: { marginTop: 8 },
  result: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 10, paddingHorizontal: 10 },
  chipBar: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bar: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 24, paddingHorizontal: 16, minHeight: 46 },
  inputText: { flex: 1, fontSize: 15, paddingVertical: 8 },
});
