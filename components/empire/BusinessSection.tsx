import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { useLabelStore } from '../../store/labelStore';
import { useTourStore } from '../../store/tourStore';
import { usePressStore } from '../../store/pressStore';
import { useCareerStore } from '../../store/careerStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Text } from '../ui/Typography';
import { Metric } from '../ui/Metric';
import { StatBar } from '../ui/StatBar';
import { SectionTitle } from '../ui/SectionTitle';
import { ListGroup } from '../ui/ListGroup';
import { Grid } from '../ui/Grid';
import { Tile3D } from '../fx/Tile3D';
import { Avatar } from '../phone/Avatar';
import { getLabel } from '../../data/industry/labels';
import { DEAL_KIND_LABEL } from '../../data/industry/contractTemplates';
import { TOUR_SCALES } from '../../data/tour/venues';
import { getControversy } from '../../data/pr/controversies';
import { strategiesFor } from '../../systems/pr/prEngine';
import { canTour } from '../../systems/tour/tourEngine';
import {
  playerRespondToControversy,
  playerSignOffer,
  playerDeclineOffer,
  playerStartTour,
} from '../../systems/simulation/playerActions';
import { getFameLevelNumber, formatMoney } from '../../utils/statHelpers';
import type { MentalState } from '../../types/industry';
import { COLORS, SPACING, RADIUS, withAlpha } from '../../constants/theme';

const PHASE_LABEL: Record<string, string> = {
  'come-up': 'The Come-Up',
  breakthrough: 'The Breakthrough',
  peak: 'The Peak',
  plateau: 'The Plateau',
  decline: 'The Decline',
  comeback: 'The Comeback',
  legacy: 'Legacy',
};

const MENTAL_AXES: { key: keyof MentalState; label: string }[] = [
  { key: 'burnout', label: 'Burnout' },
  { key: 'anxiety', label: 'Anxiety' },
  { key: 'paranoia', label: 'Paranoia' },
  { key: 'depression', label: 'Depression' },
  { key: 'addictionRisk', label: 'Addiction Risk' },
  { key: 'isolation', label: 'Isolation' },
];

function loadColor(v: number): string {
  if (v >= 70) return COLORS.negative;
  if (v >= 45) return COLORS.warning;
  return COLORS.positive;
}

