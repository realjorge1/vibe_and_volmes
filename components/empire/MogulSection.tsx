import { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../../store/playerStore';
import { useMogulStore } from '../../store/mogulStore';
import { useWorldStore } from '../../store/worldStore';
import { useProgressionStore } from '../../store/progressionStore';
import { VENTURES, getVenture, MAX_VENTURES } from '../../data/mogul/ventures';
import { ERA_COLORS } from '../../data/eras/eraStyles';
import {
  canStartLabel,
  LABEL_COST,
  LABEL_MIN_FANS,
  LABEL_MIN_LEVEL,
  MAX_ROSTER,
  potential,
  pushCost,
  signingCost,
  ventureSaleValue,
} from '../../systems/mogul/mogulEngine';
import {
  dropSignee,
  pushSignee,
  refreshScouting,
  scoutedNpcs,
  sellVenture,
  signArtist,
  startLabel,
  startVenture,
  type ActionResult,
} from '../../systems/mogul/mogulActions';
import { Card } from '../ui/Card';
import { Grid } from '../ui/Grid';
import { ListGroup } from '../ui/ListGroup';
import { RuleLabel } from '../ui/RuleLabel';
import { Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { StatBar } from '../ui/StatBar';
import { PressableScale } from '../ui/PressableScale';
import { Tile3D } from '../fx/Tile3D';
import { formatMoney } from '../../utils/formatters';
import { formatFanCount } from '../../utils/statHelpers';
import { COLORS, FONTS, RADIUS, SPACING, withAlpha } from '../../constants/theme';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

/** Empire · Mogul — your own label, its roster, and your businesses. */
export function MogulSection() {
  const player = usePlayerStore((s) => s.player);
  const level = useProgressionStore((s) => s.level);
  const label = useMogulStore((s) => s.label);
  const roster = useMogulStore((s) => s.roster);
  const ventures = useMogulStore((s) => s.ventures);
  useMogulStore((s) => s.scouting);
  const world = useWorldStore((s) => s.world);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(ERA_COLORS[3]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (label) refreshScouting();
  }, [label]);

  if (!player) return null;
  const say = (r: ActionResult) => setMsg(r.ok ? r.line : r.reason);
  const check = canStartLabel(player.stats.fans, level, player.money, !!label);
  const active = roster.filter((r) => r.status === 'active');
  const running = ventures.filter((v) => v.status === 'running');
  const scouts = label ? scoutedNpcs() : [];

  return (
    <View>
      {msg ? (
        <Card accent={COLORS.gold}>
          <Text variant="body">{msg}</Text>
        </Card>
      ) : null}

      {/* ─── The label ─── */}
      <RuleLabel color={COLORS.gold}>YOUR LABEL</RuleLabel>
      {!label ? (
        <Card accent={COLORS.gold}>
          <View style={styles.row}>
            <Tile3D icon="business" color={COLORS.gold} size={48} dim={!check.ok} />
            <View style={styles.flex}>
              <Text variant="heading">Start your own label</Text>
              <Text variant="caption" muted style={styles.small}>
                {`Sign artists from the world, push their records, keep a cut of everything they make. ${formatMoney(LABEL_COST)} to start; ${formatFanCount(LABEL_MIN_FANS)} fans or level ${LABEL_MIN_LEVEL}.`}
              </Text>
            </View>
          </View>
          {check.ok ? (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name your label"
                placeholderTextColor={COLORS.textMuted}
                maxLength={32}
                style={[styles.input, { borderColor: withAlpha(color, 0.6) }]}
              />
              <View style={styles.swatches}>
                {ERA_COLORS.slice(0, 6).map((c) => (
                  <PressableScale key={c} onPress={() => setColor(c)}>
                    <View style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]} />
                  </PressableScale>
                ))}
              </View>
              <Button label={`Found it · ${formatMoney(LABEL_COST)}`} icon="business" variant="gold" fullWidth disabled={!name.trim()} onPress={() => say(startLabel(name, color))} />
            </>
          ) : (
            <Text variant="caption" color={COLORS.warning} style={styles.small}>
              {check.reason}
            </Text>
          )}
        </Card>
      ) : (
        <Card accent={label.color}>
          <View style={styles.row}>
            <View style={[styles.logo, { backgroundColor: label.color }]}>
              <Text variant="subheading" color={COLORS.bg}>
                {initials(label.name)}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="heading">{label.name}</Text>
              <Text variant="caption" muted style={styles.small}>
                {`${active.length}/${MAX_ROSTER} artists · earned ${formatMoney(label.earned)}`}
              </Text>
            </View>
          </View>
          <View style={styles.bar}>
            <StatBar label="Industry standing" value={label.reputation} color={label.color} />
          </View>
        </Card>
      )}

      {label && active.length > 0 ? (
        <>
          <RuleLabel color={label.color}>ROSTER</RuleLabel>
          {active.map((s) => {
            const npc = world?.npcs[s.npcId];
            const cost = npc ? pushCost(npc) : 0;
            return (
              <Card key={s.npcId} accent={label.color}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { borderColor: label.color }]}>
                    <Text variant="caption" weight="bold">
                      {initials(s.name)}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text variant="subheading">{s.name}</Text>
                    <Text variant="caption" muted style={styles.small}>
                      {`${npc?.stage ?? s.lastStage} · ${formatFanCount(npc?.social.followers ?? 0)} followers · made you ${formatMoney(s.earned)}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.bar}>
                  <StatBar label="Loyalty" value={Math.max(0, (s.loyalty + 100) / 2)} color={s.loyalty >= 0 ? COLORS.positive : COLORS.negative} />
                </View>
                <Grid columns={2} gap={SPACING.sm}>
                  <Button label={`Push · ${formatMoney(cost)}`} variant="secondary" disabled={player.money < cost} onPress={() => say(pushSignee(s.npcId))} />
                  <Button label="Drop" variant="ghost" onPress={() => say(dropSignee(s.npcId))} />
                </Grid>
              </Card>
            );
          })}
        </>
      ) : null}

      {label ? (
        <>
          <RuleLabel color={COLORS.accent}>SCOUTING</RuleLabel>
          {scouts.length === 0 ? (
            <Text variant="caption" muted center>
              Nobody new this month. Scouts report back every few weeks.
            </Text>
          ) : (
            <ListGroup>
              {scouts.map((n) => {
                const cost = signingCost(n);
                return (
                  <View key={n.id} style={styles.listRow}>
                    <View style={styles.flex}>
                      <Text variant="body" weight="semibold">
                        {n.name}
                      </Text>
                      <Text variant="caption" muted>
                        {`${n.stage} · ${formatFanCount(n.social.followers)} followers · potential ${potential(n)}`}
                      </Text>
                    </View>
                    <Button
                      label={`Sign · ${formatMoney(cost)}`}
                      variant="secondary"
                      disabled={player.money < cost || active.length >= MAX_ROSTER}
                      onPress={() => say(signArtist(n.id))}
                    />
                  </View>
                );
              })}
            </ListGroup>
          )}
        </>
      ) : null}

      {/* ─── Businesses ─── */}
      <RuleLabel color={COLORS.positive}>{`BUSINESSES · ${running.length}/${MAX_VENTURES}`}</RuleLabel>
      {running.map((v) => {
        const def = getVenture(v.defId);
        if (!def) return null;
        return (
          <Card key={v.id} accent={def.color}>
            <View style={styles.row}>
              <Tile3D icon={def.icon} color={def.color} size={40} />
              <View style={styles.flex}>
                <Text variant="subheading">{def.label}</Text>
                <Text variant="caption" color={v.lastNet >= 0 ? COLORS.positive : COLORS.negative} style={styles.small}>
                  {`${v.lastNet >= 0 ? '+' : '−'}${formatMoney(Math.abs(v.lastNet))} last week · lifetime ${formatMoney(v.lifetimeNet)}`}
                </Text>
              </View>
              <Button label={`Sell · ${formatMoney(ventureSaleValue(v))}`} variant="ghost" onPress={() => say(sellVenture(v.id))} />
            </View>
            <View style={styles.bar}>
              <StatBar label="Health" value={v.health} color={v.health >= 50 ? COLORS.positive : v.health >= 25 ? COLORS.warning : COLORS.negative} />
            </View>
          </Card>
        );
      })}
      <Grid columns={3} gap={SPACING.sm}>
        {VENTURES.filter((d) => !running.some((v) => v.defId === d.id)).map((d) => {
          const locked = player.stats.fans < d.minFans || level < d.minLevel;
          return (
            <PressableScale
              key={d.id}
              onPress={() => (locked ? setMsg(`${d.label}: ${formatFanCount(d.minFans)} fans and level ${d.minLevel}.`) : say(startVenture(d.id)))}
              style={styles.venture}
            >
              <Tile3D icon={locked ? 'lock-closed' : d.icon} color={d.color} size={42} dim={locked || player.money < d.cost} />
              <Text variant="caption" weight="semibold" center numberOfLines={2} color={locked ? COLORS.textMuted : COLORS.text}>
                {d.label}
              </Text>
              <Text variant="label" muted center>
                {formatMoney(d.cost)}
              </Text>
            </PressableScale>
          );
        })}
      </Grid>
      {running.length === 0 ? (
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
          <Text variant="caption" muted style={styles.flex}>
            A business pays every week while it’s healthy. Its health leans on one of your stats and on how famous you are.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  small: { marginTop: 3, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  bar: { marginTop: SPACING.md },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.families.body['600'],
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  swatches: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginVertical: SPACING.md },
  swatch: { width: 32, height: 32, borderRadius: 10 },
  swatchOn: { borderWidth: 2, borderColor: '#FFFFFF' },
  logo: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  venture: { alignItems: 'center', gap: 4, paddingVertical: SPACING.sm },
  hint: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
});
