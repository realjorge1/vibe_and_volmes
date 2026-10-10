import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Platform } from '../../../types/social';
import type { DmThread } from '../../../types/drama';
import { useDramaStore } from '../../../store/dramaStore';
import { Avatar } from '../Avatar';
import { T } from '../T';
import type { DmTheme } from './DmChat';

function ago(ms: number): string {
  const m = Math.max(1, Math.round((Date.now() - ms) / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : `${Math.round(d / 7)}w`;
}

function lastSeen(t: DmThread, now: number): { text: string; at: number; mine: boolean } {
  const shown = t.messages.filter((m) => m.at <= now);
  const last = shown[shown.length - 1] ?? t.messages[0];
  return { text: last?.text ?? '', at: last?.at ?? now, mine: last?.from === 'me' };
}

/** The app's DM threads, newest first, ready for a list. */
export function useThreads(platform: Platform) {
  const dms = useDramaStore((s) => s.dms);
  return useMemo(() => {
    const now = Date.now();
    const mine = dms.filter((d) => d.platform === platform && d.state !== 'blocked');
    const sorted = [...mine].sort((a, b) => lastSeen(b, now).at - lastSeen(a, now).at);
    return { primary: sorted.filter((d) => !d.request), requests: sorted.filter((d) => d.request) };
  }, [dms, platform]);
}

export function unreadCount(dms: readonly DmThread[], platform: Platform): number {
  return dms.filter((d) => d.platform === platform && d.unread && d.state !== 'blocked').length;
}

/**
 * The inbox: conversations, unread ones bold with a dot, and message
 * requests (strangers) behind their own row, like the real apps.
 */
export function DmList({
  platform,
  theme,
  onOpen,
  header,
}: {
  platform: Platform;
  theme: DmTheme;
  onOpen: (threadId: string) => void;
  header?: React.ReactNode;
}) {
  const { primary, requests } = useThreads(platform);
  const [showRequests, setShowRequests] = useState(false);
  const now = Date.now();
  const data = showRequests ? requests : primary;

  return (
    <FlatList
      data={data}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={
        <View>
          {header}
          <View style={styles.head}>
            <T size={16} weight="700" color={theme.text}>
              {showRequests ? 'Requests' : 'Messages'}
            </T>
            <Pressable onPress={() => setShowRequests((v) => !v)} hitSlop={8}>
              <T size={15} weight="600" color={theme.accent}>
                {showRequests ? 'Back to messages' : `Requests${requests.length ? ` (${requests.length})` : ''}`}
              </T>
            </Pressable>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={42} color={theme.muted} />
          <T size={15} color={theme.muted} center>
            {showRequests ? 'No message requests.' : 'No messages yet. The more people know you, the busier this gets.'}
          </T>
        </View>
      }
      renderItem={({ item }) => {
        const last = lastSeen(item, now);
        const bold = item.unread;
        return (
          <Pressable onPress={() => onOpen(item.id)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.field }]}>
            <Avatar id={item.person.id} name={item.person.name} size={54} />
            <View style={styles.texts}>
              <View style={styles.nameRow}>
                <T size={15} weight={bold ? '700' : '500'} color={theme.text} numberOfLines={1} style={styles.shrink}>
                  {item.person.name}
                </T>
                {item.person.verified ? <Ionicons name="checkmark-circle" size={14} color={theme.accent} /> : null}
              </View>
              <T size={14} weight={bold ? '700' : '400'} color={bold ? theme.text : theme.muted} numberOfLines={1}>
                {last.mine ? `You: ${last.text}` : last.text} · {ago(last.at)}
              </T>
            </View>
            {bold ? <View style={[styles.dot, { backgroundColor: theme.accent }]} /> : null}
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  texts: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shrink: { flexShrink: 1 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 40, paddingTop: 60 },
});
