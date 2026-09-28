/**
 * Career tracks — 10 tracks × 10 levels, generated from compact curves.
 * These employ ROOMMATES, PARTNERS and TOWNIES. The artist's own occupation
 * is the music career, bridged from the main game (lifesim/bridge.ts) — their
 * "job" is the rest of this app.
 */

import type { SkillId } from '../core/types';

export interface CareerLevel {
  title: string;
  salary: number; // per shift
  start: number; // minute of day
  end: number;
  days: number[]; // weekdays 1..7 (1 = Monday)
  skills: Partial<Record<SkillId, number>>;
  friends: number; // household friend count required to advance PAST this level
}

export interface CareerTrack {
  id: string;
  name: string;
  icon: string;
  levels: CareerLevel[];
}

const WD = [1, 2, 3, 4, 5];

function mkTrack(
  id: string,
  name: string,
  icon: string,
  titles: string[],
  base: number,
  growth: number,
  skillOrder: [SkillId, SkillId, SkillId],
  start: number,
  end: number,
  days: number[] = WD
): CareerTrack {
  const levels: CareerLevel[] = titles.map((title, i) => {
    const skills: Partial<Record<SkillId, number>> = {};
    const p = Math.min(10, Math.ceil(i * 0.95));
    const s = Math.min(10, Math.ceil(i * 0.6));
    const t = Math.min(10, Math.ceil(i * 0.35));
    if (p > 0) skills[skillOrder[0]] = p;
    if (s > 0) skills[skillOrder[1]] = s;
    if (t > 0) skills[skillOrder[2]] = t;
    return {
      title,
      salary: Math.round((base * Math.pow(growth, i)) / 5) * 5,
      start,
      end,
      days,
      skills,
      friends: Math.max(0, Math.floor(i * 1.2) - 1),
    };
  });
  return { id, name, icon, levels };
}

export const CAREER_TRACKS: Record<string, CareerTrack> = {
  business: mkTrack('business', 'Business', '💼', [
    'Mailroom Clerk', 'Office Temp', 'Junior Analyst', 'Account Manager',
    'Department Head', 'Vice President', 'Senior VP', 'CFO', 'CEO',
    'Chairman of Everything',
  ], 160, 1.26, ['charisma', 'logic', 'creativity'], 9 * 60, 15 * 60),

  entertainment: mkTrack('entertainment', 'Entertainment', '🎬', [
    'Street Performer', 'Open-Mic Regular', 'Backup Dancer', 'Commercial Actor',
    'Soap Regular', 'Headliner', 'Movie Lead', 'Director', 'Studio Boss',
    'Living Legend',
  ], 140, 1.30, ['charisma', 'creativity', 'body'], 10 * 60, 16 * 60, [1, 2, 3, 4, 6]),

  law: mkTrack('law', 'Law Enforcement', '🚓', [
    'Crossing Guard', 'Cadet', 'Patrol Officer', 'Desk Sergeant', 'Detective',
    'Undercover Lead', 'Lieutenant', 'Tactical Chief', 'Police Chief',
    'Commissioner',
  ], 170, 1.24, ['body', 'logic', 'charisma'], 8 * 60, 14 * 60),

  crime: mkTrack('crime', 'Life of Shadows', '🥷', [
    'Pickpocket', 'Lookout', 'Getaway Driver', 'Con Artist', 'Safecracker',
    'Smuggler', 'Heist Planner', 'Syndicate Captain', 'Crime Boss',
    'Phantom Kingpin',
  ], 150, 1.32, ['creativity', 'body', 'logic'], 21 * 60, 26 * 60 - 1440 + 1440, [1, 2, 4, 5, 6]),

  medicine: mkTrack('medicine', 'Medicine', '🩺', [
    'Orderly', 'EMT', 'Night Nurse', 'Intern', 'Resident',
    'General Practitioner', 'Specialist', 'Surgeon', 'Chief of Medicine',
    'Miracle Worker',
  ], 180, 1.25, ['logic', 'body', 'charisma'], 7 * 60, 14 * 60),

  military: mkTrack('military', 'Military', '🎖️', [
    'Recruit', 'Private', 'Corporal', 'Drill Instructor', 'Squad Leader',
    'Lieutenant', 'Commander', 'Colonel', 'General', 'Sky Marshal',
  ], 175, 1.22, ['body', 'mechanical', 'logic'], 6 * 60, 12 * 60),

  politics: mkTrack('politics', 'Politics', '🏛️', [
    'Campaign Volunteer', 'City Clerk', 'Ward Aide', 'Council Member', 'Mayor',
    'State Representative', 'Senator', 'Governor', 'Ambassador',
    'Voice of the People',
  ], 155, 1.28, ['charisma', 'logic', 'creativity'], 9 * 60, 15 * 60),

  athletics: mkTrack('athletics', 'Pro Athletics', '🏅', [
    'Team Mascot', 'Bench Warmer', 'Rookie', 'Starter', 'All-Star', 'MVP',
    'Team Captain', 'Coach', 'Franchise Owner', 'Hall of Famer',
  ], 165, 1.29, ['body', 'charisma', 'logic'], 9 * 60, 15 * 60, [2, 3, 4, 5, 6]),

  science: mkTrack('science', 'Science', '🔬', [
    'Lab Assistant', 'Field Technician', 'Researcher', 'Project Lead',
    'Inventor', 'Theorist', 'Chief Scientist', 'Prize Candidate', 'Visionary',
    'Quantum Pioneer',
  ], 170, 1.27, ['logic', 'mechanical', 'creativity'], 10 * 60, 16 * 60),

  adventure: mkTrack('adventure', 'Extreme Adventure', '🪂', [
    'Bungee Tester', 'Stunt Double', 'Whitewater Guide', 'Storm Chaser',
    'Wing Walker', 'Volcano Photographer', 'Deep-Sea Explorer', 'Summit Guide',
    'Orbit Candidate', 'Legend of the Edge',
  ], 145, 1.33, ['body', 'creativity', 'mechanical'], 11 * 60, 17 * 60, [1, 3, 5, 6, 7]),
};

