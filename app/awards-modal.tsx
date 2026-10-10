import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AwardResult, Nomination } from '../types/calendar';
import { usePlayerStore } from '../store/playerStore';
import { useGameStore } from '../store/gameStore';
import { useCalendarStore } from '../store/calendarStore';
import {
  applyAwardResults,
  awardNightTonight,
  rollAwardNight,
  runAwardsCampaign,
} from '../systems/calendar/calendarTick';
import { campaignBonus } from '../systems/calendar/awardsEngine';
import { CALENDAR, weeksUntil } from '../systems/calendar/calendar';
import {
  giveSpeech,
  reactToLoss,
  walkRedCarpet,
  type CarpetLook,
  type LossReaction,
  type SpeechKind,
} from '../systems/calendar/awardNight';
import { saveProgress } from '../systems/persistence';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';
import { Grid } from '../components/ui/Grid';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { Orb3D } from '../components/fx/Orb3D';
import { Tile3D } from '../components/fx/Tile3D';
import { formatMoney } from '../utils/formatters';
import { COLORS, GRADIENTS, RADIUS, SPACING, withAlpha } from '../constants/theme';

const LOOKS: { id: CarpetLook; label: string; blurb: string; icon: string }[] = [
  { id: 'classic', label: 'Classic', blurb: 'Timeless. Safe.', icon: 'shirt' },
  { id: 'daring', label: 'Daring', blurb: 'Best dressed or a meme.', icon: 'flame' },
  { id: 'statement', label: 'Statement', blurb: 'Say something with it.', icon: 'megaphone' },
];

const SPEECHES: { id: SpeechKind; label: string }[] = [
  { id: 'fans', label: 'Thank the fans who found you first' },
  { id: 'family', label: 'Thank your family, by name' },
  { id: 'real', label: 'Put the paper away. Say something real.' },
  { id: 'rival', label: 'Thank everyone… and mention your rival' },
];

const REACTIONS: { id: LossReaction; label: string }[] = [
  { id: 'clap', label: 'Stand and clap' },
  { id: 'side-eye', label: 'Let the camera catch your face' },
  { id: 'storm', label: 'Walk up there and take the mic' },
];

