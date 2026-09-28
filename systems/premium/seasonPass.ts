import type { SeasonReward } from '../../types/premium';
import { CURRENT_SEASON } from '../../data/premium/catalog';
import { usePremiumStore } from '../../store/premiumStore';
import { pushNotification } from '../live/notify';
import { COLORS } from '../../constants/theme';

/**
 * Battle-pass-style season track. XP is earned purely by PLAYING (the passive
 * layer awards it on resume; see systems/live/liveTick). Rewards are cosmetics
 * + soft currency only — both lanes, free and premium, are non-mechanical.
 */

export function awardSeasonXp(amount: number): void {
  usePremiumStore.getState().addSeasonXp(amount);
}

export interface SeasonTierView {
  tier: number;
  xpRequired: number;
  reached: boolean;
  free: SeasonReward;
  premium: SeasonReward;
  freeClaimed: boolean;
  premiumClaimed: boolean;
  freeClaimable: boolean;
  premiumClaimable: boolean;
}

export interface SeasonView {
  name: string;
  blurb: string;
  xp: number;
  premiumUnlocked: boolean;
  tiers: SeasonTierView[];
}

function freeKey(tier: number): string {
  return `free-${tier}`;
}
function premKey(tier: number): string {
  return `prem-${tier}`;
}

export function seasonView(): SeasonView {
  const { season } = usePremiumStore.getState();
  const tiers: SeasonTierView[] = CURRENT_SEASON.tiers.map((t) => {
    const reached = season.xp >= t.xpRequired;
    const freeClaimed = season.claimed.includes(freeKey(t.tier));
    const premiumClaimed = season.claimed.includes(premKey(t.tier));
    return {
      tier: t.tier,
      xpRequired: t.xpRequired,
      reached,
      free: t.free,
      premium: t.premium,
      freeClaimed,
      premiumClaimed,
      freeClaimable: reached && t.free.kind !== 'none' && !freeClaimed,
      premiumClaimable:
        reached && t.premium.kind !== 'none' && !premiumClaimed && season.premiumUnlocked,
    };
  });
  return {
    name: CURRENT_SEASON.name,
    blurb: CURRENT_SEASON.blurb,
    xp: season.xp,
    premiumUnlocked: season.premiumUnlocked,
    tiers,
  };
}

export function claimReward(tier: number, lane: 'free' | 'premium'): boolean {
  const def = CURRENT_SEASON.tiers.find((t) => t.tier === tier);
  if (!def) return false;
  const store = usePremiumStore.getState();
  if (store.season.xp < def.xpRequired) return false;
  if (lane === 'premium' && !store.season.premiumUnlocked) return false;

  const key = lane === 'free' ? freeKey(tier) : premKey(tier);
  if (store.season.claimed.includes(key)) return false;

  const reward = lane === 'free' ? def.free : def.premium;
  if (reward.kind === 'none') return false;

  if (reward.kind === 'currency' && reward.amount) {
    store.grantCurrency(reward.amount);
  } else if (
    (reward.kind === 'cosmetic' || reward.kind === 'vanity') &&
    reward.cosmeticId
  ) {
    store.addOwned(reward.cosmeticId);
    if (reward.kind === 'vanity') store.setActiveVanity(reward.cosmeticId);
  }

  store.markClaimed(key);
  pushNotification({
    kind: 'info',
    title: 'Season Reward',
    body: `Claimed: ${reward.label}`,
    color: COLORS.gold,
  });
  return true;
}
