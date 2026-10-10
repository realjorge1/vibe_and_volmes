import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useIdentityStore } from '../store/identityStore';
import { getTrait } from '../data/identity/traits';
import { getDream } from '../data/identity/dreams';
import { getAesthetic, getPersona } from '../data/eras/eraStyles';
import { getScenario } from '../data/meta/scenarios';
import { getChallenge } from '../data/meta/challenges';
import { traitsFromTags } from '../systems/identity/traitTags';
import { chooseDream } from '../systems/identity/identityTick';
import { weeksLeft } from '../systems/identity/wantsEngine';
import { saveProgress } from '../systems/persistence';
import { ageAtWeek, lifeStageForAge } from '../systems/life/age';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Grid } from '../components/ui/Grid';
import { ListGroup } from '../components/ui/ListGroup';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { StatBar } from '../components/ui/StatBar';
import { PressableScale } from '../components/ui/PressableScale';
import { Orb3D } from '../components/fx/Orb3D';
import { Tile3D } from '../components/fx/Tile3D';
import { COLORS, RADIUS, SPACING, withAlpha } from '../constants/theme';
import type { WantOutcome } from '../types/identity';

type Glyph = keyof typeof Ionicons.glyphMap;

const OUTCOME: Record<WantOutcome, { label: string; color: string; icon: string }> = {
  met: { label: 'Fulfilled', color: COLORS.positive, icon: 'checkmark-circle' },
  missed: { label: 'Slipped away', color: COLORS.textMuted, icon: 'remove-circle' },
  'came-true': { label: 'Came true', color: COLORS.negative, icon: 'alert-circle' },
  faced: { label: 'Faced down', color: COLORS.accent, icon: 'shield-checkmark' },
};

/**
 * Who the artist is: their traits, the dream for this stretch of life, the
 * wants and fears in play, their eras, and a comeback if one is building.
 */
