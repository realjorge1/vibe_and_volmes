import type {
  LevelUpResult,
  Achievement,
  LiveNotification,
} from '../../types/progression';
import { useLiveStore } from '../../store/liveStore';

/**
 * The dopamine router. Everything that should make the player FEEL
 * something funnels through here into the one notification stack.
 * Kept separate from the stores so engines never import UI state shape.
 */

const TIER_COLOR: Record<Achievement['tier'], string> = {
  bronze: '#C08457',
  silver: '#AAB4BD',
  gold: '#FFD700',
  legendary: '#FF3B5C',
};

export function pushNotification(
  n: Omit<LiveNotification, 'id' | 'at'>
): void {
  useLiveStore.getState().pushNotification(n);
}

export function pushLevelUps(ups: LevelUpResult[]): void {
  for (const up of ups) {
    pushNotification({
      kind: 'level-up',
      title: `LEVEL ${up.to} — ${up.level.title}`,
      body: `${up.level.milestone} ${up.level.blurb}`,
      color: up.level.color,
    });
  }
}

export function pushAchievements(list: Achievement[]): void {
  for (const a of list) {
    pushNotification({
      kind: 'achievement',
      title: `Achievement: ${a.name}`,
      body: a.description,
      color: TIER_COLOR[a.tier],
    });
  }
}

export function pushEnergyFull(): void {
  pushNotification({
    kind: 'energy-full',
    title: 'Energy Full',
    body: 'You are fully recharged. Go make something happen.',
    color: '#00D4AA',
  });
}
