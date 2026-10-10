import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../../store/musicStore';
import { useShowStore } from '../../store/showStore';
import { useGameStore } from '../../store/gameStore';
import { useLabelStore } from '../../store/labelStore';
import { useIdentityStore } from '../../store/identityStore';
import { usePlayerStore } from '../../store/playerStore';
import { getLabel } from '../../data/industry/labels';
import { bookGig, canBookGig, showsTonight } from '../../systems/show/showActions';
import { announceComeback, canAnnounceComeback } from '../../systems/career/comeback';
import { buyBackMasters, canRerecord, rerecord } from '../../systems/music/mastersActions';
import { buybackPrice, heldMasters, trackRoyalty, weeklyRoyalties } from '../../systems/music/royalties';
import { canStartEra } from '../../systems/identity/eraActions';
import { saveProgress } from '../../systems/persistence';
import { Grid } from '../ui/Grid';
import { ListGroup } from '../ui/ListGroup';
import { RuleLabel } from '../ui/RuleLabel';
import { Text } from '../ui/Typography';
import { Button } from '../ui/Button';
import { PressableScale } from '../ui/PressableScale';
import { Tile3D } from '../fx/Tile3D';
import { formatMoney } from '../../utils/formatters';
import { formatStreams } from '../../utils/statHelpers';
import { COLORS, RADIUS, SPACING, withAlpha } from '../../constants/theme';

/** One key in the studio's "more" grid: an icon, a name, a status line. */
function Key({
  icon,
  color,
  label,
  sub,
  dim,
  onPress,
}: {
  icon: string;
  color: string;
  label: string;
  sub: string;
  dim?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.93} style={styles.key}>
      <Tile3D icon={icon} color={color} size={46} dim={dim} />
      <Text variant="caption" weight="semibold" center numberOfLines={1} color={dim ? COLORS.textMuted : COLORS.text}>
        {label}
      </Text>
      <Text variant="label" muted center numberOfLines={2} style={styles.keySub}>
        {sub}
      </Text>
    </PressableScale>
  );
}

/**
 * Everything around the songs: live shows, the chart, eras, the comeback,
 * and the catalog — who owns what, what it pays, and taking it back.
 */
