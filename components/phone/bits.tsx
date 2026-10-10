import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { SocialPost } from '../../types/social';
import { hashOf } from './kit';

/**
 * Small pieces every phone app needs, drawn the way each real app draws
 * them: verification badges, timestamps, counts.
 */

/** Chirp and VibeGram: the scalloped blue check. TokTalk: the round cyan one. */
export function Verified({ app, size = 16 }: { app: 'chirp' | 'gram' | 'tok'; size?: number }) {
  if (app === 'tok') return <Ionicons name="checkmark-circle" size={size} color="#20D5EC" />;
  return <MaterialCommunityIcons name="check-decagram" size={size} color={app === 'chirp' ? '#1D9BF0' : '#0095F6'} />;
}

/** In-game posts carry a week; inside this week they get a stable hour. Real-world stories have a real time. */
function hoursAgo(post: SocialPost, week: number): number {
  if (post.world && post.world.at > 0 && !post.world.evergreen) {
    // Somewhere between when the story broke and now (people post about it over the next hours).
    const age = Math.max(0, (Date.now() - post.world.at) / 3_600_000);
    return Math.max(1, Math.round(age * (0.15 + (hashOf(post.id) % 85) / 100)));
  }
  const diff = week - post.week;
  return diff <= 0 ? (hashOf(post.id) % 22) + 1 : diff * 24 * 7;
}

/** Chirp: "3h", "2d", or a date. */
export function chirpTime(post: SocialPost, week: number): string {
  const h = hoursAgo(post, week);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : `${d}d`;
}

/** VibeGram feed: "3 hours ago", "2 days ago". */
export function gramTime(post: SocialPost, week: number): string {
  const h = hoursAgo(post, week);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  const w = Math.round(d / 7);
  return `${w} week${w === 1 ? '' : 's'} ago`;
}

/** VibeGram activity / comments and TokTalk: "3h", "2d", "1w". */
export function compactTime(post: SocialPost | null, week: number, seed = ''): string {
  const h = post ? hoursAgo(post, week) : (hashOf(seed) % 22) + 1;
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : `${Math.round(d / 7)}w`;
}

/** Wall-clock notifications: "now", "4m", "2h", "3d". */
export function sinceMs(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}

/** Counts the way the apps print them: 1,234 stays, 12.3K, 4.5M. */
export function count(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  if (n >= 1_000) return n.toLocaleString('en-US');
  return String(n);
}

/** Like `count`, but compact from a thousand up (TokTalk's rail, Chirp's actions). */
export function countShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function Hairline({ color, inset = 0 }: { color: string; inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginLeft: inset }} />;
}
