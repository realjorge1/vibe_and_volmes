import React from 'react';
import { Modal, View, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { Orb3D } from '../fx/Orb3D';
import { useLiveStore } from '../../store/liveStore';
import { usePremiumStore } from '../../store/premiumStore';
import { ANIMATIONS_ENABLED, COLORS, SPACING, RADIUS, ifAnimated, withAlpha } from '../../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

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
    <Modal transparent animationType={ANIMATIONS_ENABLED ? 'fade' : 'none'} visible onRequestClose={() => clear(null)}>
      <Animated.View entering={ifAnimated(FadeIn.duration(250))} style={styles.scrim}>
        <Animated.View
          entering={ifAnimated(ZoomIn.springify().damping(15))}
          style={[styles.sheet, { borderColor: withAlpha(accent, 0.45) }]}
        >
          <LinearGradient
            colors={[withAlpha(accent, 0.2), 'rgba(20,17,42,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.6 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.head}>
            <View style={styles.flex}>
              <Text variant="label" color={accent}>
                WHILE YOU WERE AWAY · {report.awaySpan}
              </Text>
              <Text variant="title" style={styles.title}>
                {flair ? 'The world kept moving. ✦' : 'The world kept moving.'}
              </Text>
            </View>
            <Orb3D size={50} color={accent} icon="planet" />
          </View>

          <View style={styles.stats}>
            <Stat
              icon="people"
              label="FANS"
              value={`${report.fanDelta >= 0 ? '+' : ''}${report.fanDelta.toLocaleString()}`}
              color={report.fanDelta >= 0 ? COLORS.positive : COLORS.negative}
            />
            <Stat
              icon="cash"
              label="EARNED"
              value={`$${report.earnings.toLocaleString()}`}
              color={COLORS.gold}
            />
            <Stat
              icon="flash"
              label="ENERGY"
              value={`${report.energyRegained >= 0 ? '+' : ''}${report.energyRegained}`}
              color={COLORS.accent}
            />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Section title="YOUR DAYS" icon="calendar" lines={report.planResults} accent={accent} empty="No plan ran — set one in Daily Plan." />

            {report.unexpectedEvents.length > 0 && (
              <Section title="UNEXPECTED" icon="flash" lines={report.unexpectedEvents} accent={COLORS.secondary} />
            )}

            {report.relationshipChanges.length > 0 && (
              <View style={styles.section}>
                <SectionHead title="RELATIONSHIPS" icon="heart" color={COLORS.flashpic} />
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

            <Section title="THE WORLD" icon="globe" lines={report.headlines} accent={COLORS.textSecondary} />
          </ScrollView>

          <Button label="Catch Up" icon="play" variant={flair ? 'gold' : 'brand'} size="lg" onPress={() => clear(null)} style={styles.btn} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function SectionHead({ title, icon, color }: { title: string; icon: string; color: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionIcon, { backgroundColor: withAlpha(color, 0.18) }]}>
        <Ionicons name={icon as Glyph} size={12} color={color} />
      </View>
      <Text variant="label" color={color}>
        {title}
      </Text>
    </View>
  );
}

function Section({
  title,
  icon,
  lines,
  accent,
  empty,
}: {
  title: string;
  icon: string;
  lines: string[];
  accent: string;
  empty?: string;
}) {
  const shown = lines.length > 0 ? lines : empty ? [empty] : [];
  if (shown.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHead title={title} icon={icon} color={accent} />
      {shown.map((line, i) => (
        <View key={i} style={styles.row}>
          <View style={[styles.bullet, { backgroundColor: accent }]} />
          <Text variant="body" style={styles.flex}>
            {line}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.stat, { borderColor: withAlpha(color, 0.3), backgroundColor: withAlpha(color, 0.08) }]}>
      <Ionicons name={icon as Glyph} size={14} color={color} />
      <Text variant="heading" color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="label" muted style={styles.statLabel}>
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
    padding: SPACING.base,
  },
  sheet: {
    backgroundColor: COLORS.surfaceSolid,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  title: { marginTop: SPACING.xs },
  stats: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.base,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  statLabel: { fontSize: 9 },
  body: { marginTop: SPACING.base },
  section: { marginBottom: SPACING.lg, gap: SPACING.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
  relRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  flex: { flex: 1, lineHeight: 21 },
  btn: { marginTop: SPACING.sm },
});
