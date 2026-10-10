import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './T';

type Glyph = keyof typeof Ionicons.glyphMap;

export interface NavTab<K extends string> {
  key: K;
  /** Ionicons base name: filled when active, `-outline` when idle. */
  icon: string;
  label?: string;
  /** Unread count on the tab (0 = none). */
  badge?: number;
  /** Replaces the glyph (the profile tab shows your avatar, TokTalk's "+"). */
  render?: (active: boolean) => React.ReactNode;
}

interface Props<K extends string> {
  tabs: readonly NavTab<K>[];
  value: K;
  onChange: (key: K) => void;
  background: string;
  active: string;
  inactive: string;
  border?: string;
  /**
   * `icons`: icons only (Chirp, VibeGram). `labeled`: icon over a small label
   * (TokTalk). `material`: Material 3 pill behind the active icon (VibeNews).
   */
  variant?: 'icons' | 'labeled' | 'material';
  badgeColor?: string;
  /** A dot instead of a number (VibeGram's activity heart). */
  badgeDot?: boolean;
  pillColor?: string;
  iconSize?: number;
}

/** An app's own bottom navigation, spread evenly across the width. */
export function AppNav<K extends string>({
  tabs,
  value,
  onChange,
  background,
  active,
  inactive,
  border,
  variant = 'icons',
  badgeColor = '#FF3B30',
  badgeDot,
  pillColor = 'rgba(0,0,0,0.08)',
  iconSize = 26,
}: Props<K>) {
  const labeled = variant !== 'icons';
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: background },
        border ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border } : null,
        labeled ? styles.tall : null,
        variant === 'material' ? styles.material : null,
      ]}
    >
      {tabs.map((t) => {
        const on = t.key === value;
        const glyph = (
          <View>
            {t.render ? (
              t.render(on)
            ) : (
              <Ionicons name={(on ? t.icon : `${t.icon}-outline`) as Glyph} size={iconSize} color={on ? active : inactive} />
            )}
            {t.badge ? (
              badgeDot ? (
                <View style={[styles.dot, { backgroundColor: badgeColor, borderColor: background }]} />
              ) : (
                <View style={[styles.badge, { backgroundColor: badgeColor, borderColor: background }]}>
                  <T size={10} weight="700" lh={12}>
                    {t.badge > 99 ? '99+' : t.badge}
                  </T>
                </View>
              )
            ) : null}
          </View>
        );
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label ?? t.key}
            hitSlop={4}
          >
            {variant === 'material' ? (
              <View style={[styles.pill, on && { backgroundColor: pillColor }]}>{glyph}</View>
            ) : (
              glyph
            )}
            {labeled && t.label ? (
              <T size={variant === 'material' ? 12 : 10} weight={on ? '700' : '500'} color={on ? active : inactive} style={styles.label}>
                {t.label}
              </T>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', height: 50, alignItems: 'center' },
  tall: { height: 58 },
  material: { height: 74 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { marginTop: 1 },
  pill: { width: 64, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -11,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute', bottom: -7, alignSelf: 'center', width: 6, height: 6, borderRadius: 3 },
});