/** Empire · Business — arc, wealth, label, tours, media, PR, mental, rivalries. */
export function BusinessSection() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const contract = useLabelStore((s) => s.contract);
  const offers = useLabelStore((s) => s.offers);
  const activeTour = useTourStore((s) => s.activeTour);
  const pendingInterview = usePressStore((s) => s.pendingInterview);
  const controversies = usePressStore((s) => s.controversies);
  const arc = useCareerStore((s) => s.arc);
  const mental = useCareerStore((s) => s.mental);
  const economy = useCareerStore((s) => s.economy);
  const rivals = useRivalryStore((s) => s.rivals);
  const knownArtists = useRelationshipStore((s) => s.knownArtists);

  const [msg, setMsg] = useState<string | null>(null);

  if (!player) return null;
  const fame = getFameLevelNumber(player.stats.fans);
  const activeControversies = controversies.filter((c) => !c.resolved);

  return (
    <View>
      {msg && (
        <Card accent={COLORS.warning}>
          <View style={styles.row}>
            <Ionicons name="megaphone" size={16} color={COLORS.warning} />
            <Text variant="body" style={styles.flex}>
              {msg}
            </Text>
          </View>
        </Card>
      )}

      {/* Arc + Wealth headline */}
      <Card accent={COLORS.gold}>
        <View style={styles.dualRow}>
          <Metric
            label="Career arc"
            value={PHASE_LABEL[arc.phase] ?? arc.phase}
          />
          <Metric
            label="Wealth"
            value={formatMoney(player.money)}
            color={COLORS.gold}
            align="right"
          />
        </View>
        <Text variant="caption" muted style={styles.sub}>
          Momentum {arc.momentum >= 0 ? '+' : ''}
          {Math.round(arc.momentum)} · Peak{' '}
          {arc.peakFans.toLocaleString('en-US')} fans
          {arc.comebackCount > 0 ? ` · ${arc.comebackCount} comeback(s)` : ''}
        </Text>
        <Text variant="caption" muted style={styles.sub}>
          Net worth {formatMoney(economy.netWorth)} · Lifestyle tier{' '}
          {economy.lifestyleTier} · Lifetime{' '}
          {formatMoney(economy.lifetimeEarnings)}
        </Text>
      </Card>

      {/* Label / Contract */}
      <SectionTitle accent={COLORS.primary}>Label & Contracts</SectionTitle>
      {contract ? (
        <Card accent={COLORS.primary}>
          <View style={styles.row}>
            <Tile3D icon="document-text" color={COLORS.primary} size={38} />
            <Text variant="subheading" style={styles.flex}>
              {getLabel(contract.labelId)?.name ?? 'Label'}
            </Text>
          </View>
          <Text variant="caption" muted style={styles.sub}>
            {DEAL_KIND_LABEL[contract.kind]} · {contract.terms.royaltyPct}%
            royalty · {contract.terms.creativeControl}% creative control
          </Text>
          <Text variant="caption" muted style={styles.sub}>
            Releases {contract.releasesDelivered}/
            {contract.terms.releaseQuota} · Unrecouped{' '}
            {formatMoney(contract.unrecoupedBalance)} · Trust{' '}
            {Math.round(contract.trust)}
          </Text>
        </Card>
      ) : offers.length === 0 ? (
        <Text variant="body" muted>
          You are independent. No offers on the table right now.
        </Text>
      ) : (
        offers.map((o) => {
          const label = getLabel(o.labelId);
          return (
            <Card key={o.id} accent={COLORS.primary}>
              <View style={styles.row}>
                <Tile3D icon="document-text" color={COLORS.primary} size={38} />
                <Text variant="subheading" style={styles.flex}>
                  {label?.name}
                </Text>
              </View>
              <Text variant="caption" muted style={styles.sub}>
                {DEAL_KIND_LABEL[o.kind]} · {o.terms.royaltyPct}% royalty ·{' '}
                {o.terms.durationWeeks}w · advance{' '}
                {formatMoney(o.terms.advance)}
              </Text>
              <Text variant="caption" muted style={styles.sub}>
                {o.terms.ownsMasters ? 'You keep masters' : 'Label owns masters'}{' '}
                · {o.terms.creativeControl}% creative control
              </Text>
              <Text variant="caption" style={styles.rationale}>
                “{o.rationale}”
              </Text>
              <View style={styles.row}>
                <Button
                  label="Sign"
                  icon="create"
                  onPress={() => {
                    playerSignOffer(o.id);
                    setMsg(`You signed with ${label?.name}.`);
                  }}
                  style={styles.flexBtn}
                />
                <Button
                  label="Pass"
                  variant="outline"
                  onPress={() => {
                    playerDeclineOffer(o.id);
                    setMsg('You passed on the offer.');
                  }}
                  style={styles.flexBtn}
                />
              </View>
            </Card>
          );
        })
      )}

      {/* Touring */}
      <SectionTitle accent={COLORS.accent}>Touring</SectionTitle>
      {activeTour ? (
        <Card accent={COLORS.accent}>
          <View style={styles.row}>
            <Tile3D icon="bus" color={COLORS.accent} size={38} />
            <Text variant="subheading" style={styles.flex}>
              {activeTour.name}
            </Text>
          </View>
          <Text variant="caption" muted style={styles.sub}>
            Stop {Math.min(activeTour.currentStopIndex + 1, activeTour.stops.length)}
            /{activeTour.stops.length} · Gross{' '}
            {formatMoney(activeTour.grossRevenue)}
          </Text>
          {activeTour.stops.map((s, i) => (
            <View key={i} style={styles.stop}>
              <Ionicons
                name={s.played ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={s.played ? COLORS.positive : COLORS.textMuted}
              />
              <Text variant="caption" color={s.played ? COLORS.text : COLORS.textSecondary} style={styles.flex}>
                {s.city} — wk {s.week}
                {s.played ? ` · ${s.ticketsSold.toLocaleString('en-US')} sold` : ''}
              </Text>
            </View>
          ))}
        </Card>
      ) : (
        <View>
          <Text variant="caption" muted style={styles.sub}>
            Book a tour. Bigger tours need more fame and cost more upfront.
          </Text>
          {TOUR_SCALES.map((t) => {
            const ok = canTour(t.scale, fame);
            return (
              <Button
                key={t.scale}
                label={`${t.label} (${t.stops} stops)`}
                icon={ok ? 'bus' : 'lock-closed'}
                variant={ok ? 'secondary' : 'outline'}
                disabled={!ok}
                onPress={() => {
                  if (playerStartTour(t.scale)) {
                    setMsg(`${t.label} booked. The road awaits.`);
                  }
                }}
                style={styles.tourBtn}
              />
            );
          })}
        </View>
      )}

      {/* Media */}
      {pendingInterview && (
        <>
          <SectionTitle accent={COLORS.warning}>Media</SectionTitle>
          <Card accent={COLORS.warning}>
            <Text variant="subheading">
              {pendingInterview.outletName} is waiting
            </Text>
            <Text variant="caption" muted style={styles.sub}>
              A {pendingInterview.outletKind} interview is booked. Every
              answer is a risk.
            </Text>
            <Button
              label="Do the Interview"
              icon="mic"
              onPress={() => router.push('/interview-modal')}
              style={styles.cardBtn}
            />
          </Card>
        </>
      )}

      {/* PR & Controversy */}
      <SectionTitle accent={COLORS.negative}>PR & Controversy</SectionTitle>
      {activeControversies.length === 0 ? (
        <Text variant="body" muted>
          No active controversies. Enjoy it while it lasts.
        </Text>
      ) : (
        activeControversies.map((c) => {
          const def = getControversy(c.defId);
          return (
            <Card key={c.instanceId} accent={COLORS.negative}>
              <View style={styles.row}>
                <Tile3D icon="flame" color={COLORS.negative} size={38} />
                <Text variant="subheading" style={styles.flex}>
                  {def?.headline}
                </Text>
              </View>
              <Text variant="caption" muted style={styles.sub}>
                {c.severity} · heat {Math.round(c.heat)} ·{' '}
                {c.strategyApplied ? 'response sent' : 'unaddressed'}
              </Text>
              {!c.strategyApplied && (
                <View style={styles.prGrid}>
                  {strategiesFor()
                    .filter((s) => s.available)
                    .slice(0, 4)
                    .map((s) => (
                      <Button
                        key={s.id}
                        label={
                          s.cost > 0
                            ? `${s.label} (${formatMoney(s.cost)})`
                            : s.label
                        }
                        variant="outline"
                        disabled={!s.affordable}
                        onPress={() => {
                          const m = playerRespondToControversy(
                            c.instanceId,
                            s.id
                          );
                          setMsg(m);
                        }}
                        style={styles.prBtn}
                      />
                    ))}
                </View>
              )}
            </Card>
          );
        })
      )}

      {/* Mental Health */}
      <SectionTitle accent={COLORS.positive}>Mental Health</SectionTitle>
      <Grid columns={2} gap={SPACING.base}>
        {MENTAL_AXES.map((a) => {
          const v = mental[a.key] as number;
          return (
            <StatBar key={a.key} label={a.label} value={v} color={loadColor(v)} />
          );
        })}
      </Grid>
      {mental.inTreatment && (
        <Text variant="caption" color={COLORS.positive} style={styles.sub}>
          In treatment — recovering faster.
        </Text>
      )}

      {/* Rivalries */}
      <SectionTitle accent={'#FF8A3D'}>Rivalries</SectionTitle>
      {Object.values(rivals).filter((r) => r.intensity > 5).length === 0 ? (
        <Text variant="body" muted>
          No active rivalries. For now.
        </Text>
      ) : (
        <ListGroup>
          {Object.values(rivals)
            .filter((r) => r.intensity > 5)
            .sort((a, b) => b.intensity - a.intensity)
            .map((r) => {
              const artist = knownArtists.find((a) => a.id === r.artistId);
              return (
                <View key={r.artistId} style={[styles.row, styles.listRow]}>
                  <Avatar id={`artist-${r.artistId}`} name={artist?.name ?? r.artistId} size={38} />
                  <View style={styles.flex}>
                    <Text variant="subheading">
                      {artist?.name ?? r.artistId}
                      {r.legendary ? ' ★' : ''}
                    </Text>
                    <Text variant="caption" muted>
                      {r.legendary ? 'Legendary feud' : 'Rivalry'} ·{' '}
                      {r.fans.toLocaleString('en-US')} fans
                    </Text>
                  </View>
                  <Text variant="metric" color={loadColor(r.intensity)}>
                    {Math.round(r.intensity)}
                  </Text>
                </View>
              );
            })}
        </ListGroup>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: SPACING.xs, lineHeight: 18 },
  dualRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rationale: { marginTop: SPACING.sm, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  listRow: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2 },
  flex: { flex: 1 },
  flexBtn: { flex: 1, marginTop: SPACING.md },
  cardBtn: { marginTop: SPACING.md },
  tourBtn: { marginTop: SPACING.sm },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: withAlpha(COLORS.accent, 0.06),
  },
  prGrid: { marginTop: SPACING.md, gap: SPACING.sm },
  prBtn: { marginTop: SPACING.xs },
});
