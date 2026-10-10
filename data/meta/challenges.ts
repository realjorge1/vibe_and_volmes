import type { ChallengeDef } from '../../types/identity';

/**
 * Challenges: a specific kind of life to try and live, BitLife-style. One is
 * featured each real-world week (any can be picked); finishing one is
 * recorded forever on the meta profile and pays lifetime legacy.
 * Steps stay done once done, so "before 25" means it happened before 25.
 */
export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'no-label-no-problem',
    title: 'No Label, No Problem',
    blurb: 'Win Best New Artist without ever signing a deal.',
    icon: 'rocket',
    color: '#36D6FF',
    legacy: 60,
    steps: [
      { label: 'Reach 50K fans, unsigned', test: (s) => s.stats.fans >= 50_000 && !s.hasContract && s.labelOwnedTracks === 0 },
      { label: 'Get nominated, unsigned', test: (s) => (s.nominatedNow || s.nominations > 0) && !s.hasContract && s.labelOwnedTracks === 0 },
      { label: 'Win a Meridian, unsigned', test: (s) => s.awardsWon > 0 && !s.hasContract && s.labelOwnedTracks === 0 },
    ],
  },
  {
    id: 'young-and-famous',
    title: 'Young & Famous',
    blurb: 'A number one record before you turn 21.',
    icon: 'flash',
    color: '#FF4FA3',
    legacy: 70,
    steps: [
      { label: 'Chart before 20', test: (s) => s.bestPositionEver !== null && s.age < 20 },
      { label: 'Top 10 before 21', test: (s) => s.top10s > 0 && s.age < 21 },
      { label: 'Number one before 21', test: (s) => s.number1s > 0 && s.age < 21 },
    ],
  },
  {
    id: 'from-the-cell',
    title: 'Free Me',
    blurb: 'Do time, come home, and go top 10 anyway.',
    icon: 'key',
    color: '#FF8A3D',
    legacy: 70,
    steps: [
      { label: 'Get locked up', test: (s) => s.inJail || s.servedTime },
      { label: 'Serve your time', test: (s) => s.servedTime },
      { label: 'A top-10 song after', test: (s) => s.servedTime && s.bestPositionNow !== null && s.bestPositionNow <= 10 },
    ],
  },
  {
    id: 'family-business',
    title: 'Family Business',
    blurb: 'Three kids, a happy marriage and a Meridian on the mantel.',
    icon: 'home',
    color: '#7CF5C8',
    legacy: 60,
    steps: [
      { label: 'Get married', test: (s) => s.partnerBond === 'married' },
      { label: 'Raise three kids', test: (s) => s.children >= 3 },
      { label: 'Win a Meridian', test: (s) => s.awardsWon > 0 },
    ],
  },
  {
    id: 'the-mogul',
    title: 'The Mogul',
    blurb: 'Own a label with a star on it and two businesses running.',
    icon: 'business',
    color: '#FFCE5C',
    legacy: 80,
    steps: [
      { label: 'Start your label', test: (s) => s.ownsLabel },
      { label: 'Run two businesses', test: (s) => s.ventures >= 2 },
      { label: 'Turn a signee into a star', test: (s) => s.starSignees >= 1 },
    ],
  },
  {
    id: 'taylors-version',
    title: 'Your Version',
    blurb: 'Sign a bad deal, lose your masters, then take them back.',
    icon: 'repeat',
    color: '#A08BFF',
    legacy: 60,
    steps: [
      { label: 'A label owns your masters', test: (s) => s.labelOwnedTracks > 0 },
      { label: 'Re-record a song', test: (s) => s.rerecords > 0 },
      { label: 'Own every master', test: (s) => s.labelOwnedTracks === 0 && s.releases > 0 && s.rerecords > 0 },
    ],
  },
  {
    id: 'villain-arc',
    title: 'Villain Arc',
    blurb: 'Survive three scandals and still sell out a tour.',
    icon: 'skull',
    color: '#FF5470',
    legacy: 60,
    steps: [
      { label: 'Survive a scandal', test: (s) => s.controversiesSurvived >= 1 },
      { label: 'Survive three', test: (s) => s.controversiesSurvived >= 3 },
      { label: 'Finish a tour after', test: (s) => s.controversiesSurvived >= 3 && s.toursDone >= 1 },
    ],
  },
  {
    id: 'comeback-story',
    title: 'The Comeback Story',
    blurb: 'Fall from a peak, then come back bigger.',
    icon: 'refresh-circle',
    color: '#3BE8A6',
    legacy: 70,
    steps: [
      { label: 'Reach 100K fans', test: (s) => s.peakFans >= 100_000 },
      { label: 'Fall into decline', test: (s) => s.arcPhase === 'decline' || s.comebacks > 0 },
      { label: 'Pull off a comeback', test: (s) => s.comebacks >= 1 },
    ],
  },
  {
    id: 'festival-king',
    title: 'Main Stage',
    blurb: 'Play the undercard, then come back and headline.',
    icon: 'sunny',
    color: '#FF8A3D',
    legacy: 60,
    steps: [
      { label: 'Play a festival', test: (s) => s.festivalsPlayed >= 1 },
      { label: 'Play three', test: (s) => s.festivalsPlayed >= 3 },
      { label: 'Headline one', test: (s) => s.headlinedFestival },
    ],
  },
  {
    id: 'perfect-night',
    title: 'Perfect Night',
    blurb: 'Play a 95+ show and win the room forever.',
    icon: 'mic',
    color: '#FF4FA3',
    legacy: 50,
    steps: [
      { label: 'Play your first show', test: (s) => s.showsPlayed >= 1 },
      { label: 'Play an 85+ show', test: (s) => s.bestShow >= 85 },
      { label: 'Play a 95+ show', test: (s) => s.bestShow >= 95 },
    ],
  },
  {
    id: 'rich-and-lonely',
    title: 'Money Over Everything',
    blurb: 'Ten million in the bank, and nobody to share it with.',
    icon: 'cash',
    color: '#7CF5C8',
    legacy: 50,
    steps: [
      { label: 'Have $1M', test: (s) => s.money >= 1_000_000 },
      { label: 'Have $10M', test: (s) => s.money >= 10_000_000 },
      { label: '$10M and single', test: (s) => s.money >= 10_000_000 && s.partnerBond === null },
    ],
  },
  {
    id: 'peacemaker',
    title: 'Peacemaker',
    blurb: 'Win a rival war, then give back five times.',
    icon: 'leaf',
    color: '#5CF2E0',
    legacy: 50,
    steps: [
      { label: 'Win a rival war', test: (s) => s.warScore !== null && s.warScore >= 80 },
      { label: 'Give back three times', test: (s) => s.charityActs >= 3 },
      { label: 'Give back five times', test: (s) => s.charityActs >= 5 },
    ],
  },
];

const BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id: string): ChallengeDef | undefined {
  return BY_ID.get(id);
}