export function StudioExtras({ inJail }: { inJail: boolean }) {
  const router = useRouter();
  const week = useGameStore((s) => s.week);
  const discography = useMusicStore((s) => s.discography);
  const gig = useShowStore((s) => s.gig);
  const comeback = useIdentityStore((s) => s.comeback);
  const contract = useLabelStore((s) => s.contract);
  usePlayerStore((s) => s.player?.money);
  const [message, setMessage] = useState<string | null>(null);

  const tonight = showsTonight();
  const gigCheck = canBookGig();
  const comebackCheck = canAnnounceComeback();
  const eraCheck = canStartEra();
  const statement = weeklyRoyalties(discography);
  const held = heldMasters(discography);
  const price = buybackPrice(discography);
  const signedToOwner = contract && contract.status === 'active' && held.some((t) => t.ownerLabelId === contract.labelId);

  const live = () => {
    if (tonight.length > 0) {
      router.push({ pathname: '/show-modal', params: { key: tonight[0].key } });
      return;
    }
    const r = bookGig();
    if (!r.ok) {
      setMessage(r.reason);
      return;
    }
    const booked = useShowStore.getState().gig;
    if (booked) router.push({ pathname: '/show-modal', params: { key: `gig:${booked.week}` } });
  };

  const comebackPress = () => {
    if (comeback) {
      setMessage(`Comeback hype: ${Math.round(comeback.hype)}%. Your next release is the one.`);
      return;
    }
    if (!comebackCheck.ok) {
      setMessage(comebackCheck.reason);
      return;
    }
    if (announceComeback()) {
      saveProgress();
      setMessage('Announced. Every week you wait, the hype builds.');
    }
  };

  const doRerecord = (id: string) => {
    const r = rerecord(id);
    setMessage(r.ok ? `"${r.title}" is out, and it's yours.` : r.reason);
  };

  const doBuyBack = () => {
    if (buyBackMasters()) {
      saveProgress();
      setMessage('Every master is yours again.');
    } else setMessage(`You need ${formatMoney(price)}.`);
  };

  return (
    <View>
      <RuleLabel>MORE</RuleLabel>
      <Grid columns={4} gap={SPACING.sm}>
        <Key
          icon="mic"
          color={COLORS.accent}
          label={tonight.length > 0 ? 'Play tonight' : 'Book a gig'}
          sub={tonight.length > 0 ? tonight[0].name : gig && gig.week === week ? 'Played this week' : gigCheck.ok ? 'A club show, tonight' : gigCheck.reason}
          dim={tonight.length === 0 && !gigCheck.ok}
          onPress={live}
        />
        <Key icon="stats-chart" color={COLORS.primary} label="Charts" sub="The Hot 50" onPress={() => router.push('/chart-modal')} />
        <Key
          icon="color-palette"
          color={COLORS.secondary}
          label="New era"
          sub={eraCheck.ok ? 'Reinvent' : eraCheck.reason}
          dim={!eraCheck.ok}
          onPress={() => router.push('/era-modal')}
        />
        <Key
          icon="refresh-circle"
          color={COLORS.positive}
          label="Comeback"
          sub={comeback ? `Hype ${Math.round(comeback.hype)}%` : comebackCheck.ok ? 'Announce it' : 'Not yet'}
          dim={!comeback && !comebackCheck.ok}
          onPress={comebackPress}
        />
      </Grid>
      {message ? (
        <Text variant="caption" color={COLORS.warning} center style={styles.message}>
          {message}
        </Text>
      ) : null}
      {inJail ? (
        <Text variant="caption" muted center style={styles.message}>
          Inside, the only studio is a prison phone (Life · Inside).
        </Text>
      ) : null}

      {discography.length > 0 ? (
        <>
          <RuleLabel color={COLORS.gold}>CATALOG & MASTERS</RuleLabel>
          <View style={styles.royalties}>
            <View style={styles.flex}>
              <Text variant="label" muted>
                THIS WEEK YOUR SONGS PAID YOU
              </Text>
              <Text variant="heading" color={COLORS.gold}>
                {formatMoney(statement.total)}
              </Text>
            </View>
            <View style={styles.right}>
              <Text variant="caption" muted>
                {`${formatStreams(statement.streams)} streams`}
              </Text>
              {statement.withheld > 0 ? (
                <Text variant="caption" color={COLORS.negative}>
                  {`${formatMoney(statement.withheld)} went to owners`}
                </Text>
              ) : null}
            </View>
          </View>
          {held.length > 0 ? (
            <>
              <ListGroup>
                {held.map((t) => {
                  const check = canRerecord(t);
                  const owner = t.owner === 'vault' ? 'Vault Capital' : getLabel(t.ownerLabelId ?? '')?.name ?? 'Your old label';
                  return (
                    <View key={t.id} style={styles.row}>
                      <Ionicons name="lock-closed" size={15} color={COLORS.negative} />
                      <View style={styles.flex}>
                        <Text variant="body" weight="semibold" numberOfLines={1}>
                          {t.title}
                        </Text>
                        <Text variant="caption" muted numberOfLines={1}>
                          {`Owned by ${owner} · you keep ${Math.round((t.royaltyShare ?? 0) * 100)}% · ${formatMoney(trackRoyalty(t))}/wk`}
                        </Text>
                      </View>
                      <Button
                        label="Re-record"
                        variant="secondary"
                        disabled={!check.ok || inJail}
                        onPress={() => doRerecord(t.id)}
                      />
                    </View>
                  );
                })}
              </ListGroup>
              <Text variant="caption" muted center style={styles.message}>
                {signedToOwner
                  ? 'You can’t re-record songs while you’re still signed to the label that owns them.'
                  : `Re-record a song and fans move to "(Your Version)". Or buy them all back: ${formatMoney(price)}.`}
              </Text>
              {!signedToOwner ? (
                <Button label={`Buy back every master · ${formatMoney(price)}`} icon="key" variant="gold" fullWidth onPress={doBuyBack} />
              ) : null}
            </>
          ) : (
            <Text variant="caption" muted center>
              You own every song you’ve released.
            </Text>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  key: { alignItems: 'center', gap: 4 },
  keySub: { fontSize: 8.5, lineHeight: 11 },
  message: { marginTop: SPACING.sm, lineHeight: 18 },
  royalties: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: withAlpha(COLORS.gold, 0.3),
    backgroundColor: withAlpha(COLORS.gold, 0.06),
    marginBottom: SPACING.sm,
  },
  right: { alignItems: 'flex-end', gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
});
