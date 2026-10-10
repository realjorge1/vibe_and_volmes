import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { GameEvent } from '../../types/events';
import { categoryColor, categoryIcon } from '../../utils/eventCategory';
import { COLORS, RADIUS, SPACING, withAlpha } from '../../constants/theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Typography';
import { Orb3D } from '../fx/Orb3D';

/** The live event as a hero panel: a floating category orb, title, story. */
export function EventCard({ event }: { event: GameEvent }) {
  const color = categoryColor(event.category);
  return (
    <Card accent={color} style={styles.card}>
      <View style={styles.head}>
        <Orb3D size={48} color={color} icon={categoryIcon(event.category)} />
        <View style={styles.headText}>
          <Badge label={event.category} color={color} />
          <Text variant="title" style={styles.title}>
            {event.title}
          </Text>
        </View>
      </View>
      <Text variant="body" muted style={styles.desc}>
        {event.description}
      </Text>
      {event.callback ? <CallbackNote week={event.callback.week} note={event.callback.note} /> : null}
    </Card>
  );
}

/** "The past comes back": what the artist did, and when, under a callback. */
export function CallbackNote({ week, note }: { week: number; note: string }) {
  return (
    <View style={styles.callback}>
      <Ionicons name="time-outline" size={14} color={COLORS.gold} />
      <View style={styles.headText}>
        <Text variant="label" color={COLORS.gold}>
          {`THE PAST COMES BACK · WEEK ${week}`}
        </Text>
        <Text variant="caption" color={COLORS.textSecondary} style={styles.callbackNote}>
          {note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.base },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base },
  headText: { flex: 1 },
  title: { marginTop: SPACING.sm, fontSize: 17, lineHeight: 23 },
  desc: { marginTop: SPACING.md, lineHeight: 22 },
  callback: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: withAlpha(COLORS.gold, 0.08),
    borderWidth: 1,
    borderColor: withAlpha(COLORS.gold, 0.25),
  },
  callbackNote: { marginTop: 2, lineHeight: 18 },
});
