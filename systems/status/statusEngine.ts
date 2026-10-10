import type { PurchaseResult, FlexTone } from '../../types/status';
import type { SocialPost, PostSentiment } from '../../types/social';
import { getLuxuryItem } from '../../data/luxury/catalog';
import { NPC_ACCOUNTS } from '../../data/social/npcAccounts';
import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useSocialStore } from '../../store/socialStore';
import { useStatusStore } from '../../store/statusStore';
import { useProgressionStore } from '../../store/progressionStore';
import { XP_REWARDS } from '../../constants/progression';
import { awardXp, checkAchievements } from '../progression/xpEngine';
import { pushNotification } from '../live/notify';
import { pick, pickN, clamp } from '../../utils/random';
import { saveProgress } from '../persistence';
import { notifyPost } from '../notifications/triggers';

type Verdict = NonNullable<PurchaseResult['verdict']>;

/** The internet's read on a purchase, weighted by who the artist is. */
function decideVerdict(tone: FlexTone, authenticity: number, reputation: number): Verdict {
  if (tone === 'iconic') return 'iconic';
  if (tone === 'tasteful') return authenticity >= 55 ? 'humble' : 'made-it';
  // flashy
  if (authenticity >= 62) return 'changed';
  if (reputation < 40) return 'plant';
  return 'made-it';
}

const VERDICT_COPY: Record<Verdict, { lines: string[]; sentiment: PostSentiment; toast: string }> = {
  'made-it': {
    sentiment: 'hype',
    toast: 'The internet says: FINALLY MADE IT.',
    lines: [
      'not {name} finally treating themselves 😭 WE WON',
      'from nothing to THIS. {name} earned every bit of it.',
      '{name} said struggle season is OVER and meant it 🔥',
    ],
  },
  humble: {
    sentiment: 'positive',
    toast: 'The internet says: still humble.',
    lines: [
      'love that {name} still moves humble even with the bag',
      '{name} got money and didn’t get weird about it. rare.',
      'tasteful. {name} has actual restraint, who knew.',
    ],
  },
  changed: {
    sentiment: 'shade',
    toast: 'The internet says: money changed them.',
    lines: [
      'money changed {name} and you can’t convince me otherwise',
      'remember when {name} was relatable? yeah me neither.',
      '{name} flexing while the fans struggle is a choice 🙄',
    ],
  },
  plant: {
    sentiment: 'hostile',
    toast: 'The internet says: industry plant behavior.',
    lines: [
      'where is {name} getting this money from? industry plant confirmed.',
      'no way {name} affords that off those numbers. it’s giving label puppet.',
      '{name} bought clout. respectfully, who is funding this?',
    ],
  },
  iconic: {
    sentiment: 'news',
    toast: 'The internet says: ICONIC.',
    lines: [
      '{name} just bought something most artists will never touch. iconic.',
      'this is the kind of move that defines an era. {name} is THAT.',
      'the {name} flex is now a cultural event, genuinely.',
    ],
  },
};

function statDeltas(verdict: Verdict, statusValue: number) {
  const respect = clamp(Math.round(statusValue / 40), 1, 4);
  const out: { stat: 'reputation' | 'fanLoyalty' | 'industryRespect' | 'charisma'; delta: number }[] = [
    { stat: 'industryRespect', delta: respect },
  ];
  switch (verdict) {
    case 'made-it': out.push({ stat: 'fanLoyalty', delta: 1 }, { stat: 'charisma', delta: 1 }); break;
    case 'humble': out.push({ stat: 'fanLoyalty', delta: 2 }, { stat: 'reputation', delta: 1 }); break;
    case 'changed': out.push({ stat: 'fanLoyalty', delta: -2 }, { stat: 'reputation', delta: -1 }); break;
    case 'plant': out.push({ stat: 'reputation', delta: -2 }, { stat: 'fanLoyalty', delta: -1 }); break;
    case 'iconic': out.push({ stat: 'industryRespect', delta: 2 }, { stat: 'charisma', delta: 1 }, { stat: 'reputation', delta: 1 }); break;
  }
  return out;
}

function reactionPosts(verdict: Verdict, playerName: string, week: number): SocialPost[] {
  const copy = VERDICT_COPY[verdict];
  const accounts = pickN(NPC_ACCOUNTS, 4);
  return accounts.map((account, i) => {
    const reach = Math.sqrt(account.followers + 1) * 6;
    const likes = Math.round(reach * (0.6 + Math.random() * 2.2));
    return {
      id: `lux-${verdict}-${week}-${i}-${Date.now()}`,
      platform: pick(account.preferredPlatforms),
      account,
      content: pick(copy.lines).replace(/\{name\}/g, playerName),
      sentiment: copy.sentiment,
      likes,
      reposts: Math.round(likes * (0.06 + Math.random() * 0.2)),
      replies: Math.round(likes * (0.05 + Math.random() * 0.25)),
      week,
    };
  });
}

/**
 * Buy a luxury item. Validates funds + career level, deducts money,
 * registers ownership, then lets the internet pass judgment — the
 * "money changed them" / "finally made it" loop. Status is XP; the feed
 * reacts immediately. Purely a money sink + perception driver; it never
 * shortcuts the music sim.
 */
export function purchaseLuxury(itemId: string): PurchaseResult {
  const item = getLuxuryItem(itemId);
  if (!item) return { ok: false, reason: 'missing' };

  const status = useStatusStore.getState();
  if (status.ownsItem(itemId)) return { ok: false, reason: 'owned', item };

  const player = usePlayerStore.getState().player;
  if (!player) return { ok: false, reason: 'missing' };

  const level = useProgressionStore.getState().level;
  if (level < item.levelReq) return { ok: false, reason: 'level', item };
  if (player.money < item.cost) return { ok: false, reason: 'funds', item };

  const week = useGameStore.getState().week;

  // 1. Pay.
  usePlayerStore.getState().addMoney(-item.cost);
  status.addOwned({ itemId, boughtAtWeek: week, boughtAtCost: item.cost });

  // 2. The verdict.
  const verdict = decideVerdict(item.tone, player.stats.authenticity, player.stats.reputation);
  usePlayerStore.getState().updateStats(statDeltas(verdict, item.statusValue));

  // 2b. It is part of the story.
  useGameStore.getState().addStoryLine(
    `You bought the ${item.name}. ${VERDICT_COPY[verdict].toast}`,
    'opportunity',
    `luxury:${item.id}`
  );

  // 3. The feed reacts now.
  const posts = reactionPosts(verdict, player.artistName, week);
  const social = useSocialStore.getState();
  social.setFeed([...posts, ...social.feed].slice(0, 60));
  social.addToHistory(posts);
  notifyPost(posts[0] ?? null, 6000);

  // 4. Status is progression.
  const toneMult = item.tone === 'iconic' ? 2.5 : item.tone === 'flashy' ? 1.5 : 1;
  awardXp('luxury', Math.round(XP_REWARDS.luxury * toneMult), `Acquired ${item.name}`);

  pushNotification({
    kind: 'info',
    title: item.name,
    body: VERDICT_COPY[verdict].toast,
    color:
      verdict === 'plant' || verdict === 'changed'
        ? '#EF4444'
        : verdict === 'iconic'
          ? '#FFD700'
          : '#00D4AA',
  });

  checkAchievements();

  // 5. Persist.
  saveProgress();

  return {
    ok: true,
    item,
    statusAfter: useStatusStore.getState().statusScore(),
    verdict,
  };
}
