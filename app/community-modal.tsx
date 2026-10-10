import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Orb3D } from '../components/fx/Orb3D';
import { useCommunityStore } from '../store/communityStore';
import { refreshCommunity } from '../systems/community';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export default function CommunityModal() {
  const router = useRouter();
  const charts = useCommunityStore((s) => s.charts);
  const rank = useCommunityStore((s) => s.rank);
  const events = useCommunityStore((s) => s.events);

  // Always anonymous, always offline-safe — refresh on open.
  useEffect(() => {
    void refreshCommunity();
  }, []);

  return (
    <Screen scroll tint={COLORS.accent}>
      <ScreenHeader
        eyebrow="THE WORLD"
        title="Community"
        subtitle="Anonymous global standings. No accounts, no DMs — just the whole world chasing the same charts as you."
        accent={COLORS.accent}
        right={<Orb3D size={52} color={COLORS.accent} icon="earth" />}
      />

      {rank && (
        <Card accent={COLORS.gold}>
          <Text variant="label" color={COLORS.gold}>
            YOUR SEASON · {rank.seasonName.toUpperCase()}
          </Text>
          <View style={styles.rankRow}>
            <View>
              <Text variant="metric">{rank.tier}</Text>
              <Text variant="caption" muted>
                Top {(100 - rank.percentile).toFixed(1)}% of artists
              </Text>
            </View>
            <View style={styles.rankRight}>
              <Text variant="heading" color={COLORS.primary}>
                #{rank.position.toLocaleString()}
              </Text>
              <Text variant="caption" muted>
                of {rank.poolSize.toLocaleString()}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {events.length > 0 && (
        <View style={styles.section}>
          <Text variant="label" muted style={styles.sectionLabel}>
            ACTIVE COMMUNITY EVENTS
          </Text>
          {events.map((e) => (
            <Card key={e.id}>
              <Text variant="subheading">{e.name}</Text>
              <Text variant="caption" muted style={styles.evBlurb}>
                {e.blurb}
              </Text>
              <Text variant="caption" color={COLORS.tunetok}>
                {e.goalLabel}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text variant="label" muted style={styles.sectionLabel}>
          GLOBAL CHART
        </Text>
        <Card>
          {charts.length === 0 ? (
            <Text variant="caption" muted>
              Loading the global chart…
            </Text>
          ) : (
            charts.map((row) => (
              <View
                key={`${row.rank}-${row.artistName}`}
                style={[styles.chartRow, row.isPlayer && styles.playerRow]}
              >
                <Text
                  variant="subheading"
                  color={row.isPlayer ? COLORS.primary : COLORS.textMuted}
                  style={styles.rankNum}
                >
                  {row.rank}
                </Text>
                <View style={styles.flex}>
                  <Text variant="body" weight={row.isPlayer ? 'semibold' : 'regular'}>
                    {row.artistName}
                    {row.isPlayer ? ' · you' : ''}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {row.trackTitle}
                  </Text>
                </View>
                <Text variant="caption" color={COLORS.textSecondary}>
                  {row.streamsLabel}
                </Text>
              </View>
            ))
          )}
        </Card>
      </View>

      <Button
        label="Close"
        variant="outline"
        onPress={() => router.back()}
        style={styles.close}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: SPACING.sm,
  },
  rankRight: { alignItems: 'flex-end' },
  section: { marginTop: SPACING.lg },
  sectionLabel: { marginBottom: SPACING.sm },
  evBlurb: { marginTop: SPACING.xs, marginBottom: SPACING.xs, lineHeight: 18 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  playerRow: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
  },
  rankNum: { width: 28 },
  flex: { flex: 1 },
  close: { marginTop: SPACING.lg },
});
