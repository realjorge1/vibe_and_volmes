import { View, StyleSheet } from 'react-native';
import { useDramaStore } from '../../store/dramaStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import type { BeefWar, MomentKind } from '../../types/drama';
import { Text } from '../ui/Typography';
import { SectionTitle } from '../ui/SectionTitle';
import { ListGroup } from '../ui/ListGroup';
import { Avatar } from '../phone/Avatar';
import { COLORS, SPACING, withAlpha } from '../../constants/theme';

const PHASE: Record<BeefWar['phase'], string> = {
  cold: 'Cold',
  shade: 'Throwing shade',
  subtweets: 'Subtweet war',
  diss: 'Diss tracks',
  war: 'All-out war',
  truce: 'Truce',
};

const KIND: Record<MomentKind, { label: string; color: string }> = {
  scandal: { label: 'Scandal', color: COLORS.negative },
  ugly: { label: 'Yikes', color: COLORS.warning },
  charity: { label: 'Good deed', color: COLORS.positive },
  best: { label: 'Big moment', color: COLORS.secondary },
  romance: { label: 'Romance', color: COLORS.accent },
  beef: { label: 'Beef', color: COLORS.negative },
  meme: { label: 'Meme', color: COLORS.primary },
  flop: { label: 'Flop', color: COLORS.textMuted },
};

/**
 * Empire · the drama: every live rival war as a tug-of-war of public opinion,
 * and what the internet is talking about right now (hottest first).
 */
export function DramaSection() {
  const wars = useDramaStore((s) => s.wars);
  const moments = useDramaStore((s) => s.moments);
  const rivals = useRivalryStore((s) => s.rivals);
  const known = useRelationshipStore((s) => s.knownArtists);

  const live = Object.values(wars)
    .map((w) => ({ w, rc: rivals[w.rivalId], artist: known.find((a) => a.id === w.rivalId) }))
    .filter((x) => x.rc && x.artist && (x.rc.intensity >= 20 || x.w.phase === 'truce'))
    .sort((a, b) => (b.rc?.intensity ?? 0) - (a.rc?.intensity ?? 0));
  const talk = [...moments].sort((a, b) => b.heat - a.heat).slice(0, 4);

  if (live.length === 0 && talk.length === 0) return null;

  return (
    <View>
      {live.length > 0 ? (
        <>
          <SectionTitle accent={COLORS.negative} meta={`${live.length}`}>
            The war
          </SectionTitle>
          <ListGroup>
            {live.map(({ w, artist, rc }) => {
              const you = w.score;
              const last = w.log[0]?.text;
              return (
                <View key={w.rivalId} style={styles.war}>
                  <View style={styles.warHead}>
                    <Avatar id={`artist-${w.rivalId}`} name={artist!.name} size={40} />
                    <View style={styles.flex}>
                      <Text variant="subheading">{artist!.name}</Text>
                      <Text variant="caption" muted>
                        {PHASE[w.phase]} · heat {Math.round(rc!.intensity)}
                      </Text>
                    </View>
                    <Text variant="metric" color={you >= 50 ? COLORS.positive : COLORS.negative}>
                      {you}%
                    </Text>
                  </View>
                  <View style={styles.tug}>
                    <View style={[styles.tugYou, { flex: you, backgroundColor: COLORS.positive }]} />
                    <View style={[styles.tugThem, { flex: 100 - you, backgroundColor: withAlpha(COLORS.negative, 0.75) }]} />
                  </View>
                  <View style={styles.tugLabels}>
                    <Text variant="label" muted>
                      YOU
                    </Text>
                    <Text variant="label" muted>
                      {artist!.name.toUpperCase()}
                    </Text>
                  </View>
                  {last ? (
                    <Text variant="caption" muted numberOfLines={2}>
                      Latest: {last}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </ListGroup>
        </>
      ) : null}

      {talk.length > 0 ? (
        <>
          <SectionTitle accent={COLORS.accent} meta="now">
            The talk
          </SectionTitle>
          <ListGroup>
            {talk.map((m) => {
              const k = KIND[m.kind];
              return (
                <View key={m.id} style={styles.talk}>
                  <View style={styles.flex}>
                    <Text variant="caption" color={k.color} weight="bold">
                      {k.label.toUpperCase()}
                    </Text>
                    <Text variant="body" numberOfLines={2}>
                      {m.headline}
                    </Text>
                  </View>
                  <View style={styles.heat}>
                    <Text variant="metric" color={k.color}>
                      {Math.round(m.heat)}
                    </Text>
                    <Text variant="label" muted>
                      HEAT
                    </Text>
                  </View>
                </View>
              );
            })}
          </ListGroup>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  war: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  warHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  tug: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  tugYou: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  tugThem: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  tugLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  talk: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  heat: { alignItems: 'flex-end' },
});