export default function YouModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const tags = useGameStore((s) => s.playerTags);
  const wants = useIdentityStore((s) => s.wants);
  const wantLog = useIdentityStore((s) => s.wantLog);
  const dream = useIdentityStore((s) => s.dream);
  const dreamOffer = useIdentityStore((s) => s.dreamOffer);
  const dreamLog = useIdentityStore((s) => s.dreamLog);
  const eras = useIdentityStore((s) => s.eras);
  const currentEraId = useIdentityStore((s) => s.currentEraId);
  const comeback = useIdentityStore((s) => s.comeback);
  const challenge = useIdentityStore((s) => s.challenge);
  const scenarioId = useIdentityStore((s) => s.scenarioId);
  if (!player) return null;

  const age = ageAtWeek(player.startAge, week);
  const stage = lifeStageForAge(age);
  const traits = traitsFromTags(tags)
    .map((id) => getTrait(id))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const era = eras.find((e) => e.id === currentEraId) ?? null;
  const pastEras = eras.filter((e) => e.id !== currentEraId).reverse();
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  const challengeDef = challenge ? getChallenge(challenge.id) : undefined;
  const dreamDef = dream ? getDream(dream.defId) : undefined;
  const fulfilled = dreamLog.filter((d) => d.fulfilled);

  const pick = (id: string) => {
    if (chooseDream(id)) saveProgress();
  };

  return (
    <Screen scroll tint={era?.color ?? '#FF7EBD'}>
      <ScreenHeader
        eyebrow="WHO YOU ARE"
        title={player.artistName}
        subtitle={`${age} · ${stage.label}${scenario && scenario.id !== 'classic' ? ` · ${scenario.label}` : ''}`}
        accent={era?.color ?? '#FF7EBD'}
        right={<Orb3D size={52} color={era?.color ?? '#FF7EBD'} icon="person" />}
      />

      {/* ─── The dream ─── */}
      {dreamOffer ? (
        <>
          <RuleLabel color={COLORS.gold}>CHOOSE YOUR DREAM</RuleLabel>
          <Text variant="caption" muted center style={styles.lead}>
            One big thing for this stretch of your life. It holds until it comes true or the years move on.
          </Text>
          {dreamOffer.options.map((id) => {
            const d = getDream(id);
            if (!d) return null;
            return (
              <Card key={id} accent={d.color} onPress={() => pick(id)}>
                <View style={styles.row}>
                  <Tile3D icon={d.icon} color={d.color} size={44} />
                  <View style={styles.flex}>
                    <Text variant="subheading">{d.label}</Text>
                    <Text variant="caption" muted style={styles.small}>
                      {d.blurb}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </View>
              </Card>
            );
          })}
        </>
      ) : dreamDef ? (
        <>
          <RuleLabel color={COLORS.gold}>THE DREAM</RuleLabel>
          <Card accent={dreamDef.color}>
            <View style={styles.row}>
              <Tile3D icon={dreamDef.icon} color={dreamDef.color} size={48} />
              <View style={styles.flex}>
                <Text variant="heading">{dreamDef.label}</Text>
                <Text variant="caption" muted style={styles.small}>
                  {dreamDef.blurb}
                </Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}
      {fulfilled.length > 0 ? (
        <Text variant="caption" color={COLORS.gold} center style={styles.small}>
          {`✦ Dreams come true: ${fulfilled.map((d) => d.label).join(' · ')}`}
        </Text>
      ) : null}

      {/* ─── Wants & fears ─── */}
      <RuleLabel color={COLORS.positive}>WANTS & FEARS</RuleLabel>
      {wants.length === 0 ? (
        <Text variant="caption" muted center>
          New ones arrive when the week turns.
        </Text>
      ) : (
        <ListGroup>
          {wants.map((w) => {
            const color = w.kind === 'fear' ? COLORS.negative : COLORS.positive;
            const left = weeksLeft(w, week);
            return (
              <View key={w.uid} style={styles.listRow}>
                <View style={[styles.dotIcon, { backgroundColor: withAlpha(color, 0.18) }]}>
                  <Ionicons name={w.icon as Glyph} size={15} color={color} />
                </View>
                <View style={styles.flex}>
                  <Text variant="label" color={color}>
                    {w.kind === 'fear' ? 'FEAR' : 'WANT'}
                  </Text>
                  <Text variant="body">{w.text}</Text>
                </View>
                <Text variant="caption" muted>
                  {left === 0 ? 'this week' : `${left} wk`}
                </Text>
              </View>
            );
          })}
        </ListGroup>
      )}
      {wantLog.length > 0 ? (
        <View style={styles.log}>
          {wantLog.slice(0, 5).map((w, i) => {
            const o = OUTCOME[w.outcome];
            return (
              <View key={`${w.week}-${i}`} style={styles.logRow}>
                <Ionicons name={o.icon as Glyph} size={13} color={o.color} />
                <Text variant="caption" muted style={styles.flex} numberOfLines={1}>
                  {w.text}
                </Text>
                <Text variant="caption" color={o.color}>
                  {o.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ─── Traits ─── */}
      <RuleLabel color={'#FF7EBD'}>{`TRAITS · ${traits.length}`}</RuleLabel>
      <Grid columns={2} gap={SPACING.sm}>
        {traits.map((t) => (
          <View key={t.id} style={[styles.trait, { borderColor: withAlpha(t.color, 0.35) }]}>
            <View style={styles.traitHead}>
              <Tile3D icon={t.icon} color={t.color} size={30} />
              <Text variant="subheading" color={t.color} style={styles.flex} numberOfLines={1}>
                {t.label}
              </Text>
            </View>
            <Text variant="caption" muted style={styles.small}>
              {t.blurb}
            </Text>
            <Text variant="caption" color={COLORS.textSecondary} style={styles.small}>
              {t.perks.join(' · ')}
            </Text>
          </View>
        ))}
      </Grid>
      {traits.length === 0 ? (
        <Text variant="caption" muted center>
          No traits yet. Live a little: they are earned.
        </Text>
      ) : null}

      {/* ─── Comeback ─── */}
      {comeback ? (
        <>
          <RuleLabel color={COLORS.positive}>THE COMEBACK</RuleLabel>
          <Card accent={COLORS.positive}>
            <Text variant="body">
              Your next release is the comeback record. The longer the wait, the bigger the hype, and the louder a flop.
            </Text>
            <View style={styles.bar}>
              <StatBar label="Hype" value={comeback.hype} color={COLORS.positive} />
            </View>
          </Card>
        </>
      ) : null}

      {/* ─── Eras ─── */}
      <RuleLabel color={era?.color ?? COLORS.primary}>ERAS</RuleLabel>
      {era ? (
        <Card accent={era.color}>
          <View style={styles.row}>
            <View style={[styles.swatch, { backgroundColor: era.color }]} />
            <View style={styles.flex}>
              <Text variant="heading">{`${era.name} era`}</Text>
              <Text variant="caption" muted style={styles.small}>
                {`${getAesthetic(era.aesthetic)?.label ?? era.aesthetic} · ${getPersona(era.persona).label} · since week ${era.startedWeek} · ${era.trackIds.length} song${era.trackIds.length === 1 ? '' : 's'}`}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Text variant="caption" muted center style={styles.lead}>
          No era yet. An era is a look, a color and a persona — and it moves your numbers.
        </Text>
      )}
      <Button label={era ? 'Start a new era' : 'Start your first era'} icon="color-palette" variant="secondary" onPress={() => router.push('/era-modal')} />
      {pastEras.length > 0 ? (
        <View style={styles.log}>
          {pastEras.map((e) => (
            <View key={e.id} style={styles.logRow}>
              <View style={[styles.miniSwatch, { backgroundColor: e.color }]} />
              <Text variant="caption" style={styles.flex}>
                {`${e.name} era`}
              </Text>
              <Text variant="caption" muted>
                {`weeks ${e.startedWeek}–${e.endedWeek ?? week} · ${e.peak ? `peak #${e.peak}` : 'no chart'}`}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ─── Challenge ─── */}
      {challengeDef && challenge ? (
        <>
          <RuleLabel color={challengeDef.color}>CHALLENGE</RuleLabel>
          <PressableScale onPress={() => router.push('/legacy-modal')}>
            <Card accent={challengeDef.color}>
              <Text variant="subheading">{challengeDef.title}</Text>
              {challengeDef.steps.map((step, i) => (
                <View key={step.label} style={styles.logRow}>
                  <Ionicons
                    name={challenge.done[i] ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={challenge.done[i] ? COLORS.positive : COLORS.textMuted}
                  />
                  <Text variant="caption" color={challenge.done[i] ? COLORS.text : COLORS.textSecondary}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </Card>
          </PressableScale>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lead: { marginBottom: SPACING.md },
  small: { marginTop: 3, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  dotIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  log: { marginTop: SPACING.md, gap: 6 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 4 },
  trait: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  traitHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  bar: { marginTop: SPACING.md },
  swatch: { width: 40, height: 40, borderRadius: 12 },
  miniSwatch: { width: 12, height: 12, borderRadius: 4 },
});
