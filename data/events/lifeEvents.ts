import type { GameEvent } from '../../types/events';

/**
 * Life events: situations that only happen at certain ages. Pure content,
 * gated by the `age_gte`, `age_lte` and `life_stage` triggers (age is derived
 * from the week — see systems/life/age.ts). Every event here must carry at
 * least one age trigger; the life tests enforce it.
 */
export const LIFE_EVENTS: GameEvent[] = [
  // ─── Young & hungry (18–24) ────────────────────────────────────────────────
  {
    id: 'life-parents-college',
    category: 'personal',
    title: 'Mom Sent Another Link',
    description:
      'A college application portal, a deadline in bold, and "just look at it, baby." Your parents still think music is a phase.',
    weight: 9,
    triggers: [{ type: 'age_lte', value: 20 }],
    choices: [
      {
        id: 'enroll-part-time',
        text: 'Enroll part-time. Keep a backup plan.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 6 },
            { stat: 'writing', delta: 3 },
            { stat: 'energy', delta: -10 },
          ],
          addTags: ['part-time-student'],
          flavorText:
            'Lectures by day, sessions by night. Your parents stop sending links.',
        },
      },
      {
        id: 'all-in',
        text: 'Tell them music is the plan. The only plan.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 6 },
            { stat: 'mentalHealth', delta: -6 },
          ],
          addTags: ['all-in-on-music'],
          flavorText:
            'The dinner goes quiet. You meant every word, and now you have to prove it.',
        },
      },
      {
        id: 'one-year',
        text: 'Ask for one year to prove it.',
        consequences: {
          statChanges: [{ stat: 'discipline', delta: 4 }],
          addTags: ['one-year-deadline'],
          flavorText:
            'One year. Your mom writes the date on the fridge calendar.',
        },
      },
    ],
    tags: ['life', 'family', 'young'],
    unique: true,
  },
  {
    id: 'life-roommate-party',
    category: 'social',
    title: 'Party the Night Before',
    description:
      'Your biggest showcase is tomorrow. Your roommate just told forty people to come over tonight.',
    weight: 9,
    triggers: [{ type: 'life_stage', lifeStage: 'young' }],
    choices: [
      {
        id: 'join',
        text: 'It would be rude not to.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 4 },
            { stat: 'energy', delta: -20 },
          ],
          fansDelta: 150,
          flavorText:
            'You meet half the scene in your own kitchen. The showcase is rough.',
        },
      },
      {
        id: 'headphones',
        text: 'Noise-cancelling headphones and an early night.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 5 },
            { stat: 'energy', delta: 5 },
          ],
          flavorText:
            'You sleep through the bass. You kill the showcase the next day.',
        },
      },
      {
        id: 'perform',
        text: 'Turn the living room into a venue.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 3 },
            { stat: 'energy', delta: -10 },
          ],
          fansDelta: 400,
          socialReaction: 'positive',
          flavorText:
            'Forty phones filming. Three of the clips travel further than your singles.',
        },
      },
    ],
    tags: ['life', 'young', 'party'],
    cooldown: 10,
  },
  {
    id: 'life-twenty-first',
    category: 'opportunity',
    title: 'Twenty-One',
    description:
      'A promoter heard it is your 21st. They are offering a VIP table and a set at the city\'s loudest club.',
    weight: 14,
    triggers: [
      { type: 'age_gte', value: 21 },
      { type: 'age_lte', value: 21 },
    ],
    choices: [
      {
        id: 'go-all-out',
        text: 'Take the table and the stage.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 4 },
            { stat: 'reputation', delta: -3 },
            { stat: 'energy', delta: -25 },
          ],
          fansDelta: 1500,
          socialReaction: 'mixed',
          flavorText:
            'The set is electric. The photos from 3 a.m. are less flattering.',
        },
      },
      {
        id: 'lowkey',
        text: 'Dinner with the people who knew you first.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 10 },
            { stat: 'fanLoyalty', delta: 2 },
          ],
          flavorText:
            'Nobody films anything. It is the best night you have had in months.',
        },
      },
      {
        id: 'work-it',
        text: 'Play the set, skip the table, take the fee.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 3 },
            { stat: 'energy', delta: -15 },
          ],
          moneyDelta: 800,
          flavorText:
            'You spend your 21st sober and paid. Future you will appreciate it.',
        },
      },
    ],
    tags: ['life', 'birthday', 'young'],
    unique: true,
  },
  {
    id: 'life-student-loans',
    category: 'personal',
    title: 'The Letter From the Loan Servicer',
    description:
      'Repayment starts next month. The number on the page is bigger than anything a stream has ever paid you.',
    weight: 7,
    triggers: [{ type: 'age_lte', value: 25 }],
    choices: [
      {
        id: 'pay',
        text: 'Pay it. Adults pay things.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 3 },
            { stat: 'mentalHealth', delta: 3 },
          ],
          moneyDelta: -1200,
          flavorText: 'It hurts. It also stops the letters.',
        },
      },
      {
        id: 'defer',
        text: 'Defer. Future you can deal with it.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -5 }],
          addTags: ['in-debt'],
          flavorText: 'The letters stop. The interest does not.',
        },
      },
      {
        id: 'side-gig',
        text: 'Pick up weekend shifts until it is handled.',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: -15 },
            { stat: 'creativity', delta: -3 },
          ],
          moneyDelta: 600,
          flavorText: 'Double shifts. The songs get shorter and angrier.',
        },
      },
    ],
    tags: ['life', 'money', 'young'],
    cooldown: 20,
  },

  // ─── Prime years (25–34) ───────────────────────────────────────────────────
  {
    id: 'life-quarter-life',
    category: 'personal',
    title: 'Everyone Has a Real Job Now',
    description:
      'Your feed is engagement rings, first houses and promotions. Your high school friends have dental plans.',
    weight: 9,
    triggers: [
      { type: 'age_gte', value: 24 },
      { type: 'age_lte', value: 28 },
      { type: 'fans_lte', value: 50_000 },
    ],
    choices: [
      {
        id: 'double-down',
        text: 'Mute them all and get back in the booth.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 6 },
            { stat: 'mentalHealth', delta: -6 },
          ],
          flavorText: 'You work like someone who has something to prove. You do.',
        },
      },
      {
        id: 'day-job',
        text: 'Take a day job. Music on nights and weekends.',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: -15 },
            { stat: 'authenticity', delta: -2 },
            { stat: 'mentalHealth', delta: 4 },
          ],
          moneyDelta: 2000,
          addTags: ['day-job'],
          flavorText: 'A steady paycheck. Less time. Weirdly, less fear.',
        },
      },
      {
        id: 'write-it',
        text: 'Write the song about it.',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 5 },
            { stat: 'creativity', delta: 4 },
            { stat: 'mentalHealth', delta: 2 },
          ],
          flavorText: 'It is the most honest thing you have written.',
        },
      },
    ],
    tags: ['life', 'prime', 'doubt'],
    unique: true,
  },
  {
    id: 'life-wedding-season',
    category: 'social',
    title: 'Wedding Season',
    description:
      'Your oldest friend is getting married and wants you to sing at the ceremony. For free, obviously.',
    weight: 8,
    triggers: [
      { type: 'age_gte', value: 26 },
      { type: 'age_lte', value: 33 },
    ],
    choices: [
      {
        id: 'sing',
        text: 'Sing. Cry. Do the electric slide.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 6 },
            { stat: 'charisma', delta: 2 },
            { stat: 'fanLoyalty', delta: 3 },
          ],
          flavorText:
            'Half the guests ask for your socials. The bride calls it the best part of the day.',
        },
      },
      {
        id: 'charge',
        text: 'Offer a "friends and family" rate.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          moneyDelta: 500,
          flavorText: 'They pay. Things are weird at the rehearsal dinner.',
        },
      },
      {
        id: 'skip',
        text: 'Say you are on the road that weekend.',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: 10 },
            { stat: 'mentalHealth', delta: -3 },
          ],
          flavorText: 'You were not on the road. They know.',
        },
      },
    ],
    tags: ['life', 'prime', 'friends'],
    cooldown: 16,
  },
  {
    id: 'life-ten-year-reunion',
    category: 'social',
    title: 'The Ten-Year Reunion',
    description:
      'The invite has a QR code and a theme. Everyone who said you would never make it will be there.',
    weight: 10,
    triggers: [
      { type: 'age_gte', value: 27 },
      { type: 'age_lte', value: 29 },
    ],
    choices: [
      {
        id: 'perform',
        text: 'Go, and bring a guitar.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 4 },
            { stat: 'energy', delta: -10 },
          ],
          fansDelta: 800,
          socialReaction: 'positive',
          flavorText:
            'The gym goes quiet when you start. Your old chemistry teacher films the whole thing.',
        },
      },
      {
        id: 'flex',
        text: 'Go, and rent a car you cannot afford.',
        consequences: {
          statChanges: [
            { stat: 'charisma', delta: 5 },
            { stat: 'authenticity', delta: -4 },
            { stat: 'reputation', delta: -2 },
          ],
          moneyDelta: -600,
          socialReaction: 'mixed',
          flavorText: 'Someone recognizes the rental sticker. It ends up online.',
        },
      },
      {
        id: 'skip',
        text: 'Skip it. You have nothing to prove to them.',
        consequences: {
          statChanges: [{ stat: 'creativity', delta: 2 }],
          flavorText: 'You spend the night writing instead. That is its own answer.',
        },
      },
    ],
    tags: ['life', 'prime', 'nostalgia'],
    unique: true,
  },
  {
    id: 'life-thirty',
    category: 'personal',
    title: 'Thirty',
    description:
      'The "30 Under 30" list dropped last week. You were never going to be on it now.',
    weight: 14,
    triggers: [
      { type: 'age_gte', value: 30 },
      { type: 'age_lte', value: 30 },
    ],
    choices: [
      {
        id: 'party',
        text: 'Throw the party of the decade.',
        consequences: {
          statChanges: [{ stat: 'energy', delta: -20 }],
          fansDelta: 2000,
          moneyDelta: -1500,
          socialReaction: 'positive',
          flavorText:
            'Everyone comes. The photos are everywhere. Thirty looks good on you.',
        },
      },
      {
        id: 'reflect',
        text: 'A quiet day. A long walk. A notebook.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 10 },
            { stat: 'writing', delta: 4 },
          ],
          flavorText: 'You come home with twelve pages and a clear head.',
        },
      },
      {
        id: 'thread',
        text: 'Post a thread about aging in the music business.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 5 }],
          fansDelta: 1000,
          socialReaction: 'viral',
          flavorText:
            'It goes further than any of your songs. Older fans come out of the woodwork.',
        },
      },
    ],
    tags: ['life', 'birthday', 'prime'],
    unique: true,
  },
  {
    id: 'life-two-day-hangover',
    category: 'personal',
    title: 'The Two-Day Hangover',
    description:
      'One afterparty and you lost Wednesday and Thursday. Your body has started keeping receipts.',
    weight: 7,
    triggers: [{ type: 'age_gte', value: 30 }],
    choices: [
      {
        id: 'cut-back',
        text: 'Cut back. You are a professional.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 6 },
            { stat: 'energy', delta: 10 },
            { stat: 'charisma', delta: -2 },
          ],
          addTags: ['cut-back-partying'],
          flavorText: 'You leave parties at midnight now. Your voice thanks you.',
        },
      },
      {
        id: 'push-it',
        text: 'Push through. Sleep is for the retired.',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: -20 },
            { stat: 'mentalHealth', delta: -4 },
          ],
          fansDelta: 300,
          flavorText: 'Still the last one standing. It is getting harder to hide.',
        },
      },
      {
        id: 'wellness',
        text: 'Discover green juice and cold plunges.',
        consequences: {
          statChanges: [
            { stat: 'energy', delta: 15 },
            { stat: 'authenticity', delta: -2 },
          ],
          moneyDelta: -300,
          flavorText: 'You feel incredible. You will not stop talking about it.',
        },
      },
    ],
    tags: ['life', 'health', 'prime'],
    cooldown: 20,
  },
  {
    id: 'life-ar-asks-age',
    category: 'career',
    title: 'The A&R Asks Your Age',
    description:
      'The meeting was going great. Then the A&R leans back and asks, casually, how old you are.',
    weight: 8,
    triggers: [
      { type: 'age_gte', value: 33 },
      { type: 'lacks_contract' },
    ],
    choices: [
      {
        id: 'lie',
        text: 'Knock five years off.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -8 },
            { stat: 'industryRespect', delta: 2 },
          ],
          addTags: ['age-lie'],
          flavorText: 'They nod. You now have a birthday to keep track of.',
        },
      },
      {
        id: 'own-it',
        text: 'Tell the truth and pitch your experience.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 6 },
            { stat: 'industryRespect', delta: 3 },
            { stat: 'mentalHealth', delta: -3 },
          ],
          flavorText: 'The room shifts. Some respect it. Some were never going to.',
        },
      },
      {
        id: 'walk-out',
        text: 'Ask what that has to do with the music, then leave.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 3 },
            { stat: 'discipline', delta: 2 },
          ],
          flavorText: 'You walk out lighter. There will be other rooms.',
        },
      },
    ],
    tags: ['life', 'industry', 'ageism'],
    unique: true,
  },

  // ─── Established (35–44) ───────────────────────────────────────────────────
  {
    id: 'life-called-unc',
    category: 'rivalry',
    title: 'They Called You "Unc"',
    description:
      'A 19-year-old with a hit song called you "unc" on a livestream. Two million people heard it.',
    weight: 9,
    triggers: [{ type: 'life_stage', lifeStage: 'established' }],
    choices: [
      {
        id: 'mentor',
        text: 'Lean in. Offer them a feature and some advice.',
        consequences: {
          statChanges: [
            { stat: 'industryRespect', delta: 5 },
            { stat: 'fanLoyalty', delta: 3 },
            { stat: 'reputation', delta: 2 },
          ],
          socialReaction: 'positive',
          flavorText: 'The internet calls it the most gracious response of the year.',
        },
      },
      {
        id: 'clap-back',
        text: 'Drop a verse reminding them who paved the road.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -2 }],
          fansDelta: 3000,
          addTags: ['generational-beef'],
          socialReaction: 'viral',
          flavorText: 'Unc still has it. The kid responds within the hour.',
        },
      },
      {
        id: 'chase',
        text: 'Quietly study their sound.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: -4 },
            { stat: 'authenticity', delta: -6 },
          ],
          fansDelta: 1500,
          flavorText:
            'Your next single sounds like it was made by a teenager. Longtime fans notice immediately.',
        },
      },
    ],
    tags: ['life', 'established', 'generational'],
    cooldown: 20,
  },
  {
    id: 'life-parents-aging',
    category: 'personal',
    title: 'The Call From Home',
    description:
      '{ParentTitle}, {parent}, had a fall. Fine, mostly. {parent} says you do not need to come home, which means you do.',
    weight: 8,
    triggers: [{ type: 'age_gte', value: 35 }],
    choices: [
      {
        id: 'go-home',
        text: 'Cancel everything and fly home for a month.',
        consequences: {
          statChanges: [
            { stat: 'mentalHealth', delta: 6 },
            { stat: 'authenticity', delta: 4 },
            { stat: 'energy', delta: -10 },
          ],
          fansDelta: -500,
          moneyDelta: -1500,
          personChanges: [{ role: 'parent', delta: 15 }],
          flavorText:
            'A month of hospital coffee and old photo albums with {parent}. You would do it again.',
        },
      },
      {
        id: 'send-money',
        text: 'Send money and call every night.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          moneyDelta: -3000,
          personChanges: [{ role: 'parent', delta: 3 }],
          flavorText: 'It helps. It is not the same as being there, and {parent} said so.',
        },
      },
      {
        id: 'write-it',
        text: 'Write the song you have been avoiding.',
        consequences: {
          statChanges: [
            { stat: 'writing', delta: 6 },
            { stat: 'creativity', delta: 4 },
            { stat: 'mentalHealth', delta: -4 },
          ],
          personChanges: [{ role: 'parent', delta: 5 }],
          flavorText: 'You finish it at 4 a.m. You play it for {parent} over the phone.',
        },
      },
    ],
    tags: ['life', 'family', 'established'],
    cooldown: 30,
  },

  // ─── Midlife (45–59) ───────────────────────────────────────────────────────
  {
    id: 'life-nostalgia-offer',
    category: 'opportunity',
    title: 'The Throwback Tour',
    description:
      'A promoter wants you on a "Throwback" tour. Old hits only. The money is very good.',
    weight: 9,
    triggers: [
      { type: 'life_stage', lifeStage: 'midlife' },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'take-it',
        text: 'Take it. The old songs paid for the house.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: -6 },
            { stat: 'creativity', delta: -4 },
            { stat: 'energy', delta: -15 },
          ],
          fansDelta: 2000,
          moneyDelta: 8000,
          flavorText: 'Arenas full of people singing every word of your twenties.',
        },
      },
      {
        id: 'new-album',
        text: 'Pass. Make a new album instead.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 8 },
            { stat: 'industryRespect', delta: 3 },
          ],
          fansDelta: -1000,
          flavorText: 'Some fans only want the old you. Critics want this one.',
        },
      },
      {
        id: 'both',
        text: 'Do the tour, but slip three new songs into the set.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 3 },
            { stat: 'energy', delta: -25 },
          ],
          moneyDelta: 4000,
          flavorText: 'The new songs get the bathroom break. Every night, a few more stay.',
        },
      },
    ],
    tags: ['life', 'midlife', 'nostalgia'],
    cooldown: 24,
  },
  {
    id: 'life-doctor-wants-to-talk',
    category: 'personal',
    title: 'The Doctor Wants to Talk',
    description:
      'Your bloodwork came back. The doctor closes the laptop before she starts talking, which is never good.',
    weight: 8,
    triggers: [
      { type: 'age_gte', value: 45 },
      { type: 'lacks_tag', tag: 'health-conscious' },
    ],
    choices: [
      {
        id: 'change-everything',
        text: 'Change everything. Diet, sleep, the lot.',
        consequences: {
          statChanges: [
            { stat: 'discipline', delta: 8 },
            { stat: 'energy', delta: 10 },
            { stat: 'mentalHealth', delta: 4 },
          ],
          addTags: ['health-conscious'],
          removeTags: ['health-risk'],
          flavorText: 'Six months later the numbers are better than they were at thirty.',
        },
      },
      {
        id: 'ignore',
        text: 'Get a second opinion. From your manager.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: -3 }],
          addTags: ['health-risk'],
          flavorText: 'Your manager says you look great. Your manager is not a doctor.',
        },
      },
      {
        id: 'tell-fans',
        text: 'Tell the fans what is going on.',
        consequences: {
          statChanges: [
            { stat: 'fanLoyalty', delta: 6 },
            { stat: 'authenticity', delta: 4 },
            { stat: 'discipline', delta: 4 },
          ],
          fansDelta: 1000,
          addTags: ['health-conscious'],
          removeTags: ['health-risk'],
          socialReaction: 'positive',
          flavorText: 'The messages pour in. So do the gym selfies from fans.',
        },
      },
    ],
    tags: ['life', 'health', 'midlife'],
    cooldown: 30,
  },
  {
    id: 'life-documentary',
    category: 'opportunity',
    title: 'The Documentary Crew',
    description:
      'A streaming service wants to follow you for a year. Cameras everywhere. "Your legacy, in your words."',
    weight: 8,
    triggers: [
      { type: 'age_gte', value: 50 },
      { type: 'stat_gte', stat: 'industryRespect', value: 40 },
    ],
    choices: [
      {
        id: 'all-access',
        text: 'All access. Nothing off-limits.',
        consequences: {
          statChanges: [
            { stat: 'authenticity', delta: 6 },
            { stat: 'mentalHealth', delta: -5 },
          ],
          fansDelta: 5000,
          socialReaction: 'mixed',
          flavorText: 'The trailer shows you crying in a parking lot. It trends for a week.',
          historyRecord: {
            kind: 'statement',
            summary: 'let a documentary crew film every part of your life',
            severity: 40,
            tags: ['documentary', 'legacy'],
          },
        },
      },
      {
        id: 'your-terms',
        text: 'Yes, with final cut.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 2 }],
          fansDelta: 2500,
          moneyDelta: 3000,
          flavorText: 'It is a beautiful film. Critics call it a very long press release.',
        },
      },
      {
        id: 'decline',
        text: 'No. The music is the documentary.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 4 }],
          flavorText: 'You keep your life yours.',
        },
      },
    ],
    tags: ['life', 'midlife', 'legacy'],
    unique: true,
  },
  {
    id: 'life-retirement-rumors',
    category: 'drama',
    title: 'They Think You Are Done',
    description:
      'A tabloid ran a "sources say" piece claiming you are quietly retiring. Your phone has not stopped since.',
    weight: 8,
    triggers: [{ type: 'age_gte', value: 55 }],
    choices: [
      {
        id: 'surprise-drop',
        text: 'Answer with a surprise single at midnight.',
        consequences: {
          statChanges: [
            { stat: 'creativity', delta: 2 },
            { stat: 'energy', delta: -15 },
          ],
          fansDelta: 3000,
          socialReaction: 'viral',
          flavorText: 'Midnight. No announcement. The single says everything.',
        },
      },
      {
        id: 'farewell-tour',
        text: 'Lean in. Announce a farewell tour.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: -3 }],
          fansDelta: 2000,
          moneyDelta: 6000,
          addTags: ['farewell-tour'],
          socialReaction: 'mixed',
          flavorText: 'Every date sells out in an hour. Everyone assumes it will not be the last.',
        },
      },
      {
        id: 'ignore',
        text: 'Say nothing. Let them wonder.',
        consequences: {
          statChanges: [{ stat: 'mentalHealth', delta: 3 }],
          flavorText: 'The rumor burns out in a week. You were busy anyway.',
        },
      },
    ],
    tags: ['life', 'midlife', 'rumor'],
    cooldown: 30,
  },

  // ─── Elder statesman (60+) ─────────────────────────────────────────────────
  {
    id: 'life-lifetime-achievement',
    category: 'opportunity',
    title: 'Lifetime Achievement',
    description:
      'The Academy wants to give you a lifetime achievement award. There will be a montage. There will be a speech.',
    weight: 12,
    triggers: [
      { type: 'life_stage', lifeStage: 'elder' },
      { type: 'stat_gte', stat: 'industryRespect', value: 50 },
    ],
    choices: [
      {
        id: 'accept',
        text: 'Accept, and thank everyone who doubted you.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 6 },
            { stat: 'industryRespect', delta: 5 },
          ],
          fansDelta: 8000,
          socialReaction: 'positive',
          flavorText: 'Standing ovation. Three generations of artists in the front row.',
          historyRecord: {
            kind: 'award',
            summary: 'accepted a lifetime achievement award',
            severity: 60,
            tags: ['award', 'legacy'],
          },
        },
      },
      {
        id: 'decline',
        text: 'Decline. You are not done yet.',
        consequences: {
          statChanges: [{ stat: 'authenticity', delta: 6 }],
          fansDelta: 2000,
          socialReaction: 'viral',
          flavorText: '"Lifetime? I\'m still working." It is on T-shirts within a day.',
        },
      },
      {
        id: 'callout',
        text: 'Accept, and use the speech to call out the industry.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: -5 },
            { stat: 'authenticity', delta: 8 },
          ],
          fansDelta: 6000,
          socialReaction: 'mixed',
          flavorText: 'They cut your mic. The clip gets more views than the whole broadcast.',
          historyRecord: {
            kind: 'statement',
            summary: 'called out the industry in a lifetime achievement speech',
            severity: 55,
            tags: ['speech', 'legacy'],
          },
        },
      },
    ],
    tags: ['life', 'elder', 'legacy'],
    unique: true,
  },
  {
    id: 'life-grandkids-generation',
    category: 'social',
    title: 'A Kid Covers Your Song',
    description:
      'A 16-year-old covered one of your oldest songs in their bedroom. Forty million views. Most of them have no idea it is yours.',
    weight: 9,
    triggers: [
      { type: 'age_gte', value: 58 },
      { type: 'has_released_track' },
    ],
    choices: [
      {
        id: 'duet',
        text: 'Invite them to sing it with you on stage.',
        consequences: {
          statChanges: [
            { stat: 'reputation', delta: 4 },
            { stat: 'fanLoyalty', delta: 4 },
          ],
          fansDelta: 6000,
          socialReaction: 'viral',
          flavorText: 'The duet is the moment of the summer. A whole generation finds your catalog.',
        },
      },
      {
        id: 'credit',
        text: 'Post the original with a proud little caption.',
        consequences: {
          statChanges: [{ stat: 'charisma', delta: 2 }],
          fansDelta: 2500,
          socialReaction: 'positive',
          flavorText: 'Streams of the original triple overnight.',
        },
      },
      {
        id: 'royalties',
        text: 'Have your lawyers check the royalties.',
        consequences: {
          statChanges: [{ stat: 'reputation', delta: -4 }],
          moneyDelta: 2000,
          socialReaction: 'negative',
          flavorText: 'Legally correct. The internet does not care about legally correct.',
        },
      },
    ],
    tags: ['life', 'elder', 'legacy'],
    cooldown: 26,
  },
];
