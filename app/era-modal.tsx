import { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { EraPersona } from '../types/identity';
import { usePlayerStore } from '../store/playerStore';
import { ERA_AESTHETICS, ERA_COLORS, ERA_NAME_IDEAS, ERA_PERSONAS, eraRolloutCost } from '../data/eras/eraStyles';
import { canStartEra, startEra } from '../systems/identity/eraActions';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Grid } from '../components/ui/Grid';
import { RuleLabel } from '../components/ui/RuleLabel';
import { Text } from '../components/ui/Typography';
import { Button } from '../components/ui/Button';
import { PressableScale } from '../components/ui/PressableScale';
import { Orb3D } from '../components/fx/Orb3D';
import { Tile3D } from '../components/fx/Tile3D';
import { formatMoney } from '../utils/formatters';
import { COLORS, FONTS, RADIUS, SPACING, withAlpha } from '../constants/theme';

type Glyph = keyof typeof Ionicons.glyphMap;

function signed(n: number, unit = ''): string {
  return `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n)}${unit}`;
}

/** Design a new era: a name, a color, a look, a persona. */
export default function EraModal() {
  const router = useRouter();
  const player = usePlayerStore((s) => s.player);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(ERA_COLORS[0]);
  const [aesthetic, setAesthetic] = useState<string>(ERA_AESTHETICS[0].id);
  const [persona, setPersona] = useState<EraPersona>('sweetheart');
  const [error, setError] = useState<string | null>(null);
  if (!player) return null;

  const check = canStartEra();
  const cost = eraRolloutCost(player.stats.fans);
  const ideas = ERA_NAME_IDEAS.slice(0, 6);

  const go = () => {
    const res = startEra({ name, color, aesthetic, persona });
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    router.back();
  };

  return (
    <Screen scroll tint={color}>
      <ScreenHeader
        eyebrow="A NEW ERA"
        title={name.trim() ? `The ${name.trim()} era` : 'Name your era'}
        subtitle="A look, a color and a persona. The persona moves your numbers for as long as it lasts."
        accent={color}
        right={<Orb3D size={52} color={color} icon="color-palette" />}
      />

      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder="Velvet"
        placeholderTextColor={COLORS.textMuted}
        maxLength={28}
        style={[styles.input, { borderColor: withAlpha(color, 0.6) }]}
      />
      <View style={styles.ideas}>
        {ideas.map((idea) => (
          <PressableScale key={idea} onPress={() => setName(idea)} style={styles.idea}>
            <Text variant="caption" color={COLORS.textSecondary}>
              {idea}
            </Text>
          </PressableScale>
        ))}
      </View>

      <RuleLabel color={color}>COLOR</RuleLabel>
      <Grid columns={5} gap={SPACING.sm}>
        {ERA_COLORS.map((c) => (
          <PressableScale key={c} onPress={() => setColor(c)} style={styles.swatchWrap}>
            <View style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}>
              {color === c ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
            </View>
          </PressableScale>
        ))}
      </Grid>

      <RuleLabel color={color}>THE LOOK</RuleLabel>
      <Grid columns={2} gap={SPACING.sm}>
        {ERA_AESTHETICS.map((a) => {
          const on = aesthetic === a.id;
          return (
            <PressableScale
              key={a.id}
              onPress={() => setAesthetic(a.id)}
              style={[styles.option, on && { borderColor: color, backgroundColor: withAlpha(color, 0.12) }]}
            >
              <View style={styles.optionHead}>
                <Ionicons name={a.icon as Glyph} size={15} color={on ? color : COLORS.textSecondary} />
                <Text variant="subheading" color={on ? COLORS.text : COLORS.textSecondary}>
                  {a.label}
                </Text>
              </View>
              <Text variant="caption" muted style={styles.small}>
                {a.blurb}
              </Text>
            </PressableScale>
          );
        })}
      </Grid>

      <RuleLabel color={color}>THE PERSONA</RuleLabel>
      <Grid columns={2} gap={SPACING.sm}>
        {ERA_PERSONAS.map((p) => {
          const on = persona === p.id;
          const streams = Math.round((p.streamsMult - 1) * 100);
          return (
            <PressableScale
              key={p.id}
              onPress={() => setPersona(p.id)}
              style={[styles.option, on && { borderColor: color, backgroundColor: withAlpha(color, 0.12) }]}
            >
              <View style={styles.optionHead}>
                <Tile3D icon={p.icon} color={on ? color : COLORS.textMuted} size={28} />
                <Text variant="subheading" color={on ? COLORS.text : COLORS.textSecondary}>
                  {p.label}
                </Text>
              </View>
              <Text variant="caption" muted style={styles.small}>
                {p.blurb}
              </Text>
              <Text variant="label" color={on ? color : COLORS.textMuted} style={styles.small}>
                {`STREAMS ${signed(streams, '%')} · CRITICS ${signed(p.criticsBonus)}`}
              </Text>
            </PressableScale>
          );
        })}
      </Grid>

      <View style={styles.footer}>
        {check.ok && check.tooSoon ? (
          <Text variant="caption" color={COLORS.warning} center style={styles.warn}>
            Your last era only just started. A new one this soon will read as flailing (authenticity −5).
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" color={COLORS.negative} center style={styles.warn}>
            {error}
          </Text>
        ) : null}
        <Button
          label={check.ok ? `Start the era · ${formatMoney(cost)} rollout` : check.reason}
          icon="sparkles"
          variant="brand"
          size="lg"
          disabled={!check.ok || !name.trim()}
          onPress={go}
          fullWidth
        />
        <Text variant="caption" muted center style={styles.warn}>
          The first songs of a fresh era get a lift. An era that drags on past a couple of years goes stale.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 18,
    fontFamily: FONTS.families.body['600'],
    borderWidth: 1,
  },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm, justifyContent: 'center' },
  idea: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  swatchWrap: { alignItems: 'center' },
  swatch: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 2, borderColor: '#FFFFFF' },
  option: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 92,
  },
  optionHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  small: { marginTop: 4, lineHeight: 17 },
  footer: { marginTop: SPACING.xl, gap: SPACING.sm },
  warn: { lineHeight: 18 },
});