/** Award season: the campaign before, and the night itself, envelope by envelope. */
export default function AwardsModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const week = useGameStore((s) => s.week);
  const awards = useCalendarStore((s) => s.awards);
  const [step, setStep] = useState(0); // 0 carpet, 1..n categories, n+1 done
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [lines, setLines] = useState<Record<string, string>>({});
  const [carpetLine, setCarpetLine] = useState<string | null>(null);
  if (!player) return null;

  if (!awards || awards.resolved) {
    return (
      <Screen scroll tint={COLORS.gold}>
        <ScreenHeader eyebrow="THE MERIDIANS" title="Award season" accent={COLORS.gold} right={<Orb3D size={52} color={COLORS.gold} icon="trophy" />} />
        <Text variant="body" muted center>
          {`Nominations are announced in week ${CALENDAR.nominations} of every year. ${weeksUntil(week, CALENDAR.nominations)} weeks to go.`}
        </Text>
      </Screen>
    );
  }

  const mine = awards.nominations.filter((n) => n.nominees.some((x) => x.isPlayer));
  const tonight = awardNightTonight();

  // ─── Before the night: the campaign ───
  if (!tonight) {
    const spends = [10_000, 50_000, 200_000].map((n) => Math.round(Math.min(n, Math.max(5_000, player.money * 0.25)) / 1000) * 1000);
    const unique = [...new Set(spends)];
    return (
      <Screen scroll tint={COLORS.gold}>
        <ScreenHeader
          eyebrow={awards.show.toUpperCase()}
          title={`${mine.length} nomination${mine.length === 1 ? '' : 's'}`}
          subtitle={`Award night is in ${weeksUntil(week, CALENDAR.awards)} week${weeksUntil(week, CALENDAR.awards) === 1 ? '' : 's'}.`}
          accent={COLORS.gold}
          right={<Orb3D size={52} color={COLORS.gold} icon="ribbon" />}
        />
        {mine.map((n) => (
          <NominationCard key={n.category} nom={n} />
        ))}
        <RuleLabel color={COLORS.gold}>FOR YOUR CONSIDERATION</RuleLabel>
        <Text variant="caption" muted center style={styles.lead}>
          {`Ads, screenings, dinners with voters. Spent so far: ${formatMoney(awards.campaign)} (+${campaignBonus(awards.campaign).toFixed(1)} with voters).`}
        </Text>
        <Grid columns={unique.length} gap={SPACING.sm}>
          {unique.map((amount) => (
            <Button
              key={amount}
              label={formatMoney(amount)}
              variant="secondary"
              disabled={player.money < amount}
              onPress={() => {
                if (runAwardsCampaign(amount)) saveProgress();
              }}
            />
          ))}
        </Grid>
      </Screen>
    );
  }

  // ─── The night ───
  const results = awards.results ?? [];
  const order: Nomination[] = [
    ...mine.filter((n) => n.category !== 'artist-of-the-year'),
    ...awards.nominations.filter((n) => n.category === 'artist-of-the-year'),
  ];
  const done = step > order.length;

  const finish = () => {
    applyAwardResults(true);
    saveProgress();
    router.back();
  };

  if (step === 0) {
    return (
      <Screen scroll tint={COLORS.gold}>
        <ScreenHeader eyebrow="TONIGHT" title={awards.show} subtitle="The red carpet first. Every camera is pointed at you." accent={COLORS.gold} right={<Orb3D size={52} color={COLORS.gold} icon="camera" />} />
        {carpetLine ? (
          <>
            <Card accent={COLORS.gold}>
              <Text variant="body">{carpetLine}</Text>
            </Card>
            <Button
              label="Go inside"
              icon="arrow-forward"
              variant="gold"
              size="lg"
              fullWidth
              onPress={() => {
                rollAwardNight();
                saveProgress();
                setStep(1);
              }}
            />
          </>
        ) : (
          <Grid columns={3} gap={SPACING.sm}>
            {LOOKS.map((l) => (
              <Card key={l.id} accent={COLORS.gold} onPress={() => setCarpetLine(walkRedCarpet(l.id))}>
                <View style={styles.center}>
                  <Tile3D icon={l.icon} color={COLORS.gold} size={44} />
                  <Text variant="subheading" center style={styles.small}>
                    {l.label}
                  </Text>
                  <Text variant="caption" muted center style={styles.small}>
                    {l.blurb}
                  </Text>
                </View>
              </Card>
            ))}
          </Grid>
        )}
      </Screen>
    );
  }

  if (done) {
    const wins = results.filter((r) => r.playerWon);
    return (
      <Screen scroll tint={COLORS.gold}>
        <ScreenHeader
          eyebrow="THE NIGHT IS OVER"
          title={wins.length > 0 ? `${wins.length} win${wins.length > 1 ? 's' : ''}` : 'No wins tonight'}
          accent={COLORS.gold}
          right={<Orb3D size={52} color={COLORS.gold} icon={wins.length > 0 ? 'trophy' : 'moon'} />}
        />
        {results
          .filter((r) => r.playerNominated || r.category === 'artist-of-the-year')
          .map((r) => (
            <View key={r.category} style={styles.resultRow}>
              <Ionicons name={r.playerWon ? 'trophy' : 'ellipse-outline'} size={16} color={r.playerWon ? COLORS.gold : COLORS.textMuted} />
              <Text variant="body" style={styles.flex}>
                {r.label}
              </Text>
              <Text variant="caption" color={r.playerWon ? COLORS.gold : COLORS.textSecondary}>
                {r.winner.name}
              </Text>
            </View>
          ))}
        <Button label="Back to the Deck" variant="gold" size="lg" fullWidth onPress={finish} style={styles.gap} />
      </Screen>
    );
  }

  const nom = order[step - 1];
  const result: AwardResult | undefined = results.find((r) => r.category === nom.category);
  const isOpen = !!opened[nom.category];
  const playerIn = nom.nominees.some((x) => x.isPlayer);
  const next = () => setStep(step + 1);

  return (
    <Screen scroll tint={COLORS.gold}>
      <ScreenHeader eyebrow={`${awards.show.toUpperCase()} · ${step} OF ${order.length}`} title={nom.label} accent={COLORS.gold} right={<Orb3D size={52} color={COLORS.gold} icon="trophy" />} />
      <Text variant="label" muted center>
        THE NOMINEES ARE
      </Text>
      <View style={styles.nominees}>
        {nom.nominees.map((n) => {
          const won = isOpen && result?.winner.name === n.name;
          return (
            <View
              key={n.name}
              style={[
                styles.nominee,
                n.isPlayer && { borderColor: withAlpha(COLORS.primary, 0.6) },
                won && { borderColor: COLORS.gold, backgroundColor: withAlpha(COLORS.gold, 0.16) },
              ]}
            >
              <Text variant="subheading" color={won ? COLORS.gold : n.isPlayer ? COLORS.text : COLORS.textSecondary}>
                {n.isPlayer ? `${n.name} (you)` : n.name}
              </Text>
              {n.work ? (
                <Text variant="caption" muted>
                  {`"${n.work}"`}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {!isOpen ? (
        <Button
          label="Open the envelope"
          icon="mail-open"
          variant="gold"
          size="lg"
          fullWidth
          onPress={() => setOpened({ ...opened, [nom.category]: true })}
        />
      ) : result ? (
        <>
          <View style={styles.winner}>
            <LinearGradient colors={result.playerWon ? GRADIENTS.gold : GRADIENTS.dark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text variant="label" center color={result.playerWon ? '#3A2600' : COLORS.textSecondary}>
              AND THE MERIDIAN GOES TO
            </Text>
            <Text variant="title" center color={result.playerWon ? '#2A1A00' : COLORS.text} style={styles.small}>
              {result.winner.isPlayer ? 'YOU.' : result.winner.name}
            </Text>
          </View>
          {lines[nom.category] ? (
            <>
              <Card>
                <Text variant="body">{lines[nom.category]}</Text>
              </Card>
              <Button label="Next" icon="arrow-forward" variant="gold" fullWidth onPress={next} />
            </>
          ) : result.playerWon ? (
            SPEECHES.map((s) => (
              <Button
                key={s.id}
                label={s.label}
                variant="secondary"
                fullWidth
                style={styles.gap}
                onPress={() => setLines({ ...lines, [nom.category]: giveSpeech(s.id, nom.label) })}
              />
            ))
          ) : playerIn ? (
            REACTIONS.map((r) => (
              <Button
                key={r.id}
                label={r.label}
                variant={r.id === 'storm' ? 'danger' : 'secondary'}
                fullWidth
                style={styles.gap}
                onPress={() => setLines({ ...lines, [nom.category]: reactToLoss(r.id, result.winner.name, nom.label) })}
              />
            ))
          ) : (
            <Button label="Next" icon="arrow-forward" variant="gold" fullWidth onPress={next} />
          )}
        </>
      ) : null}
    </Screen>
  );
}

function NominationCard({ nom }: { nom: Nomination }) {
  const me = nom.nominees.find((x) => x.isPlayer);
  return (
    <Card accent={COLORS.gold}>
      <Text variant="label" color={COLORS.gold}>
        {nom.label.toUpperCase()}
      </Text>
      {me?.work ? (
        <Text variant="subheading" style={styles.small}>
          {`"${me.work}"`}
        </Text>
      ) : null}
      <Text variant="caption" muted style={styles.small}>
        {`Against ${nom.nominees
          .filter((x) => !x.isPlayer)
          .map((x) => x.name)
          .join(', ')}`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  lead: { marginBottom: SPACING.md },
  small: { marginTop: 4, lineHeight: 18 },
  gap: { marginTop: SPACING.sm },
  nominees: { gap: SPACING.sm, marginVertical: SPACING.md },
  nominee: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    alignItems: 'center',
  },
  winner: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
});
