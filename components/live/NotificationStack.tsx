import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Typography';
import { useLiveStore } from '../../store/liveStore';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

/**
 * Floating dopamine toast stack — level-ups, achievements, energy full.
 * Absolute overlay; tap a card to dismiss. Renders nothing when idle.
 */
export function NotificationStack() {
  const insets = useSafeAreaInsets();
  const notifications = useLiveStore((s) => s.notifications);
  const dismiss = useLiveStore((s) => s.dismissNotification);

  if (notifications.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.layer, { top: insets.top + SPACING.sm }]}
    >
      {notifications.slice(-4).map((n) => (
        <Pressable
          key={n.id}
          onPress={() => dismiss(n.id)}
          style={[styles.card, { borderLeftColor: n.color }]}
        >
          <Text variant="label" color={n.color}>
            {n.title.toUpperCase()}
          </Text>
          <Text variant="caption" style={styles.body} numberOfLines={3}>
            {n.body}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: SPACING.base,
    right: SPACING.base,
    gap: SPACING.sm,
    zIndex: 1000,
  },
  card: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
  },
  body: { marginTop: 2 },
});
