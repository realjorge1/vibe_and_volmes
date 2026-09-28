import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
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
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

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

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
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
          <Text variant="caption">{msg}</Text>
        </Card>
      )}

      {/* Arc + Wealth headline */}
      <Card>
        <View style={styles.dualRow}>
          <Metric
            label="Career arc"
            value={PHASE_LABEL[arc.phase] ?? arc.phase}
          />
          <Metric
            label="Wealth"
            value={formatMoney(player.money)}
            color={COLORS.primary}
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
      <Text variant="heading" style={styles.section}>
        Label & Contracts
      </Text>
      {contract ? (
        <Card>
          <Text variant="subheading">
            {getLabel(contract.labelId)?.name ?? 'Label'}
          </Text>
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
              <Text variant="subheading">{label?.name}</Text>
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
      <Text variant="heading" style={styles.section}>
        Touring
      </Text>
      {activeTour ? (
        <Card accent={COLORS.primary}>
          <Text variant="subheading">{activeTour.name}</Text>
          <Text variant="caption" muted style={styles.sub}>
            Stop {Math.min(activeTour.currentStopIndex + 1, activeTour.stops.length)}
            /{activeTour.stops.length} · Gross{' '}
            {formatMoney(activeTour.grossRevenue)}
          </Text>
          {activeTour.stops.map((s, i) => (
            <Text key={i} variant="caption" muted style={styles.stopLine}>
              {s.played ? '✓' : '•'} {s.city} — wk {s.week}
              {s.played ? ` · ${s.ticketsSold.toLocaleString('en-US')} sold` : ''}
            </Text>
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
          <Text variant="heading" style={styles.section}>
            Media
          </Text>
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
              onPress={() => router.push('/interview-modal')}
              style={styles.cardBtn}
            />
          </Card>
        </>
      )}

      {/* PR & Controversy */}
      <Text variant="heading" style={styles.section}>
        PR & Controversy
      </Text>
      {activeControversies.length === 0 ? (
        <Text variant="body" muted>
          No active controversies. Enjoy it while it lasts.
        </Text>
      ) : (
        activeControversies.map((c) => {
          const def = getControversy(c.defId);
          return (
            <Card key={c.instanceId} accent={COLORS.negative}>
              <Text variant="subheading">{def?.headline}</Text>
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
      <Text variant="heading" style={styles.section}>
        Mental Health
      </Text>
      <Card>
        {MENTAL_AXES.map((a) => {
          const v = mental[a.key] as number;
          return (
            <View key={a.key} style={styles.mentalRow}>
              <Text variant="caption" muted style={styles.mentalLabel}>
                {a.label}
              </Text>
              <Bar value={v} color={loadColor(v)} />
            </View>
          );
        })}
        {mental.inTreatment && (
          <Text variant="caption" color={COLORS.positive} style={styles.sub}>
            In treatment — recovering faster.
          </Text>
        )}
      </Card>

      {/* Rivalries */}
      <Text variant="heading" style={styles.section}>
        Rivalries
      </Text>
      {Object.values(rivals).filter((r) => r.intensity > 5).length === 0 ? (
        <Text variant="body" muted>
          No active rivalries. For now.
        </Text>
      ) : (
        Object.values(rivals)
          .filter((r) => r.intensity > 5)
          .sort((a, b) => b.intensity - a.intensity)
          .map((r) => {
            const artist = knownArtists.find((a) => a.id === r.artistId);
            return (
              <Card key={r.artistId} accent={COLORS.primary}>
                <View style={styles.row}>
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
              </Card>
            );
          })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  sub: { marginTop: SPACING.xs, lineHeight: 18 },
  dualRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rationale: { marginTop: SPACING.sm, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  flex: { flex: 1 },
  flexBtn: { flex: 1, marginTop: SPACING.md },
  cardBtn: { marginTop: SPACING.md },
  tourBtn: { marginTop: SPACING.sm },
  stopLine: { marginTop: SPACING.xs },
  prGrid: { marginTop: SPACING.md, gap: SPACING.sm },
  prBtn: { marginTop: SPACING.xs },
  mentalRow: { marginBottom: SPACING.md },
  mentalLabel: { marginBottom: SPACING.xs },
  barTrack: {
    height: 4,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface3,
    overflow: 'hidden',
  },
  barFill: { height: 4, borderRadius: RADIUS.sm },
});
