import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Text } from '../components/ui/Typography';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { usePremiumStore } from '../store/premiumStore';
import { COSMETIC_CATALOG } from '../data/premium/catalog';
import type { CosmeticCategory, CosmeticItem } from '../types/premium';
import {
  purchaseCosmetic,
  equipTheme,
  equipVanity,
} from '../systems/premium/premiumEngine';
import { seasonView, claimReward } from '../systems/premium/seasonPass';
import { CURRENCY_PACKS, isBillingLive } from '../systems/premium/billing';
import { PASSIVE_CONFIG } from '../constants/passiveConfig';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Tab = 'shop' | 'season' | 'vibes';

const TABS = [
  { key: 'shop' as const, label: 'Shop' },
  { key: 'season' as const, label: 'Season' },
  { key: 'vibes' as const, label: 'Get Vibes' },
];

const CATEGORY_LABEL: Record<CosmeticCategory, string> = {
  'studio-theme': 'Studio Themes',
  'beat-pack': 'Beat Packs',
  vanity: 'Vanity',
  convenience: 'Convenience',
  'season-pass': 'Season Pass',
};
const CATEGORY_ORDER: CosmeticCategory[] = [
  'studio-theme',
  'beat-pack',
  'vanity',
  'convenience',
  'season-pass',
];

