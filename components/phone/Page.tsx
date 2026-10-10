import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { T } from './T';

/** A page pushed inside an app: it slides in over the tabs, which keep their scroll. */
export function PageLayer({ background, children }: { background: string; children: React.ReactNode }) {
  return (
    <Animated.View
      entering={SlideInRight.duration(250)}
      exiting={SlideOutRight.duration(210)}
      style={[StyleSheet.absoluteFill, { backgroundColor: background }]}
    >
      {children}
    </Animated.View>
  );
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack: () => void;
  color: string;
  muted?: string;
  background: string;
  border?: string;
  right?: React.ReactNode;
  /** Centered title (VibeGram, TokTalk) rather than beside the arrow. */
  center?: boolean;
  /** iOS-style chevron (VibeGram, TokTalk) or Android arrow (Chirp, VibeNews). */
  chevron?: boolean;
  titleSize?: number;
}

/** An in-app page's top bar: back, title, an optional action, under the status bar. */
export function PageHeader({
  title,
  subtitle,
  onBack,
  color,
  muted,
  background,
  border,
  right,
  center,
  chevron,
  titleSize = 20,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { paddingTop: insets.top, backgroundColor: background },
        border ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: border } : null,
      ]}
    >
      <View style={styles.row}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.side} accessibilityLabel="Back">
          <Ionicons name={chevron || center ? 'chevron-back' : 'arrow-back'} size={chevron || center ? 28 : 22} color={color} />
        </Pressable>
        <View style={[styles.titles, center && styles.centered]}>
          {title ? (
            <T size={titleSize} weight="700" color={color} numberOfLines={1}>
              {title}
            </T>
          ) : null}
          {subtitle ? (
            <T size={13} color={muted ?? color} numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
        <View style={[styles.side, styles.right]}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 53, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 20 },
  side: { minWidth: 34, alignItems: 'flex-start', justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  titles: { flex: 1 },
  centered: { alignItems: 'center' },
});
