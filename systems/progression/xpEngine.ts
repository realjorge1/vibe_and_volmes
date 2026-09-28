import type { SocialReactionType } from '../../types/events';
import type { AchievementSnapshot } from '../../types/progression';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useMusicStore } from '../../store/musicStore';
import { useProgressionStore } from '../../store/progressionStore';
import { usePressStore } from '../../store/pressStore';
import { useRivalryStore } from '../../store/rivalryStore';
import { XP_REWARDS } from '../../constants/progression';
import { pushLevelUps, pushAchievements, pushNotification } from '../live/notify';

/** Build the read-only snapshot the achievement predicates run against. */
export function buildAchievementSnapshot(): AchievementSnapshot {
  const player = usePlayerStore.getState().player;
  const game = useGameStore.getState();
  const music = useMusicStore.getState();
  const prog = useProgressionStore.getState();

  const disc = music.discography;
  let controversiesSurvived = 0;
  try {
    controversiesSurvived = usePressStore
      .getState()
      .controversies.filter((c) => c.resolved).length;
  } catch {
    /* press system optional */
  }
  let hottestRivalryIntensity = 0;
  try {
    hottestRivalryIntensity = useRivalryStore.getState().hottestIntensity();
  } catch {
    /* rivalry system optional */
  }

  return {
    fans: player?.stats.fans ?? 0,
    reputation: player?.stats.reputation ?? 50,
    money: player?.money ?? 0,
    level: prog.level,
    week: game.week,
    releasedTracks: disc.length,
    viralTracks: disc.filter((t) => t.wentViral).length,
    number1s: disc.filter((t) => t.peakChartPosition === 1).length,
    controversiesSurvived,
    hottestRivalryIntensity,
  };
}

/** Evaluate achievements and surface any newly unlocked ones as toasts. */
export function checkAchievements(): void {
  const newly = useProgressionStore
    .getState()
    .evaluateAchievements(buildAchievementSnapshot());
  if (newly.length > 0) pushAchievements(newly);
}

/** Award XP and fire the level-up burst if any band was crossed. */
export function awardXp(
  source: Parameters<ReturnType<typeof useProgressionStore.getState>['grantXp']>[0],
  amount: number,
  label: string
): void {
  const ups = useProgressionStore.getState().grantXp(source, amount, label);
  if (ups.length > 0) pushLevelUps(ups);
}

/**
 * Translate everything the week produced into XP. Called from the weekly
 * tick AFTER the sim has resolved, so it reads true outcomes (fans gained,
 * viral hits, chart peaks, controversy, decisions made).
 */
export function awardWeeklyXp(
  reactions: SocialReactionType[],
  fansBefore: number
): void {
  const player = usePlayerStore.getState().player;
  if (!player) return;
  const music = useMusicStore.getState();

  // Fan growth — sqrt-scaled so a million-fan week isn't a million XP.
  const gained = Math.max(0, player.stats.fans - fansBefore);
  if (gained > 0) {
    awardXp(
      'fan-growth',
      Math.min(600, Math.round(Math.sqrt(gained) * 2.2)),
      `+${gained.toLocaleString()} fans`
    );
  }

  // Reaction-driven moments.
  for (const r of reactions) {
    if (r === 'viral') awardXp('viral', XP_REWARDS.viral, 'A moment went viral');
    else if (r === 'positive')
      awardXp('engagement', XP_REWARDS.engagement, 'Fans rallied behind you');
    else if (r === 'cancel' || r === 'negative')
      awardXp('controversy', XP_REWARDS.controversy, 'You survived the backlash');
    else awardXp('event', XP_REWARDS.event, 'Another week in the spotlight');
  }

  // Chart performance — best active peak this week.
  const topPeak = music.discography
    .filter((t) => t.status === 'charting' || t.status === 'fading')
    .reduce<number | null>((best, t) => {
      if (t.peakChartPosition == null) return best;
      return best == null ? t.peakChartPosition : Math.min(best, t.peakChartPosition);
    }, null);
  if (topPeak != null && topPeak <= 100) {
    const mult = topPeak === 1 ? 6 : topPeak <= 10 ? 3 : topPeak <= 40 ? 1.5 : 0.6;
    awardXp(
      'chart',
      Math.round(XP_REWARDS.chart * mult),
      topPeak === 1 ? 'You hit #1' : `Charting at #${topPeak}`
    );
  }

  // Survived a week at all — small steady drip keeps the bar always moving.
  awardXp('event', 10, 'Week survived');

  checkAchievements();

  // Surface a momentum nudge when the bar is close to popping.
  // (Cheap retention hook — "one more week and you level up".)
}

/** XP for shipping a record — call from the release pipeline. */
export function awardReleaseXp(reception: string): void {
  const mult =
    reception === 'viral'
      ? 4
      : reception === 'smash'
        ? 3
        : reception === 'hit'
          ? 2
          : reception === 'solid'
            ? 1.2
            : 0.6;
  awardXp('release', Math.round(XP_REWARDS.release * mult), 'New release is out');
  if (reception === 'viral' || reception === 'smash') {
    pushNotification({
      kind: 'info',
      title: 'The feed is on fire',
      body: 'Your release is all anyone is posting about.',
      color: '#FF3B5C',
    });
  }
  checkAchievements();
}