export default function StoreModal() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('shop');

  // Subscribe to the slices that drive the UI so it re-renders on changes.
  const currency = usePremiumStore((s) => s.currency);
  const owned = usePremiumStore((s) => s.owned);
  const activeTheme = usePremiumStore((s) => s.activeTheme);
  const activeVanity = usePremiumStore((s) => s.activeVanity);
  usePremiumStore((s) => s.season); // re-render on season changes

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="title">Store</Text>
        <View style={styles.wallet}>
          <Ionicons name="diamond-outline" size={16} color={COLORS.gold} />
          <Text variant="heading" color={COLORS.gold}>
            {currency.toLocaleString()}
          </Text>
        </View>
      </View>
      <Text variant="caption" muted style={styles.sub}>
        Cosmetics only — themes, packs, vanity, convenience. Nothing here changes
        your stats, fans, or money. {PASSIVE_CONFIG.PREMIUM_CURRENCY_NAME} are
        earned just by playing.
      </Text>

      <SegmentedControl segments={TABS} value={tab} onChange={setTab} style={styles.tabs} />

      {tab === 'shop' && (
        <View style={styles.section}>
          {CATEGORY_ORDER.map((cat) => {
            const items = COSMETIC_CATALOG.filter((c) => c.category === cat);
            if (!items.length) return null;
            return (
              <View key={cat} style={styles.group}>
                <Text variant="label" muted style={styles.groupTitle}>
                  {CATEGORY_LABEL[cat].toUpperCase()}
                </Text>
                {items.map((item) => (
                  <ShopRow
                    key={item.id}
                    item={item}
                    currency={currency}
                    owned={owned.includes(item.id)}
                    equipped={activeTheme === item.id || activeVanity === item.id}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}

      {tab === 'season' && <SeasonTrack />}

      {tab === 'vibes' && <VibesTab />}

      <Button
        label="Close"
        variant="outline"
        onPress={() => router.back()}
        style={styles.close}
      />
    </Screen>
  );
}

function ShopRow({
  item,
  currency,
  owned,
  equipped,
}: {
  item: CosmeticItem;
  currency: number;
  owned: boolean;
  equipped: boolean;
}) {
  const canEquip = item.category === 'studio-theme' || item.category === 'vanity';
  const affordable = currency >= item.price;

  const onEquip = () => {
    if (item.category === 'studio-theme') equipTheme(equipped ? null : item.id);
    else if (item.category === 'vanity') equipVanity(equipped ? null : item.id);
  };

  return (
    <Card accent={equipped ? COLORS.primary : undefined}>
      <View style={styles.shopRow}>
        <Ionicons name={item.icon as IconName} size={22} color={COLORS.primary} />
        <View style={styles.flex}>
          <Text variant="subheading">{item.name}</Text>
          <Text variant="caption" muted>
            {item.blurb}
          </Text>
        </View>
        {!owned ? (
          <Pressable
            disabled={!affordable}
            onPress={() => purchaseCosmetic(item.id)}
            style={[styles.buy, !affordable && styles.buyOff]}
          >
            <Text variant="caption" color={affordable ? COLORS.bg : COLORS.textMuted} weight="semibold">
              {item.price}
            </Text>
          </Pressable>
        ) : canEquip ? (
          <Pressable onPress={onEquip} style={styles.equip}>
            <Text variant="caption" color={equipped ? COLORS.primary : COLORS.text}>
              {equipped ? 'Equipped' : 'Equip'}
            </Text>
          </Pressable>
        ) : (
          <Text variant="caption" color={COLORS.positive}>
            ✓ Owned
          </Text>
        )}
      </View>
    </Card>
  );
}

function SeasonTrack() {
  const view = seasonView();
  return (
    <View style={styles.section}>
      <Card>
        <Text variant="subheading">{view.name}</Text>
        <Text variant="caption" muted style={styles.seasonBlurb}>
          {view.blurb}
        </Text>
        <Text variant="metric" color={COLORS.primary} style={styles.seasonXp}>
          {view.xp.toLocaleString()} XP
        </Text>
        {!view.premiumUnlocked && (
          <Text variant="caption" color={COLORS.gold}>
            Premium lane locked — buy the Season Pass in Shop to unlock.
          </Text>
        )}
      </Card>

      {view.tiers.map((t) => (
        <Card key={t.tier} accent={t.reached ? COLORS.primary : undefined}>
          <View style={styles.tierHead}>
            <Text variant="subheading">Tier {t.tier}</Text>
            <Text variant="caption" muted>
              {t.xpRequired.toLocaleString()} XP
            </Text>
          </View>
          <RewardRow
            lane="Free"
            label={t.free.label}
            claimable={t.freeClaimable}
            claimed={t.freeClaimed}
            onClaim={() => claimReward(t.tier, 'free')}
          />
          <RewardRow
            lane="Premium"
            label={t.premium.label}
            claimable={t.premiumClaimable}
            claimed={t.premiumClaimed}
            onClaim={() => claimReward(t.tier, 'premium')}
          />
        </Card>
      ))}
    </View>
  );
}

function RewardRow({
  lane,
  label,
  claimable,
  claimed,
  onClaim,
}: {
  lane: string;
  label: string;
  claimable: boolean;
  claimed: boolean;
  onClaim: () => void;
}) {
  if (label === '—') return null;
  return (
    <View style={styles.rewardRow}>
      <Text variant="caption" color={lane === 'Premium' ? COLORS.gold : COLORS.textSecondary}>
        {lane}
      </Text>
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      {claimed ? (
        <Text variant="caption" color={COLORS.positive}>
          ✓
        </Text>
      ) : (
        <Pressable disabled={!claimable} onPress={onClaim} style={[styles.claim, !claimable && styles.buyOff]}>
          <Text variant="caption" color={claimable ? COLORS.bg : COLORS.textMuted} weight="semibold">
            Claim
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function VibesTab() {
  const live = isBillingLive();
  return (
    <View style={styles.section}>
      <Card>
        <Text variant="subheading">Earn by playing</Text>
        <Text variant="caption" muted style={styles.seasonBlurb}>
          You earn {PASSIVE_CONFIG.PREMIUM_CURRENCY_NAME} from your daily plan,
          season rewards, and milestones — no purchase required.
        </Text>
      </Card>
      <Text variant="label" muted style={styles.groupTitle}>
        BUY {PASSIVE_CONFIG.PREMIUM_CURRENCY_NAME.toUpperCase()}
      </Text>
      {CURRENCY_PACKS.map((p) => (
        <Card key={p.id}>
          <View style={styles.shopRow}>
            <Ionicons name="diamond-outline" size={22} color={COLORS.gold} />
            <View style={styles.flex}>
              <Text variant="subheading">{p.amount.toLocaleString()} Vibes</Text>
              <Text variant="caption" muted>
                {p.priceLabel}
              </Text>
            </View>
            <Text variant="caption" color={COLORS.textMuted}>
              {live ? 'Buy' : 'Coming soon'}
            </Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  sub: { marginTop: SPACING.xs, marginBottom: SPACING.base, lineHeight: 18 },
  tabs: { marginBottom: SPACING.lg },
  section: { gap: SPACING.xs },
  group: { marginBottom: SPACING.base },
  groupTitle: { marginBottom: SPACING.sm },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  flex: { flex: 1 },
  buy: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 56,
    alignItems: 'center',
  },
  buyOff: { backgroundColor: COLORS.surface3 },
  equip: {
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  seasonBlurb: { marginTop: SPACING.xs, lineHeight: 18 },
  seasonXp: { marginTop: SPACING.sm, marginBottom: SPACING.xs },
  tierHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  claim: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  close: { marginTop: SPACING.lg },
});
