import { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReleaseReception } from '../../types/music';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useAudioStore } from '../../store/audioStore';
import { releasePulse } from '../../systems/music/releaseCurve';
import { releaseQuickTrack } from '../../systems/music/quickRelease';
import { useLegalStore } from '../../store/legalStore';
import { StudioExtras } from '../../components/studio/StudioExtras';
import { usePremiumStore } from '../../store/premiumStore';
import { getCosmetic } from '../../data/premium/catalog';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Text } from '../../components/ui/Typography';
import { ListGroup } from '../../components/ui/ListGroup';
import { RuleLabel } from '../../components/ui/RuleLabel';
import { PressableScale } from '../../components/ui/PressableScale';
import { CoverArt } from '../../components/audio/CoverArt';
import { Vinyl3D } from '../../components/fx/Vinyl3D';
import { Orb3D } from '../../components/fx/Orb3D';
import { Tile3D } from '../../components/fx/Tile3D';
import { RingGauge } from '../../components/fx/RingGauge';
import { formatStreams } from '../../utils/statHelpers';
import { ordinal } from '../../utils/formatters';
import { COLORS, GRADIENTS, RADIUS, SPACING, shade, ifAnimated, withAlpha } from '../../constants/theme';

const QUICK_ENERGY_COST = 25;

const RECEPTION_COLOR: Record<ReleaseReception, string> = {
  flop: COLORS.negative,
  mixed: COLORS.warning,
  solid: COLORS.accent,
  hit: COLORS.primary,
  smash: COLORS.secondary,
  viral: COLORS.gold,
};

