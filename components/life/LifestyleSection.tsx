import { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import type { LuxuryCategory } from '../../types/status';
import { usePlayerStore } from '../../store/playerStore';
import { useStatusStore } from '../../store/statusStore';
import { useProgressionStore } from '../../store/progressionStore';
import { LUXURY_CATALOG, statusTier } from '../../data/luxury/catalog';
import { purchaseLuxury } from '../../systems/status/statusEngine';
import { Card } from '../ui/Card';
import { Text } from '../ui/Typography';
import { Metric } from '../ui/Metric';
import { formatMoney } from '../../utils/formatters';
import { COLORS, SPACING, RADIUS } from '../../constants/theme';

const CATEGORY_ORDER: LuxuryCategory[] = [
  'fashion', 'jewelry', 'watch', 'car', 'property', 'jet', 'party', 'cosmetic', 'security', 'art',
];
const CATEGORY_LABEL: Record<LuxuryCategory, string> = {
  fashion: 'Fashion', jewelry: 'Jewelry', watch: 'Watches', car: 'Cars',
  property: 'Property', jet: 'Jets & Travel', party: 'Lifestyle',
  cosmetic: 'Image', security: 'Security', art: 'Art',
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
    if (r.ok) setFlash(`Acquired ${r.item?.name}. ${verdictText(r.verdict!)}`);
    else if (r.reason === 'funds') setFlash('Not enough money for that. Keep grinding.');
    else if (r.reason === 'level') setFlash(`Locked — reach career level ${r.item?.levelReq}.`);
    else if (r.reason === 'owned') setFlash('You already own that.');
  };

  return (
    <View>
      <Card accent={tier.color}>
        <View style={styles.scoreRow}>
          <Metric label={`Status · ${tier.label}`} value={`${score}`} large color={tier.color} />
        </View>
        <View style={styles.walletRow}>
          <Metric label="Cash" value={formatMoney(money)} color={COLORS.primary} />
          <Metric label="Flexed" value={formatMoney(totalSpent)} align="center" color={COLORS.textSecondary} />
          <Metric label="Items" value={`${owned.length}`} align="right" color={COLORS.textSecondary} />
        </View>
      </Card>

      {flash && (
        <Pressable onPress={() => setFlash(null)}>
          <Card accent={COLORS.primary}>
            <Text variant="caption">{flash}</Text>
            <Text variant="label" muted style={styles.dismiss}>
              tap to dismiss
            </Text>
          </Card>
        </Pressable>
      )}

      {/* ── Catalog ───────────────────────────────────────────── */}
      {CATEGORY_ORDER.map((cat) => {
        const items = LUXURY_CATALOG.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        return (
          <View key={cat}>
            <Text variant="heading" style={styles.section}>
              {CATEGORY_LABEL[cat]}
            </Text>
            {items.map((item) => {
              const isOwned = ownedIds.has(item.id);
              const locked = level < item.levelReq;
              const afford = money >= item.cost;
              const accent = isOwned
                ? COLORS.primary
                : afford && !locked
                  ? COLORS.gold
                  : COLORS.border;
              return (
                <Card key={item.id} accent={accent}>
                  <View style={styles.itemRow}>
                    <View style={styles.flex}>
                      <Text variant="subheading">{item.name}</Text>
                      <Text variant="caption" muted style={styles.flex}>
                        “{item.flexLine}”
                      </Text>
                      <Text variant="label" muted style={styles.meta}>
                        +{item.statusValue} STATUS · {item.tone.toUpperCase()}
                        {item.upkeep > 0 ? ` · ${formatMoney(item.upkeep)}/WK UPKEEP` : ''}
                        {locked ? ` · LV ${item.levelReq}` : ''}
                      </Text>
                    </View>
                    <View style={styles.buyCol}>
                      <Text
                        variant="subheading"
                        color={afford ? COLORS.primary : COLORS.textMuted}
                      >
                        {formatMoney(item.cost)}
                      </Text>
                      <Pressable
                        disabled={isOwned || locked || !afford}
                        onPress={() => buy(item.id)}
                        style={[
                          styles.buyBtn,
                          {
                            backgroundColor: isOwned
                              ? COLORS.surface3
                              : locked || !afford
                                ? COLORS.surface2
                                : COLORS.primary,
                          },
                        ]}
                      >
                        <Text
                          variant="caption"
                          weight="semibold"
                          color={
                            isOwned
                              ? COLORS.primary
                              : locked || !afford
                                ? COLORS.textMuted
                                : COLORS.bg
                          }
                        >
                          {isOwned ? 'OWNED' : locked ? 'LOCKED' : 'BUY'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Card>
              );
            })}
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
  scoreRow: { marginBottom: SPACING.base },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dismiss: { marginTop: SPACING.xs },
  section: { marginTop: SPACING.lg, marginBottom: SPACING.sm },
  itemRow: { flexDirection: 'row', gap: SPACING.base },
  flex: { flex: 1 },
  meta: { marginTop: SPACING.xs },
  buyCol: { alignItems: 'flex-end', gap: SPACING.sm, justifyContent: 'space-between' },
  buyBtn: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
});