// Fix crime's overnight shift to sane minutes (21:00 → 03:00 handled by engine
// as an end < start wraparound).
CAREER_TRACKS.crime.levels.forEach((l) => {
  l.start = 21 * 60;
  l.end = 3 * 60;
});

export interface ChanceCard {
  id: string;
  text: string;
  riskLabel: string;
  safeLabel: string;
  /** Skill that tilts the odds of the risky choice. */
  skill: SkillId;
  goodPay: number; // multiplier of daily salary
  badPay: number; // negative multiplier
  goodText: string;
  badText: string;
}

export const CHANCE_CARDS: ChanceCard[] = [
  {
    id: 'cc_shortcut',
    text: 'A senior colleague quietly offers you their shortcut for the big quarterly task. It smells faintly of rule-bending.',
    riskLabel: 'Take the shortcut', safeLabel: 'Do it by the book', skill: 'logic',
    goodPay: 2.0, badPay: -1.0,
    goodText: 'The shortcut works flawlessly. Management is dazzled.',
    badText: 'The shortcut collapses spectacularly. You cover the damages.',
  },
  {
    id: 'cc_speech',
    text: 'The boss loses their voice minutes before a major presentation and thrusts the notes into your hands.',
    riskLabel: 'Give the speech', safeLabel: 'Call in sick', skill: 'charisma',
    goodPay: 2.5, badPay: -0.8,
    goodText: 'You bring the house down. A bonus appears.',
    badText: 'You freeze mid-sentence for a full minute. The silence costs you.',
  },
  {
    id: 'cc_machine',
    text: 'The ancient office machine everyone fears has jammed again. A crowd gathers around you expectantly.',
    riskLabel: 'Fix it yourself', safeLabel: 'Call maintenance', skill: 'mechanical',
    goodPay: 1.8, badPay: -0.7,
    goodText: 'One decisive whack. It purrs. You are a legend.',
    badText: 'It emits a sound machines should not make. Deductions follow.',
  },
  {
    id: 'cc_wager',
    text: 'A rival department challenges yours to a charity fitness gauntlet with a cash pot.',
    riskLabel: 'Compete', safeLabel: 'Spectate politely', skill: 'body',
    goodPay: 2.2, badPay: -0.6,
    goodText: 'You demolish the obstacle course. The pot is yours.',
    badText: 'You pull something important in front of everyone.',
  },
  {
    id: 'cc_pitch',
    text: 'You have an unscheduled elevator ride with the head of the company, who says: "Impress me."',
    riskLabel: 'Pitch your wild idea', safeLabel: 'Discuss the weather', skill: 'creativity',
    goodPay: 2.8, badPay: -0.9,
    goodText: 'They love it. Funding and a raise materialize.',
    badText: 'They step out mid-pitch. At the wrong floor. On purpose.',
  },
  {
    id: 'cc_recipe',
    text: 'The office potluck is tomorrow and rumor says the CEO judges people by their casseroles.',
    riskLabel: 'Cook something bold', safeLabel: 'Bring napkins', skill: 'cooking',
    goodPay: 1.6, badPay: -0.5,
    goodText: 'Your dish causes a quiet, reverent silence. Promotion tailwinds.',
    badText: 'Two colleagues go home early. It was the casserole.',
  },
];
