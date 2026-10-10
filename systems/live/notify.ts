import type {
  LevelUpResult,
  Achievement,
  LiveNotification,
} from '../../types/progression';
import { notifyGame } from '../notifications/triggers';

/**
 * The dopamine router. Everything that should make the player FEEL
 * something funnels through here. It lands as a real notification on the
 * device (the in-app heads-up banner when the OS can't show one).
 * Kept separate from the stores so engines never import UI state shape.
 */

const KIND: Record<LiveNotification['kind'], 'level' | 'achievement' | 'energy' | 'info'> = {
  'level-up': 'level',
  achievement: 'achievement',
  'energy-full': 'energy',
  away: 'info',
  xp: 'info',
  info: 'info',
};

const TIER_COLOR: Record<Achievement['tier'], string> = {
  bronze: '#C08457',
  silver: '#AAB4BD',
  gold: '#FFD700',
  legendary: '#FF3B5C',
};

export function pushNotification(
  n: Omit<LiveNotification, 'id' | 'at'>
): void {
  notifyGame(KIND[n.kind], n.title, n.body, n.color);
}

export function pushLevelUps(ups: LevelUpResult[]): void {
  for (const up of ups) {
    pushNotification({
      kind: 'level-up',
      title: `Level ${up.to}: ${up.level.title}`,
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
