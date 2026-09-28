import type {
  InterviewSession,
  MediaOutletKind,
  InfluenceBundle,
} from '../../types/industry';
import {
  INTERVIEW_QUESTIONS,
  questionsByTone,
} from '../../data/media/interviewQuestions';
import {
  HEADLINE_TEMPLATES,
  OUTLET_NAMES,
  headlinesByKind,
} from '../../data/media/headlines';
import { usePressStore } from '../../store/pressStore';
import { usePlayerStore } from '../../store/playerStore';
import { useRelationshipStore } from '../../store/relationshipStore';
import { addStat, note, beat } from '../simulation/influenceGraph';
import { uid } from '../../utils/id';
import { pick, pickN, chance, weightedPick } from '../../utils/random';

const TONE_MIX: Record<MediaOutletKind, string[]> = {
  podcast: ['softball', 'probing', 'gotcha'],
  radio: ['softball', 'neutral', 'probing'],
  livestream: ['neutral', 'gotcha', 'hostile'],
  'award-show': ['softball', 'neutral'],
  'press-conference': ['probing', 'hostile', 'gotcha'],
};

/** Create an interview the player will answer in the UI. */
export function createSession(
  kind: MediaOutletKind,
  week: number
): InterviewSession {
  const tones = TONE_MIX[kind] ?? ['neutral'];
  const chosen: string[] = [];
  for (const tone of tones) {
    const byTone = questionsByTone(tone);
    const q = byTone.length ? pick(byTone) : pick(INTERVIEW_QUESTIONS);
    if (!chosen.includes(q.id)) chosen.push(q.id);
  }
  // backfill to at least 3
  while (chosen.length < 3) {
    const q = pick(INTERVIEW_QUESTIONS);
    if (!chosen.includes(q.id)) chosen.push(q.id);
  }

  const session: InterviewSession = {
    id: uid('intv'),
    outletKind: kind,
    outletName: pick(OUTLET_NAMES[kind] ?? ['the press']),
    week,
    questionIds: chosen,
    answeredWith: {},
    resolvedHeadline: null,
    netReputation: 0,
    spawnedControversyId: null,
  };
  usePressStore.getState().setPendingInterview(session);
  return session;
}

export function answerQuestion(questionId: string, answerId: string): void {
  const press = usePressStore.getState();
  const s = press.pendingInterview;
  if (!s) return;
  press.setPendingInterview({
    ...s,
    answeredWith: { ...s.answeredWith, [questionId]: answerId },
  });
}

export interface InterviewResolution {
  headline: string;
  netReputation: number;
  spawnedControversyId: string | null;
}

/**
 * Resolve the answered interview. Risky answers are amplified or salvaged
 * by charisma; the media then generates a headline whose slant can diverge
 * from what actually happened (misleading / out-of-context).
 */
export function resolveSession(
  bundle: InfluenceBundle,
  week: number
): InterviewResolution | null {
  const press = usePressStore.getState();
  const s = press.pendingInterview;
  const player = usePlayerStore.getState().player;
  if (!s || !player) return null;

  const charisma = player.stats.charisma / 100;
  let netRep = 0;
  let industry = 0;
  let fanPerc = 0;
  let spawnedControversyId: string | null = null;

  for (const qId of s.questionIds) {
    const q = INTERVIEW_QUESTIONS.find((x) => x.id === qId);
    const aId = s.answeredWith[qId];
    if (!q || !aId) continue;
    const ans = q.answers.find((a) => a.id === aId);
    if (!ans) continue;

    // Charisma scales the upside of a risky answer and shrinks the bleed.
    const charismaLift =
      ans.reputationDelta < 0
        ? ans.reputationDelta * (1 - 0.5 * charisma * ans.charismaInfluence)
        : ans.reputationDelta * (1 + 0.5 * charisma * ans.charismaInfluence);

    netRep += charismaLift;
    industry += ans.industryRespectDelta;
    fanPerc += ans.fanPerceptionDelta;

    const realizedRisk = ans.controversyRisk * (1 - 0.4 * charisma);
    if (ans.spawnsControversyId && chance(realizedRisk)) {
      spawnedControversyId = ans.spawnsControversyId;
    }

    // Name-dropped rivals heat up.
    if (ans.relationshipTargets) {
      for (const target of ans.relationshipTargets) {
        if (target !== '{rival}') useRelationshipStore.getState().updateAffinity(target, -6);
      }
    }
  }

  netRep = Math.round(netRep);

  // Headline slant: media distorts. Even neutral interviews can be spun.
  const roll = Math.random();
  let kind: 'positive' | 'negative' | 'neutral' | 'misleading' | 'viral';
  if (spawnedControversyId) kind = 'negative';
  else if (netRep >= 8) kind = chance(0.4) ? 'viral' : 'positive';
  else if (netRep <= -6) kind = 'negative';
  else kind = roll < 0.4 ? 'misleading' : 'neutral';

  const tmpl =
    weightedPick(headlinesByKind(kind)) ?? pick(HEADLINE_TEMPLATES);
  const topic =
    INTERVIEW_QUESTIONS.find((q) => q.id === s.questionIds[0])?.topicTags[0] ??
    'the music';
  const headline = tmpl.template
    .replace('{artist}', player.artistName)
    .replace('{outlet}', s.outletName)
    .replace('{topic}', topic);

  // Apply to bundle.
  addStat(bundle, 'reputation', netRep);
  addStat(bundle, 'industryRespect', industry);
  addStat(bundle, 'fanLoyalty', Math.round(fanPerc / 3));
  if (kind === 'viral') {
    bundle.fansDelta += Math.round(player.stats.fans * 0.03);
    beat(bundle, 'interview-viral');
  }
  if (kind === 'misleading') {
    beat(bundle, 'interview-misquoted');
    note(bundle, `The press ran with a misleading angle: "${headline}".`);
  } else {
    note(bundle, `Headline: "${headline}".`);
  }

  if (spawnedControversyId) {
    bundle.addTags.push(`spawn-controversy:${spawnedControversyId}`);
  }

  bundle.historyRecords.push({
    kind: 'statement',
    week,
    summary: `did a ${s.outletKind} interview that became "${headline}"`,
    severity: Math.min(70, 30 + Math.abs(netRep) * 3),
    tags: ['media', 'interview', kind],
    artistId: null,
  });

  press.archiveInterview({
    ...s,
    resolvedHeadline: headline,
    netReputation: netRep,
    spawnedControversyId,
  });

  return { headline, netReputation: netRep, spawnedControversyId };
}
