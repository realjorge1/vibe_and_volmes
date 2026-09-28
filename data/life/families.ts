import type { PlayerArchetype } from '../../types/player';
import type { FamilyTemplate } from '../../types/people';

/**
 * The family each origin story comes with. Pure content: generated once at
 * the start of a career (systems/life/peopleEngine.generateFamily), with the
 * artist's surname and names drawn from data/life/names.ts.
 *
 * Traits are hooks: 'funds-you' pays `allowance` weekly while affinity holds,
 * 'disapproving' weighs on mental health while affinity is negative,
 * 'supportive' cushions neglect. Events can read any of them by name.
 */
export const FAMILIES: Record<PlayerArchetype, FamilyTemplate> = {
  'street-hustler': {
    members: [
      { role: 'parent', title: 'your mom', affinity: 60, traits: ['supportive', 'working-two-jobs'] },
      { role: 'sibling', title: 'your older brother', affinity: 35, traits: ['street-smart'] },
    ],
    intro:
      'Your mom, {1}, works doubles so you can chase this. Your brother {2} says he has your back. Mostly.',
  },
  'church-singer': {
    members: [
      { role: 'parent', title: 'your mom', affinity: -15, traits: ['devout', 'disapproving'] },
      { role: 'parent', title: 'your dad', affinity: 25, traits: ['devout'] },
      { role: 'sibling', title: 'your little sister', affinity: 65, traits: ['fan'] },
    ],
    intro:
      'Your mom, {1}, wanted you singing for the Lord, not the charts. Your dad {2} keeps the peace. Your sister {3} already made you a fan page.',
  },
  'rich-kid': {
    members: [
      { role: 'parent', title: 'your dad', affinity: 30, traits: ['funds-you', 'controlling'], allowance: 200 },
      { role: 'parent', title: 'your mom', affinity: 45, traits: ['funds-you'], allowance: 150 },
    ],
    intro:
      'Your parents, {1} and {2}, are paying for all of this. They mention it often.',
  },
  'underground-rapper': {
    members: [
      { role: 'parent', title: 'your grandma', affinity: 70, traits: ['supportive', 'raised-you'] },
      { role: 'sibling', title: 'your cousin', affinity: 40, traits: ['hype-man'] },
    ],
    intro:
      'Your grandma, {1}, raised you and still calls your mixtapes "your little tapes". Your cousin {2} has been your hype man since the lunch table.',
  },
  'internet-troll': {
    members: [
      { role: 'parent', title: 'your mom', affinity: 15, traits: ['confused'] },
      { role: 'parent', title: 'your dad', affinity: 5, traits: ['confused', 'skeptical'] },
      { role: 'sibling', title: 'your little brother', affinity: 45, traits: ['extremely-online'] },
    ],
    intro:
      'Your parents, {1} and {2}, still do not know what you do online. Your little brother {3} knows everything, and screenshots it.',
  },
  'indie-dreamer': {
    members: [
      { role: 'parent', title: 'your mom', affinity: 55, traits: ['supportive', 'artsy'] },
      { role: 'parent', title: 'your dad', affinity: 0, traits: ['skeptical'] },
    ],
    intro:
      'Your mom, {1}, gave you her old guitar. Your dad {2} gave you the number of a recruiter. You kept the guitar.',
  },
};
