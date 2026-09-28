import type { ControversyDefinition } from '../../types/industry';

/**
 * Controversy catalog. Severity drives base heat + how survivable it is.
 * The PR engine instances these with a `guilty` roll and decays heat
 * weekly unless the player (or a rival) feeds it.
 */
export const CONTROVERSIES: ControversyDefinition[] = [
  {
    id: 'ctrl-offensive-post',
    kind: 'offensive-post',
    severity: 'moderate',
    headline: 'An old post of yours resurfaced and people are furious',
    description: 'Screenshots are spreading. The context is not flattering.',
    baseHeat: 55,
    decayPerWeek: 9,
    truthMatters: true,
    tags: ['cancel', 'social', 'resurface'],
  },
  {
    id: 'ctrl-leaked-audio',
    kind: 'leaked-audio',
    severity: 'severe',
    headline: 'Leaked studio audio has the internet in meltdown',
    description: 'Someone leaked private studio talk. It sounds bad isolated.',
    baseHeat: 70,
    decayPerWeek: 7,
    truthMatters: true,
    tags: ['leak', 'audio', 'cancel'],
  },
  {
    id: 'ctrl-cheating',
    kind: 'cheating',
    severity: 'moderate',
    headline: 'Cheating allegations are dominating the gossip cycle',
    description: 'A partner went public. The blogs are feasting.',
    baseHeat: 60,
    decayPerWeek: 8,
    truthMatters: true,
    tags: ['relationship', 'gossip'],
  },
  {
    id: 'ctrl-ghostwriting',
    kind: 'ghostwriting',
    severity: 'severe',
    headline: 'Ghostwriting accusations are threatening your credibility',
    description: 'A producer claims they wrote your biggest hits.',
    baseHeat: 65,
    decayPerWeek: 6,
    truthMatters: true,
    tags: ['credibility', 'authenticity'],
  },
  {
    id: 'ctrl-violent-incident',
    kind: 'violent-incident',
    severity: 'severe',
    headline: 'A physical altercation involving you is everywhere',
    description: 'Footage of an altercation is circulating fast.',
    baseHeat: 72,
    decayPerWeek: 6,
    truthMatters: true,
    tags: ['violence', 'legal-risk'],
  },
  {
    id: 'ctrl-lawsuit',
    kind: 'lawsuit',
    severity: 'severe',
    headline: 'You are being sued, and it is public',
    description: 'A lawsuit was filed and immediately leaked to press.',
    baseHeat: 50,
    decayPerWeek: 5,
    truthMatters: false,
    tags: ['legal', 'money'],
  },
  {
    id: 'ctrl-addiction',
    kind: 'addiction',
    severity: 'severe',
    headline: 'Concern is spreading about your wellbeing',
    description: 'Public behavior has fans and press worried — and talking.',
    baseHeat: 45,
    decayPerWeek: 7,
    truthMatters: true,
    tags: ['mental-health', 'wellbeing'],
  },
  {
    id: 'ctrl-fake-rumor',
    kind: 'fake-rumor',
    severity: 'minor',
    headline: 'A completely fabricated rumor is going viral anyway',
    description: 'It is not true. It does not matter — it is trending.',
    baseHeat: 40,
    decayPerWeek: 12,
    truthMatters: false,
    tags: ['rumor', 'misinformation'],
  },
  {
    id: 'ctrl-industry-plant',
    kind: 'industry-plant',
    severity: 'minor',
    headline: '"Industry plant" allegations are following you everywhere',
    description: 'The narrative that you are manufactured will not die.',
    baseHeat: 38,
    decayPerWeek: 8,
    truthMatters: false,
    tags: ['authenticity', 'narrative'],
  },
  {
    id: 'ctrl-fan-harassment',
    kind: 'fan-harassment',
    severity: 'moderate',
    headline: 'Your fanbase is being accused of coordinated harassment',
    description: 'Your stans went too far and now you own it.',
    baseHeat: 48,
    decayPerWeek: 9,
    truthMatters: false,
    tags: ['stan-culture', 'fanbase'],
  },
  // referenced by interview answers / rivalry — escalation seeds
  {
    id: 'ctrl-beef-escalation',
    kind: 'fake-rumor',
    severity: 'moderate',
    headline: 'Your war of words just became the main story',
    description: 'What you said in that interview lit a fuse.',
    baseHeat: 52,
    decayPerWeek: 10,
    truthMatters: false,
    tags: ['rivalry', 'beef'],
  },
  {
    id: 'ctrl-tone-deaf',
    kind: 'offensive-post',
    severity: 'moderate',
    headline: 'You are being called tone-deaf and out of touch',
    description: 'Playing the victim did not land the way you hoped.',
    baseHeat: 50,
    decayPerWeek: 9,
    truthMatters: false,
    tags: ['perception', 'cancel'],
  },
  {
    id: 'ctrl-label-feud',
    kind: 'lawsuit',
    severity: 'moderate',
    headline: 'Your public feud with your own label is escalating',
    description: 'Trashing the people who own your masters has consequences.',
    baseHeat: 46,
    decayPerWeek: 8,
    truthMatters: false,
    tags: ['label', 'contract'],
  },
];

export function getControversy(id: string): ControversyDefinition | undefined {
  return CONTROVERSIES.find((c) => c.id === id);
}

export function controversiesBySeverity(
  severity: ControversyDefinition['severity']
): ControversyDefinition[] {
  return CONTROVERSIES.filter((c) => c.severity === severity);
}