const STEPS = [
  { icon: 'musical-notes', label: 'Beat' },
  { icon: 'create', label: 'Lyrics' },
  { icon: 'mic', label: 'Record' },
  { icon: 'options', label: 'Mix' },
  { icon: 'rocket', label: 'Drop' },
] as const;
const STEP_COLOR = '#6C6894';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '♪';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function Studio() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const discography = useMusicStore((s) => s.discography);
  const lastRelease = useMusicStore((s) => s.lastRelease);
  const producedSongs = useAudioStore((s) => s.producedSongs);
  const startDraft = useAudioStore((s) => s.startDraft);
  const activeTheme = usePremiumStore((s) => s.activeTheme);
  const [busy, setBusy] = useState(false);
  const inJail = useLegalStore((s) => s.activeCase?.stage === 'jailed');

  if (!player) return null;

  // Premium studio theme is a pure recolor of the studio accent — cosmetic only.
  const theme = getCosmetic(activeTheme ?? '')?.themeColor;
  const themeColor = theme ?? COLORS.secondary;
  const labelColors = theme
    ? [shade(theme, 0.45), theme, shade(theme, -0.35)]
    : GRADIENTS.brand;
  const canQuick = player.stats.energy >= QUICK_ENERGY_COST;

  const createSong = () => {
    if (inJail) return;
    startDraft();
    router.push('/(create)/beat');
  };

  const quickDrop = () => {
    if (!canQuick || busy || inJail) return;
    setBusy(true);
    // Quick drop has no beat/marketing/collab, but still charts on the live
    // world factors (trend, label backing, reputation) — and goes through the
    // same release hooks as everything else (traits, era, masters, comeback).
    const result = releaseQuickTrack();
    if (result) {
      usePlayerStore.getState().updateStats([{ stat: 'energy', delta: -QUICK_ENERGY_COST }]);
      usePlayerStore.getState().save();
    }
    setBusy(false);
  };

  const recColor = lastRelease ? RECEPTION_COLOR[lastRelease.reception] ?? COLORS.primary : COLORS.primary;
  // The card follows the song as it lives on: numbers grow week by week.
  const liveTrack = lastRelease
    ? discography.find((t) => t.id === lastRelease.track.id) ?? lastRelease.track
    : null;
  const pulse = liveTrack ? releasePulse(liveTrack, week) : null;
  const vinylSize = Math.min(220, width - 140);

  return (
    <Screen scroll>
      <ScreenHeader
        eyebrow="RECORDING STUDIO"
        title="The Studio"
        accent={themeColor}
        right={<Orb3D size={48} color={themeColor} icon="mic" />}
      />

      <Card accent={themeColor} style={styles.hero}>
        {/* The deck only turns while something plays, and nothing plays here. */}
        <View style={styles.stage}>
          <Vinyl3D size={vinylSize} label={initials(player.artistName)} colors={labelColors} spinning={false} />
        </View>
        <Text variant="title" center>
          Make a real song
        </Text>
        <Text variant="caption" muted center style={styles.sub}>
          Pick a beat, write lyrics, record your vocals, mix it, and drop it into the world.
        </Text>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s.label} style={styles.step}>
              <Tile3D icon={s.icon} color={i === 0 ? themeColor : STEP_COLOR} size={34} />
              <Text variant="label" color={COLORS.textMuted} style={styles.stepLabel}>
                {s.label.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <Button
          label={inJail ? 'Locked up: no studio inside' : 'Start a song'}
          icon={inJail ? 'lock-closed' : 'add-circle'}
          variant="brand"
          size="lg"
          disabled={inJail}
          onPress={createSong}
          style={styles.btn}
        />
      </Card>

      <View style={styles.quick}>
        <Tile3D icon="flash" color={COLORS.warning} dim={!canQuick} size={42} />
        <View style={styles.flex}>
          <Text variant="subheading">Quick drop a single</Text>
          <Text variant="caption" muted numberOfLines={1}>
            {canQuick ? `Skip the booth · −${QUICK_ENERGY_COST} energy` : 'Too drained. Rest first.'}
          </Text>
        </View>
        <PressableScale
          onPress={quickDrop}
          disabled={!canQuick || busy}
          style={[styles.quickBtn, !canQuick && styles.quickBtnOff]}
        >
          <Text variant="caption" weight="bold" color={canQuick ? COLORS.text : COLORS.textMuted}>
            Drop
          </Text>
          <Ionicons name="paper-plane" size={13} color={canQuick ? COLORS.warning : COLORS.textMuted} />
        </PressableScale>
      </View>

      {lastRelease && liveTrack && (
        <Animated.View entering={ifAnimated(FadeInDown.springify().damping(15))}>
          <Card accent={recColor}>
            <View style={styles.row}>
              <CoverArt coverArtId={null} title={lastRelease.track.title} size={56} />
              <View style={styles.flex}>
                <Text variant="label" muted>
                  LATEST RELEASE
                </Text>
                <Text variant="heading" numberOfLines={2} style={styles.releaseTitle}>
                  &quot;{lastRelease.track.title}&quot;
                </Text>
              </View>
              <Badge label={lastRelease.reception} color={recColor} filled />
            </View>
            <Text variant="caption" muted style={styles.msg}>
              {lastRelease.message}
            </Text>
            {pulse ? (
              <Text variant="caption" color={recColor} style={styles.pulse}>
                {pulse}
              </Text>
            ) : null}
            <View style={styles.stats}>
              <Stat icon="star" label="Critics" value={`${lastRelease.criticsScore}`} color={COLORS.secondary} />
              <Stat icon="play" label="Streams" value={formatStreams(liveTrack.totalStreams)} color={COLORS.accent} />
              <Stat
                icon="podium"
                label="Peak"
                value={liveTrack.peakChartPosition ? ordinal(liveTrack.peakChartPosition) : '—'}
                color={COLORS.gold}
              />
              <Stat
                icon="people"
                label="Fans won"
                value={formatStreams(liveTrack.fansEarned ?? lastRelease.fansGained)}
                color={COLORS.positive}
              />
            </View>
          </Card>
        </Animated.View>
      )}

      <StudioExtras inJail={inJail} />

      {producedSongs.length > 0 && (
        <>
          <RuleLabel>{`YOUR SONGS · ${producedSongs.length}`}</RuleLabel>
          <ListGroup>
            {producedSongs.map((s) => (
              <View key={s.id} style={styles.songRow}>
                <CoverArt coverArtId={s.coverArtId} title={s.title} size={46} />
                <View style={styles.flex}>
                  <Text variant="subheading" numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    Wk {s.releasedAtWeek} · {s.emotionalTone}
                    {s.exported ? ' · exported' : ''}
                  </Text>
                </View>
                <View style={styles.songScore}>
                  <RingGauge progress={s.score.overall / 100} size={38} stroke={3} color={COLORS.gold}>
                    <Text variant="caption" weight="bold" color={COLORS.gold} style={styles.scoreNum}>
                      {s.score.overall}
                    </Text>
                  </RingGauge>
                  <Text variant="label" muted style={styles.verdict} numberOfLines={1}>
                    {s.score.verdict}
                  </Text>
                </View>
              </View>
            ))}
          </ListGroup>
        </>
      )}

      {discography.length === 0 && producedSongs.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="disc-outline" size={26} color={COLORS.textMuted} />
          <Text variant="caption" muted center>
            You haven&apos;t released anything yet. The world is waiting.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={13} color={color} />
      <Text variant="subheading" style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="label" muted style={styles.statLabel}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: SPACING.xs },
  stage: { alignItems: 'center', marginBottom: SPACING.xs },
  row: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  flex: { flex: 1 },
  sub: { marginTop: SPACING.xs, lineHeight: 18, paddingHorizontal: SPACING.sm },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.base,
    paddingHorizontal: SPACING.xs,
  },
  step: { alignItems: 'center', gap: 6 },
  stepLabel: { fontSize: 8.5, letterSpacing: 1 },
  btn: { marginTop: SPACING.base },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.warning, 0.5),
    backgroundColor: withAlpha(COLORS.warning, 0.12),
  },
  quickBtnOff: { borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  releaseTitle: { marginTop: 2 },
  msg: { marginTop: SPACING.md, lineHeight: 19 },
  pulse: { marginTop: SPACING.xs, lineHeight: 18 },
  stats: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 14 },
  statLabel: { fontSize: 8.5, letterSpacing: 1 },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  songScore: { alignItems: 'center', gap: 3, width: 64 },
  scoreNum: { fontSize: 12 },
  verdict: { fontSize: 8, letterSpacing: 0.6 },
  empty: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xl },
});
