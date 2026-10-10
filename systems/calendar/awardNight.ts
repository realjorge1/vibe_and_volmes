import { usePlayerStore } from '../../store/playerStore';
import { useGameStore } from '../../store/gameStore';
import { useCalendarStore } from '../../store/calendarStore';
import { useCareerStore } from '../../store/careerStore';
import { spawnMoment } from '../drama/publish';
import { applyConsequence } from '../events/consequenceApplicator';
import { chance } from '../../utils/random';

/**
 * Award night, the choices: what the artist wears, what they say when they
 * win, and what they do when they don't. The winners themselves are rolled
 * in calendarTick (once, when the night starts).
 */

export type CarpetLook = 'classic' | 'daring' | 'statement';
export type SpeechKind = 'fans' | 'family' | 'real' | 'rival';
export type LossReaction = 'clap' | 'side-eye' | 'storm';

function line(text: string, category: 'career' | 'drama' | 'social' | 'opportunity' = 'career'): void {
  useGameStore.getState().addStoryLine(text, category, 'awards');
}

export function walkRedCarpet(look: CarpetLook): string {
  const cal = useCalendarStore.getState();
  if (!cal.awards || cal.awards.redCarpet) return '';
  cal.patchAwards({ redCarpet: look });
  const ps = usePlayerStore.getState();
  let text: string;
  if (look === 'classic') {
    ps.updateStats([{ stat: 'reputation', delta: 1 }]);
    text = 'A perfect black suit, a perfect smile. Every outlet called it timeless. Nobody called it exciting.';
  } else if (look === 'daring') {
    if (chance(0.6)) {
      ps.updateStats([{ stat: 'charisma', delta: 2 }, { stat: 'fans', delta: Math.round(1_000 + ps.player!.stats.fans * 0.01) }]);
      spawnMoment({ kind: 'best', headline: '{playerName} wins the red carpet', topic: 'the red carpet look', heat: 55, valence: 70, hashtag: 'BestDressed' });
      text = 'Your look broke the internet in the good way. Best dressed on every list.';
    } else {
      ps.updateStats([{ stat: 'reputation', delta: -2 }]);
      spawnMoment({ kind: 'meme', headline: 'What was {playerName} wearing?', topic: 'the red carpet look', heat: 55, valence: -30, hashtag: 'WorstDressed' });
      text = 'The look did not land. You are a meme template by the second category.';
    }
  } else {
    ps.updateStats([{ stat: 'authenticity', delta: 3 }, { stat: 'fans', delta: Math.round(500 + ps.player!.stats.fans * 0.008) }]);
    spawnMoment({ kind: 'meme', headline: '{playerName}’s red carpet statement has everyone talking', topic: 'the statement look', heat: 70, valence: 10, hashtag: 'TheStatement' });
    text = 'You wore a statement. Half the room got it. The other half is still writing think pieces.';
  }
  line(text, 'social');
  return text;
}

export function giveSpeech(kind: SpeechKind, award: string): string {
  const week = useGameStore.getState().week;
  const map: Record<SpeechKind, () => string> = {
    fans: () => {
      usePlayerStore.getState().updateStats([{ stat: 'fanLoyalty', delta: 5 }]);
      return `You held up the ${award} trophy and thanked the fans who found you first. They are crying in group chats everywhere.`;
    },
    family: () => {
      useCareerStore.getState().adjustMental({ isolation: -8, depression: -4 });
      return `You thanked your family by name, one by one. The camera found your mom. She was already standing.`;
    },
    real: () => {
      usePlayerStore.getState().updateStats([{ stat: 'authenticity', delta: 4 }, { stat: 'industryRespect', delta: 2 }]);
      spawnMoment({ kind: 'best', headline: '{playerName}’s acceptance speech is the only thing anyone is talking about', topic: 'the speech', heat: 65, valence: 75, hashtag: 'TheSpeech' });
      return `You put the paper away and said something true. The room went silent, then stood up.`;
    },
    rival: () => {
      applyConsequence(
        {
          warSwing: 10,
          statChanges: [{ stat: 'reputation', delta: -3 }],
          moment: { kind: 'beef', headline: '{playerName} used their acceptance speech to call out {rival}', topic: 'the speech diss', heat: 80, valence: 0, hashtag: 'SpeechDiss' },
          flavorText: '',
        },
        week
      );
      return `You thanked God, your team, and then you said your rival’s name with a smile. The cameras cut to them. Nobody breathed.`;
    },
  };
  const text = map[kind]();
  line(text, 'opportunity');
  return text;
}

export function reactToLoss(kind: LossReaction, winner: string, award: string): string {
  const week = useGameStore.getState().week;
  let text: string;
  if (kind === 'clap') {
    usePlayerStore.getState().updateStats([{ stat: 'reputation', delta: 1 }]);
    text = `${winner} won ${award}. You stood and clapped like you meant it. Maybe you did.`;
  } else if (kind === 'side-eye') {
    spawnMoment({ kind: 'meme', headline: `{playerName}’s face when ${winner} won`, topic: 'the side-eye', heat: 60, valence: -10, hashtag: 'TheSideEye' });
    text = `${winner} won ${award}. The camera caught your face. It is a reaction GIF now, forever.`;
  } else {
    applyConsequence(
      {
        statChanges: [{ stat: 'reputation', delta: -10 }, { stat: 'industryRespect', delta: -8 }],
        fansDelta: Math.round(2_000 + (usePlayerStore.getState().player?.stats.fans ?? 0) * 0.03),
        moment: { kind: 'ugly', headline: `{playerName} storms the stage during ${winner}’s acceptance speech`, topic: 'the stage storm', heat: 95, valence: -60, hashtag: 'LetThemFinish' },
        flavorText: '',
      },
      week
    );
    text = `${winner} won ${award}, and you walked up there and took the mic. Security was very gentle. The internet was not.`;
  }
  line(text, kind === 'storm' ? 'drama' : 'social');
  return text;
}
