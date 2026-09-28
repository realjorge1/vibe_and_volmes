import React from 'react';
import { StyleSheet } from 'react-native';
import type { GameEvent } from '../../types/events';
import { categoryColor } from '../../utils/eventCategory';
import { SPACING } from '../../constants/theme';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Text } from '../ui/Typography';

export function EventCard({ event }: { event: GameEvent }) {
  const color = categoryColor(event.category);
  return (
    <Card accent={color} style={styles.card}>
      <Badge label={event.category} color={color} />
      <Text variant="title" style={styles.title}>
        {event.title}
      </Text>
      <Text variant="body" muted style={styles.desc}>
        {event.description}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: SPACING.lg },
  title: { marginTop: SPACING.md },
  desc: { marginTop: SPACING.sm, lineHeight: 22 },
});
