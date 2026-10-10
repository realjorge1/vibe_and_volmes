import { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { LuxuryCategory } from '../../types/status';
import { usePlayerStore } from '../../store/playerStore';
import { useStatusStore } from '../../store/statusStore';
import { useProgressionStore } from '../../store/progressionStore';
import { LUXURY_CATALOG, statusTier } from '../../data/luxury/catalog';
import { purchaseLuxury } from '../../systems/status/statusEngine';
import { Card } from '../ui/Card';
import { Text } from '../ui/Typography';
import { Metric } from '../ui/Metric';
import { SectionTitle } from '../ui/SectionTitle';
import { PressableScale } from '../ui/PressableScale';
import { Grid } from '../ui/Grid';
import { Tile3D } from '../fx/Tile3D';
import { GradientText } from '../fx/GradientText';
import { formatMoney } from '../../utils/formatters';
import { COLORS, GRADIENTS, SPACING, RADIUS, shade, ifAnimated, withAlpha } from '../../constants/theme';

const CATEGORY_ORDER: LuxuryCategory[] = [
  'fashion', 'jewelry', 'watch', 'car', 'property', 'jet', 'party', 'cosmetic', 'security', 'art',
];
const CATEGORY_LABEL: Record<LuxuryCategory, string> = {
  fashion: 'Fashion', jewelry: 'Jewelry', watch: 'Watches', car: 'Cars',
  property: 'Property', jet: 'Jets & Travel', party: 'Lifestyle',
  cosmetic: 'Image', security: 'Security', art: 'Art',
};
const CATEGORY_ICON: Record<LuxuryCategory, string> = {
  fashion: 'shirt', jewelry: 'diamond', watch: 'watch', car: 'car-sport',
  property: 'business', jet: 'airplane', party: 'wine',
  cosmetic: 'sparkles', security: 'shield-checkmark', art: 'color-palette',
};
const CATEGORY_COLOR: Record<LuxuryCategory, string> = {
  fashion: '#FF7EBD', jewelry: COLORS.accent, watch: COLORS.gold, car: COLORS.negative,
  property: COLORS.primary, jet: '#4DA8FF', party: COLORS.secondary,
  cosmetic: '#B79CFF', security: COLORS.positive, art: '#FF8A3D',
};

/**
 * Life · Assets · Lifestyle — status score, wallet, and the flex catalog.
 * Everything here costs weekly upkeep once owned (systems/life/assetTick.ts).
 */
export function LifestyleSection() {
  const money = usePlayerStore((s) => s.player?.money ?? 0);
  const owned = useStatusStore((s) => s.owned);
  const totalSpent = useStatusStore((s) => s.totalSpent);
  const level = useProgressionStore((s) => s.level);
  const [flash, setFlash] = useState<string | null>(null);

  const score = useMemo(
    () => owned.reduce((sum, o) => {
      const it = LUXURY_CATALOG.find((i) => i.id === o.itemId);
      return sum + (it?.statusValue ?? 0);
    }, 0),
    [owned]
  );
  const tier = statusTier(score);
  const ownedIds = useMemo(() => new Set(owned.map((o) => o.itemId)), [owned]);

  const buy = (id: string) => {
    const r = purchaseLuxury(id);
    if (r.ok) setFlash(`Acquired ${r.item?.name}. “${r.item?.flexLine}” ${verdictText(r.verdict!)}`);
    else if (r.reason === 'funds') setFlash('Not enough money for that. Keep grinding.');
    else if (r.reason === 'level') setFlash(`Locked — reach career level ${r.item?.levelReq}.`);
    else if (r.reason === 'owned') setFlash('You already own that.');
  };

  return (
    <View>
      <Card accent={tier.color}>
        <Text variant="label" muted center>
          STATUS · {tier.label.toUpperCase()}
        </Text>
        <GradientText
          text={`${score}`}
          size={40}
          colors={[shade(tier.color, 0.5), tier.color]}
          align="center"
          style={styles.score}
        />
        <View style={styles.walletRow}>
          <Metric label="Cash" value={formatMoney(money)} color={COLORS.gold} align="center" style={styles.flex} />
          <Metric label="Flexed" value={formatMoney(totalSpent)} align="center" color={COLORS.textSecondary} style={styles.flex} />
          <Metric label="Items" value={`${owned.length}`} align="center" color={COLORS.textSecondary} style={styles.flex} />
        </View>
      </Card>

      {flash && (
        <Animated.View key={flash} entering={ifAnimated(FadeInDown.springify().damping(15))}>
          <Pressable onPress={() => setFlash(null)}>
            <Card accent={COLORS.gold}>
              <Text variant="body">{flash}</Text>
              <Text variant="label" muted style={styles.dismiss}>
                TAP TO DISMISS
              </Text>
            </Card>
          </Pressable>
        </Animated.View>
      )}

      {/* ── Catalog ───────────────────────────────────────────── */}
      {CATEGORY_ORDER.map((cat) => {
        const items = LUXURY_CATALOG.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        const tint = CATEGORY_COLOR[cat];
        return (
          <View key={cat}>
            <SectionTitle accent={tint} meta={`${items.length}`}>
              {CATEGORY_LABEL[cat]}
            </SectionTitle>
            <Grid columns={2}>
              {items.map((item) => {
                const isOwned = ownedIds.has(item.id);
                const locked = level < item.levelReq;
                const afford = money >= item.cost;
                const canBuy = !isOwned && !locked && afford;
                return (
                  <View key={item.id} style={[styles.item, isOwned && styles.itemOwned]}>
                    <Tile3D
                      icon={locked ? 'lock-closed' : CATEGORY_ICON[cat]}
                      color={tint}
                      size={46}
                      dim={locked || (!afford && !isOwned)}
                    />
                    <Text variant="subheading" center numberOfLines={2} style={styles.itemName}>
                      {item.name}
                    </Text>
                    <Text variant="label" muted center numberOfLines={1} style={styles.meta}>
                      +{item.statusValue} STATUS
                      {item.upkeep > 0 ? ` · ${formatMoney(item.upkeep)}/WK` : ''}
                      {locked ? ` · LV ${item.levelReq}` : ''}
                    </Text>
                    <Text variant="subheading" weight="bold" color={afford || isOwned ? COLORS.gold : COLORS.textMuted}>
                      {formatMoney(item.cost)}
                    </Text>
                    <PressableScale
                      disabled={!canBuy}
                      onPress={() => buy(item.id)}
                      style={[styles.buyBtn, canBuy && styles.buyOn]}
                    >
                      {canBuy && (
                        <LinearGradient
                          colors={GRADIENTS.gold}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFill, styles.buyRound]}
                        />
                      )}
                      <Text
                        variant="label"
                        color={isOwned ? COLORS.positive : canBuy ? '#2A1A00' : COLORS.textMuted}
                      >
                        {isOwned ? 'OWNED' : locked ? 'LOCKED' : afford ? 'BUY' : 'TOO PRICEY'}
                      </Text>
                    </PressableScale>
                  </View>
                );
              })}
            </Grid>
          </View>
        );
      })}
    </View>
  );
}

function verdictText(v: NonNullable<ReturnType<typeof purchaseLuxury>['verdict']>): string {
  switch (v) {
    case 'made-it': return 'The internet says you finally made it.';
    case 'humble': return 'Fans say you stayed humble.';
    case 'changed': return 'They’re saying money changed you.';
    case 'plant': return 'The plant allegations are flying.';
    case 'iconic': return 'Iconic. A cultural event.';
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  score: { marginTop: SPACING.xs, marginBottom: SPACING.sm },
  walletRow: { flexDirection: 'row' },
  dismiss: { marginTop: SPACING.sm },
  item: {
    alignItems: 'center',
    gap: 4,
    paddingTop: SPACING.md + 2,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.lg - 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: 'rgba(255,255,255,0.13)',
  },
  itemOwned: { borderColor: withAlpha(COLORS.positive, 0.4) },
  itemName: { marginTop: SPACING.sm, fontSize: 14, lineHeight: 18, minHeight: 36 },
  meta: { fontSize: 8.5, letterSpacing: 0.6 },
  buyBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: SPACING.xs + 2,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buyOn: { borderColor: 'transparent' },
  buyRound: { borderRadius: RADIUS.full },
});
