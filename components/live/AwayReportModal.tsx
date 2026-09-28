import React from 'react';
import { Modal, View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { useLiveStore } from '../../store/liveStore';
import { usePremiumStore } from '../../store/premiumStore';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

/**
 * The open-the-app payoff: a sectioned "here's what happened without you"
 * digest — your scheduled plan's results, passive earnings, relationship moves,
 * unexpected events, and the world moving on. Shown once per meaningful
 * absence, then cleared.
 */
export function AwayReportModal() {
  const report = useLiveStore((s) => s.awayReport);
  const clear = useLiveStore((s) => s.setAwayReport);
  // A purely cosmetic premium flourish — never changes the content.
  const flair = usePremiumStore((s) => s.convenience.includes('recap-flair'));

  if (!report) return null;

  const accent = flair ? COLORS.gold : COLORS.primary;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => clear(null)}>
      <View style={styles.scrim}>
        <View style={[styles.sheet, flair && { borderColor: COLORS.gold }]}>
          <Text variant="label" color={accent}>
            WHILE YOU WERE AWAY · {report.awaySpan}
          </Text>
          <Text variant="title" style={styles.title}>
            {flair ? 'The world kept moving. ✦' : 'The world kept moving.'}
          </Text>

          <View style={styles.stats}>
            <Stat
              label="FANS"
              value={`${report.fanDelta >= 0 ? '+' : ''}${report.fanDelta.toLocaleString()}`}
              color={report.fanDelta >= 0 ? COLORS.positive : COLORS.negative}
            />
            <Stat
              label="EARNED"
              value={`$${report.earnings.toLocaleString()}`}
              color={COLORS.gold}
            />
            <Stat
              label="ENERGY"
              value={`${report.energyRegained >= 0 ? '+' : ''}${report.energyRegained}`}
              color={COLORS.accent}
            />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Section title="YOUR DAYS" lines={report.planResults} accent={accent} empty="No plan ran — set one in Daily Plan." />

            {report.unexpectedEvents.length > 0 && (
              <Section title="UNEXPECTED" lines={report.unexpectedEvents} accent={COLORS.secondary} />
            )}

            {report.relationshipChanges.length > 0 && (
              <View style={styles.section}>
                <Text variant="label" color={COLORS.flashpic}>
                  RELATIONSHIPS
                </Text>
                {report.relationshipChanges.map((r, i) => (
                  <View key={i} style={styles.relRow}>
                    <Text variant="body" style={styles.flex}>
                      {r.name}
                    </Text>
                    <Text
                      variant="subheading"
                      color={r.delta >= 0 ? COLORS.positive : COLORS.negative}
                    >
                      {r.delta >= 0 ? '+' : ''}
                      {r.delta} · {r.type}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Section title="THE WORLD" lines={report.headlines} accent={COLORS.textMuted} />
          </ScrollView>

          <Button label="Catch Up" onPress={() => clear(null)} style={styles.btn} />
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title,
  lines,
  accent,
  empty,
}: {
  title: string;
  lines: string[];
  accent: string;
  empty?: string;
}) {
  const shown = lines.length > 0 ? lines : empty ? [empty] : [];
  if (shown.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="label" color={accent}>
        {title}
      </Text>
      {shown.map((line, i) => (
        <View key={i} style={styles.row}>
          <Text variant="subheading" color={accent}>
            •
          </Text>
          <Text variant="body" style={styles.flex}>
            {line}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="heading" color={color}>
        {value}
      </Text>
      <Text variant="label" muted>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.xl,
    maxHeight: '86%',
  },
  title: { marginTop: SPACING.xs, marginBottom: SPACING.base },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.base,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  stat: { alignItems: 'center', gap: 2 },
  body: { marginTop: SPACING.base },
  section: { marginBottom: SPACING.lg, gap: SPACING.sm },
  row: { flexDirection: 'row', gap: SPACING.sm },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1, lineHeight: 21 },
  btn: { marginTop: SPACING.sm },
});
