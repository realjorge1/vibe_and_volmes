import type { DmArc } from '../../types/drama';

/**
 * DM ARCS: the conversations that slide into the artist's inbox.
 *
 * Each arc is a tiny branching script. A stage is what they send; the
 * artist answers with a quick reply, and the reply decides what happens to
 * the rest of the game (stats, people, money, a public moment). Some arcs
 * escalate when ignored. Romance is rationed by the DM engine (at most one
 * romantic opener every two weeks) so it spices the game without taking it
 * over.
 *
 * Tokens in what they say: {playerName} {trackTitle} {city} {partner} {rival}
 * {name} (the sender) and the arc's own vars ({mixtape}, {amount}, {spot}, {kid}).
 */
export const DM_ARCS: DmArc[] = [
  // --- Romance -----------------------------------------------------------------------
  {
    id: 'admirer-shot',
    kind: 'admirer',
    weight: 6,
    sender: 'admirer',
    platforms: ['flashpic', 'flashpic', 'tunetok', 'chirper'],
    cooldown: 1,
    start: 'open',
    stages: {
      open: {
        say: [
          ['hey stranger 👀'],
          ['not to be forward', 'but your voice is unfairly attractive'],
          ["ok I've had {trackTitle} on repeat all week and now I have a crush", 'this is your fault 😤'],
          ['you look even better in person 🙈', 'saw you in {city} last week and was too shy to say hi'],
          ["sorry I don't usually do this", "but you're really cute and I had to say it"],
        ],
        replies: [
          { id: 'flirt', label: 'Flirt back 😏', say: ["you're trouble 😏", 'careful, I might start replying more often', 'keep talking 👀'], next: 'flirting', outcome: { consequences: { mentalChanges: [{ axis: 'isolation', delta: -3 }] } } },
          { id: 'friendly', label: 'Keep it friendly', say: ["haha thank you, that's sweet 🙏", 'appreciate you fr 🫶'], next: 'friendzoned', outcome: { consequences: { statChanges: [{ stat: 'fanLoyalty', delta: 1 }] } } },
          { id: 'taken', label: "I'm taken", partnered: true, say: ["appreciate it, but I'm taken 🙏"], next: 'respect', outcome: { consequences: { personChanges: [{ role: 'partner', delta: 3 }], flavorText: 'Someone shot their shot in your DMs. You told them you were taken. Felt good, actually.' } } },
          { id: 'read', label: 'Leave on read', say: [], end: 'close', outcome: { social: { sentiment: 'meme', from: 'public', text: 'got left on read by {playerName} and honestly? still a fan. this is my villain origin story though 💔' } } },
        ],
      },
      flirting: {
        say: [
          ['trouble? you have no idea 😌', 'you free this weekend?'],
          ['smooth', 'prove it. dinner?'],
          ['a whole vibe actually', "let's get a drink before you get too famous to answer"],
        ],
        replies: [
          {
            id: 'date',
            label: 'Ask them out',
            partnered: false,
            say: ["friday. I'll send the spot 😉", "say less. I'll pick the place"],
            next: 'yes',
            roll: {
              p: 0.45,
              then: {
                next: 'yes',
                outcome: {
                  effect: 'date',
                  consequences: { mentalChanges: [{ axis: 'isolation', delta: -8 }], flavorText: 'You took a DM to dinner. Somebody at the next table took a photo. Now the internet wants a name.' },
                  moment: { kind: 'romance', headline: '{playerName} Spotted on a Dinner Date in {city}', topic: 'the dinner date photos', heat: 38, valence: 15, hashtag: '{playerName}Date', tags: ['romance', 'date'] },
                },
              },
              otherwise: {
                next: 'yes',
                outcome: { effect: 'date', consequences: { mentalChanges: [{ axis: 'isolation', delta: -8 }], flavorText: 'You met the person from your DMs. Nobody recognized you. It was the best night you have had in months.' } },
              },
            },
          },
          {
            id: 'cheat',
            label: 'Meet up anyway 😬',
            partnered: true,
            say: ['nobody has to know 🤫'],
            next: 'yes',
            roll: {
              p: 0.55,
              then: {
                next: 'yes',
                outcome: {
                  effect: 'leak',
                  consequences: { personChanges: [{ role: 'partner', delta: -45 }], mentalChanges: [{ axis: 'anxiety', delta: 12 }], spawnControversyId: 'ctrl-cheating', socialReaction: 'cancel', flavorText: 'You met someone from your DMs behind {partner}\'s back. The screenshots were online by morning.' },
                  moment: { kind: 'scandal', headline: '{playerName} Accused of Cheating on {partner} After DMs Leak', topic: 'the leaked DMs', heat: 75, valence: -70, hashtag: '{playerName}Exposed', tags: ['romance', 'cheating', 'leak'] },
                },
              },
              otherwise: {
                end: 'close',
                outcome: { consequences: { mentalChanges: [{ axis: 'anxiety', delta: 8 }], addTags: ['secret-fling'], flavorText: 'You met someone from your DMs. Nobody found out. You check your phone a lot more now.' } },
              },
            },
          },
          { id: 'vibe', label: 'Keep it a vibe', say: ["let's see where this goes 😏"], end: 'close', outcome: { consequences: { mentalChanges: [{ axis: 'isolation', delta: -4 }] } } },
          { id: 'back', label: 'Actually, never mind', say: ['sorry, bad timing for me'], next: 'hurt' },
        ],
      },
      yes: { say: [["it's a date 🥂"], ['finally 😌 see you friday'], ["can't wait 🫶"]], replies: [] },
      friendzoned: { say: [['lol okay noted 😂 still a fan though'], ["damn, friendzoned by my fav 💀 it's okay, I'll survive"]], replies: [] },
      respect: { say: [["respect 🫡 they're lucky"], ['damn ok. happy for you 🥲']], replies: [] },
      hurt: { say: [['wow ok 😐'], ["you could've just said no lol"]], replies: [] },
    },
  },
  {
    id: 'celeb-slide',
    kind: 'celeb-crush',
    weight: 2,
    sender: 'celeb',
    platforms: ['flashpic'],
    minFans: 25_000,
    cooldown: 8,
    start: 'open',
    stages: {
      open: {
        say: [
          ['saw your set last night...', 'you were different 👀'],
          ['ok I need to stop listening to your stuff before bed', "it's becoming a problem"],
          ['we keep ending up at the same parties', 'we should actually talk next time'],
        ],
        replies: [
          { id: 'slide', label: 'Slide back 😌', say: ['so talk now 👀', 'maybe I was performing for you'], next: 'link' },
          { id: 'collab', label: 'Keep it professional', say: ['haha appreciate it! we should collab sometime 🤝'], next: 'collab' },
          { id: 'read', label: 'Leave on read', say: [], end: 'close' },
        ],
      },
      link: {
        say: [['ok so', 'my place has a view. just saying 🌃'], ['dinner somewhere nobody will recognize us 😂', 'thursday?']],
        replies: [
          {
            id: 'go',
            label: 'Say yes',
            partnered: false,
            say: ["thursday. don't be late 😏"],
            next: 'date',
            roll: {
              p: 0.7,
              then: {
                next: 'date',
                outcome: {
                  effect: 'date',
                  consequences: { fansDelta: 2500, statChanges: [{ stat: 'charisma', delta: 2 }], flavorText: 'You went out with {name}. A photographer was outside. By midnight you were a "rumored couple".' },
                  moment: { kind: 'romance', headline: '{playerName} and {name} Spotted Leaving Dinner Together', topic: 'the {name} photos', heat: 60, valence: 20, hashtag: '{playerName}And{name}', tags: ['romance', 'celebrity'] },
                },
              },
              otherwise: { next: 'date', outcome: { effect: 'date', consequences: { flavorText: 'You went out with {name}. Somehow, nobody found out. Yet.' } } },
            },
          },
          {
            id: 'go-taken',
            label: 'Go anyway 😬',
            partnered: true,
            say: ["I shouldn't... but ok"],
            next: 'date',
            roll: {
              p: 0.7,
              then: {
                next: 'date',
                outcome: {
                  effect: 'leak',
                  consequences: { personChanges: [{ role: 'partner', delta: -55 }], spawnControversyId: 'ctrl-cheating', socialReaction: 'cancel', mentalChanges: [{ axis: 'anxiety', delta: 14 }], flavorText: "Photos of you and {name} went everywhere. {partner} saw them before you could explain." },
                  moment: { kind: 'scandal', headline: '{playerName} Caught With {name} Behind {partner}\'s Back', topic: 'the {name} photos', heat: 85, valence: -75, hashtag: '{playerName}Cheated', tags: ['romance', 'cheating', 'celebrity'] },
                },
              },
              otherwise: { end: 'close', outcome: { consequences: { addTags: ['secret-fling'], mentalChanges: [{ axis: 'paranoia', delta: 8 }], flavorText: 'You saw {name}. Nobody knows. You keep checking the blogs anyway.' } } },
            },
          },
          { id: 'no', label: 'Not yet', say: ["let's take it slow 🙂"], end: 'close' },
        ],
      },
      collab: {
        say: [['bet. my people will call your people 😌']],
        replies: [],
      },
      date: { say: [["can't wait 😌"], ['see you then 🖤']], replies: [] },
    },
  },
  {
    id: 'shipper',
    kind: 'shipper',
    weight: 2,
    sender: 'crowd',
    platforms: ['flashpic', 'tunetok'],
    partnered: true,
    cooldown: 6,
    start: 'open',
    stages: {
      open: {
        say: [['ok but when are you and {partner} getting married 😭😭'], ["you and {partner} are my parents now. I don't make the rules"], ['post {partner} more. that is all. thank you']],
        replies: [
          { id: 'tease', label: 'Tease them 👀', say: ['stay tuned 👀'], end: 'close', outcome: { consequences: { personChanges: [{ role: 'partner', delta: 3 }], flavorText: 'You teased a fan about {partner}. The screenshot did numbers.' }, moment: { kind: 'romance', headline: '{playerName} Teases Fans About {partner}', topic: 'the {partner} tease', heat: 28, valence: 35, tags: ['romance'] } } },
          { id: 'private', label: 'Keep it private', say: ['some things stay private 🤍'], end: 'close', outcome: { consequences: { personChanges: [{ role: 'partner', delta: 2 }] } } },
        ],
      },
    },
  },
  {
    id: 'ex-text',
    kind: 'ex',
    weight: 2,
    sender: 'crowd',
    platforms: ['flashpic', 'chirper'],
    cooldown: 10,
    start: 'open',
    stages: {
      open: {
        say: [['u up?'], ['heard your new song', 'was it about me 👀'], ['I miss us sometimes', "don't be weird about it"]],
        replies: [
          { id: 'reply', label: 'Reply', say: ['…maybe it was', 'I think about it too sometimes'], next: 'again', outcome: { consequences: { mentalChanges: [{ axis: 'depression', delta: 3 }] } } },
          { id: 'read', label: 'Leave on read', say: [], end: 'close', outcome: { consequences: { statChanges: [{ stat: 'mentalHealth', delta: 2 }] } } },
          { id: 'block', label: 'Block', say: [], end: 'block', outcome: { consequences: { statChanges: [{ stat: 'mentalHealth', delta: 3 }], flavorText: 'Your ex texted "u up?" at 2am. You blocked them. Growth.' } } },
        ],
      },
      again: {
        say: [['come over then', "for old times' sake"], ['we should talk in person']],
        replies: [
          { id: 'go', label: 'Go over', partnered: true, say: ['on my way'], end: 'close', roll: { p: 0.5, then: { end: 'close', outcome: { effect: 'leak', consequences: { personChanges: [{ role: 'partner', delta: -40 }], spawnControversyId: 'ctrl-cheating', flavorText: "You went to see your ex. Someone saw your car outside. {partner} found out from a blog." }, moment: { kind: 'scandal', headline: '{playerName} Seen at an Ex\'s Place at 3AM', topic: 'the 3AM visit', heat: 65, valence: -60, hashtag: '{playerName}Caught', tags: ['romance', 'cheating'] } } }, otherwise: { end: 'close', outcome: { consequences: { addTags: ['secret-fling'], mentalChanges: [{ axis: 'anxiety', delta: 6 }], flavorText: 'You saw your ex. Nobody found out. That might be worse.' } } } } },
          { id: 'go-single', label: 'Go over', partnered: false, say: ['fine. one talk.'], end: 'close', outcome: { consequences: { mentalChanges: [{ axis: 'depression', delta: 5 }], flavorText: 'You went back to your ex for "one talk". It was not one talk.' } } },
          { id: 'no', label: "No. We're done", say: ["we're done. take care"], end: 'close', outcome: { consequences: { statChanges: [{ stat: 'mentalHealth', delta: 4 }] } } },
        ],
      },
    },
  },

  // --- Fans: devoted, obsessed, small -------------------------------------------------
  {
    id: 'superfan',
    kind: 'superfan',
    weight: 5,
    sender: 'crowd',
    platforms: ['flashpic', 'tunetok', 'chirper'],
    start: 'open',
    stages: {
      open: {
        say: [
          ["I'VE BEEN A FAN SINCE DAY ONE", "you probably won't see this but your music got me through this year"],
          ['I got your lyrics tattooed on my arm 😭', 'is that weird'],
          ["I've played {trackTitle} 412 times", 'my streaming app sent me a concerned email'],
          ['I named my cat after you', 'he bites people. just like your verses 🔥'],
        ],
        replies: [
          { id: 'love', label: 'Reply with love', say: ['this means everything, thank you 🥹', "you're the reason I do this 🫶"], next: 'joy', outcome: { consequences: { statChanges: [{ stat: 'fanLoyalty', delta: 2 }] }, social: { sentiment: 'hype', from: 'fan', text: '{playerName} REPLIED TO MY DM I AM SHAKING 😭😭😭 never doubted {him} once' } } },
          { id: 'voice', label: 'Send a voice note', say: ['🎤 Voice message (0:23)'], next: 'joy', outcome: { consequences: { fansDelta: 600, statChanges: [{ stat: 'fanLoyalty', delta: 3 }, { stat: 'charisma', delta: 1 }], socialReaction: 'positive', flavorText: 'You sent a superfan a voice note. They posted it. Half the fanbase cried.' }, moment: { kind: 'best', headline: '{playerName} Sends a Superfan a Voice Note', topic: 'the voice note', heat: 32, valence: 70, tags: ['fans', 'wholesome'] } } },
          { id: 'read', label: 'Leave on read', say: [], end: 'close' },
        ],
      },
      joy: { say: [['OMG YOU REPLIED', "I'M SCREAMING", "I'm framing this"], ['I literally cannot breathe', 'THANK YOU 😭😭']], replies: [] },
    },
  },
  {
    id: 'obsessed',
    kind: 'obsessed',
    weight: 2,
    sender: 'crowd',
    platforms: ['flashpic', 'chirper'],
    minFans: 5_000,
    cooldown: 10,
    start: 'open',
    stages: {
      open: {
        say: [
          // Never about the player's own posts: those may be their real photos (systems/social/protect).
          ['who were you with at the party last night', 'I saw you in someone else’s story'],
          ['you were online at 4am again', "are you sleeping? I worry about you"],
          ['good morning ☀️', 'good afternoon', 'good night 🌙', 'why are you ignoring me'],
        ],
        replies: [
          { id: 'boundary', label: 'Set a boundary', say: ["appreciate the support, but this isn't okay. please respect my space 🙏"], next: 'sorry' },
          { id: 'block', label: 'Block them', say: [], end: 'block' },
        ],
        ignored: { weeks: 1, next: 'closer' },
      },
      closer: {
        say: [['I saw you at the airport today 👀', "you didn't see me", 'I waved'], ['I know you got my messages', 'it says seen']],
        replies: [
          { id: 'team', label: 'Tell your team', say: [], next: 'security', outcome: { consequences: { mentalChanges: [{ axis: 'paranoia', delta: 4 }], flavorText: 'You forwarded a fan\'s messages to your team. They took it seriously. That scared you more.' } } },
          { id: 'block', label: 'Block them', say: [], end: 'block', outcome: { consequences: { mentalChanges: [{ axis: 'paranoia', delta: 3 }] } } },
        ],
        ignored: { weeks: 1, next: 'outside' },
      },
      outside: {
        say: [["I'm outside the studio rn 🙂", 'the one on {spot}', 'come say hi']],
        replies: [
          { id: 'security', label: 'Call security', say: [], end: 'close', outcome: { effect: 'security', consequences: { moneyDelta: -1500, mentalChanges: [{ axis: 'paranoia', delta: 6 }], addTags: ['has-security'], flavorText: 'A fan showed up outside your studio. You hired security. His name is Big Ray and he does not smile.' } } },
          {
            id: 'meet',
            label: 'Go say hi (risky)',
            say: ['coming down for one minute'],
            end: 'close',
            roll: {
              p: 0.5,
              stat: 'charisma',
              then: { end: 'close', outcome: { consequences: { statChanges: [{ stat: 'reputation', delta: 2 }], flavorText: 'You went down to meet the fan outside the studio. You signed a hoodie and they cried. It was sweet. You still told security.' }, moment: { kind: 'best', headline: '{playerName} Surprises a Fan Waiting Outside the Studio', topic: 'the studio surprise', heat: 30, valence: 55, tags: ['fans'] } } },
              otherwise: { end: 'close', outcome: { consequences: { mentalChanges: [{ axis: 'anxiety', delta: 12 }, { axis: 'paranoia', delta: 10 }], flavorText: 'You went down to meet the fan outside the studio. They grabbed your arm and would not let go. Someone filmed it.' }, moment: { kind: 'ugly', headline: 'Chaotic Fan Encounter Outside {playerName}\'s Studio Goes Viral', topic: 'the studio encounter', heat: 45, valence: -20, tags: ['fans', 'security'] } } },
            },
          },
        ],
      },
      sorry: { say: [['ok', 'sorry', 'I just love you so much']], replies: [] },
      security: { say: [['you told your TEAM about me??', 'wow', 'unbelievable']], replies: [] },
    },
    vars: { spot: ['5th', 'Sunset Blvd', 'Marlowe St', 'the corner by the bodega', 'King St'] },
  },
  {
    id: 'kid-fan',
    kind: 'kid',
    weight: 3,
    sender: 'kid',
    platforms: ['flashpic', 'tunetok'],
    minFans: 2_000,
    cooldown: 6,
    start: 'open',
    stages: {
      open: {
        say: [
          ["Hi! I'm {kid}'s mom 😊 she's 7 and sings {trackTitle} every single day", 'any chance you could say hi to her? it would make her whole year 🥹'],
          ["hello! my son {kid} (8) wants to be you when he grows up", 'he practices your dance in the kitchen every night 😂 a hello would mean the world'],
        ],
        replies: [
          { id: 'voice', label: 'Send a voice note', say: ['🎤 Voice message (0:31)'], next: 'thanks', outcome: { consequences: { fansDelta: 900, statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'fanLoyalty', delta: 3 }], socialReaction: 'viral', flavorText: 'You sent a little fan a voice note. Their parent posted the reaction video. The internet melted.' }, moment: { kind: 'best', headline: "Watch a Young Fan Lose It Over {playerName}'s Voice Note", topic: 'the kid fan video', heat: 48, valence: 90, hashtag: '{playerName}Wholesome', tags: ['fans', 'wholesome'] } } },
          { id: 'merch', label: 'Send signed merch', say: ['sending something in the mail 💌'], next: 'thanks', outcome: { consequences: { moneyDelta: -80, statChanges: [{ stat: 'reputation', delta: 2 }], flavorText: 'You mailed a signed hoodie to a seven-year-old fan. Small thing. Big thing.' } } },
          { id: 'read', label: 'Leave on read', say: [], end: 'close' },
        ],
      },
      thanks: { say: [['THANK YOU 😭', 'she is screaming. literally screaming. I will send video']], replies: [] },
    },
    vars: { kid: ['Maya', 'Zion', 'Amara', 'Leo', 'Nia', 'Jayden', 'Ava', 'Malik'] },
  },

  // --- The internet's chaos ----------------------------------------------------------------
  {
    id: 'wannabe',
    kind: 'wannabe',
    weight: 6,
    sender: 'crowd',
    platforms: ['tunetok', 'flashpic', 'chirper'],
    start: 'open',
    stages: {
      open: {
        say: [
          ['yo listen to my mixtape 🔥🔥', '{mixtape}', "it's crazy I promise"],
          ["sign me bro I'm the next big thing", 'just need one shot'],
          ['can we collab? I got bars', "I'll send you a 16 rn", '🎤 Voice message (2:47)'],
        ],
        replies: [
          {
            id: 'listen',
            label: 'Give it a listen',
            say: ["ok I'm listening"],
            roll: {
              p: 0.25,
              stat: 'talent',
              then: { next: 'gem' },
              otherwise: { next: 'mid' },
            },
          },
          { id: 'roast', label: 'Roast them 💀', say: ['bro this is a hate crime against ears 💀', 'my speakers filed a complaint'], end: 'close', outcome: { consequences: { fansDelta: 300, statChanges: [{ stat: 'reputation', delta: -2 }], flavorText: 'You roasted a fan\'s mixtape in the DMs. They posted it. Half the internet laughed; the other half called you a bully.' }, moment: { kind: 'meme', headline: '{playerName} Roasts a Fan\'s Mixtape and the Internet Can\'t Decide', topic: 'the mixtape roast', heat: 34, valence: -10, hashtag: 'MixtapeRoast', tags: ['banter'] } } },
          { id: 'luck', label: 'Wish them luck', say: ['keep going, the grind pays off 🙏'], end: 'close', outcome: { consequences: { statChanges: [{ stat: 'reputation', delta: 1 }] } } },
          { id: 'ignore', label: 'Ignore', say: [], end: 'close' },
        ],
        ignored: { weeks: 1, next: 'spam' },
      },
      gem: {
        say: [["YO you actually listened??", "wanna hop on a track? I'll do it for free"]],
        replies: [
          { id: 'feature', label: 'Put them on a track', say: ["send me your best verse. we're doing this"], end: 'close', outcome: { effect: 'friend', consequences: { fansDelta: 1200, statChanges: [{ stat: 'authenticity', delta: 3 }, { stat: 'reputation', delta: 3 }], flavorText: 'You put an unknown from your DMs on a track. They can actually rap. The underground loves you for it.' }, moment: { kind: 'best', headline: '{playerName} Puts an Unknown Rapper From the DMs On', topic: 'putting the DM rapper on', heat: 42, valence: 65, hashtag: '{playerName}PutMeOn', tags: ['music', 'wholesome'] } } },
          { id: 'later', label: 'Maybe later', say: ["you're nice. keep going, I'll reach out"], end: 'close' },
        ],
      },
      mid: {
        say: [['so... what you think 👀']],
        replies: [
          { id: 'honest', label: 'Be honest', say: ['keep working on it. the flow needs work but you got something'], next: 'grateful', outcome: { consequences: { statChanges: [{ stat: 'reputation', delta: 1 }] } } },
          { id: 'hype', label: 'Hype them up anyway', say: ["it's fire bro 🔥"], end: 'close', outcome: { consequences: { statChanges: [{ stat: 'authenticity', delta: -2 }], flavorText: 'You told a fan their mixtape was fire. It was not fire. They posted your DM everywhere.' }, moment: { kind: 'meme', headline: '{playerName} Called This Mixtape "Fire" and Fans Have Questions', topic: 'the "fire" mixtape co-sign', heat: 30, valence: -15, hashtag: 'ItsFireBro', tags: ['banter'] } } },
        ],
      },
      grateful: { say: [['real. thank you for listening fr 🙏']], replies: [] },
      spam: { say: [['bro??', 'bro', 'BRO', 'ok I see how it is 😤']], replies: [] },
    },
    vars: { mixtape: ['soundcloud.com/lil-vxpor/fire-tape-vol-9', 'audiomack.com/yungstatic/trenches-deluxe', 'soundcloud.com/kidblaze99/no-skips-3', 'bit.ly/my-tape-goes-crazy'] },
  },
  {
    id: 'beggar',
    kind: 'beggar',
    weight: 3,
    sender: 'crowd',
    platforms: ['flashpic', 'chirper'],
    minFans: 1_000,
    cooldown: 3,
    start: 'open',
    stages: {
      open: {
        say: [
          ['I know this is random', 'could you send {amount} for rent?', "I'm really struggling and your music keeps me going"],
          ['can you cashapp me {amount}? 🙏', "I'll pay you back I swear"],
        ],
        replies: [
          {
            id: 'send',
            label: 'Send it',
            say: ['sent 🤍 hope it helps'],
            roll: {
              p: 0.6,
              then: { next: 'grateful', outcome: { consequences: { moneyDelta: -150, statChanges: [{ stat: 'reputation', delta: 3 }], flavorText: 'You sent a fan rent money. They posted the screenshot crying. Strangers called you a saint.' }, moment: { kind: 'charity', headline: '{playerName} Quietly Paid a Struggling Fan\'s Rent', topic: "covering a fan's rent", heat: 34, valence: 65, tags: ['charity', 'fans'] } } },
              otherwise: { next: 'scam', outcome: { consequences: { moneyDelta: -150, flavorText: 'You sent a "fan" rent money. They were running the same message to forty artists. The screenshots are a meme now.' }, moment: { kind: 'meme', headline: '{playerName} Got Finessed by a Fake Fan', topic: 'the fake fan finesse', heat: 26, valence: -5, tags: ['banter', 'scam'] } } },
            },
          },
          { id: 'no', label: "Can't, sorry", say: ["can't do that, sorry. wishing you the best 🙏"], end: 'close' },
          { id: 'ignore', label: 'Ignore', say: [], end: 'close' },
        ],
      },
      grateful: { say: [['I literally just cried', "I'll never forget this 🥹"]], replies: [] },
      scam: { say: [['thanks 😂'], ['🤑']], replies: [] },
    },
    vars: { amount: ['$50', '$75', '$100', '$150', '$200'] },
  },
  {
    id: 'scammer',
    kind: 'scammer',
    weight: 2,
    sender: 'brand',
    platforms: ['flashpic', 'chirper'],
    cooldown: 4,
    start: 'open',
    stages: {
      open: {
        say: [
          ['Hi dear 💎 we are luxury watch brand LUXORA', 'we want you as our AMBASSADOR!!', 'just pay $200 shipping and the watch is yours'],
          ['Congratulations!! 🎉 You have been selected for a VERIFIED badge 🔵', 'confirm your account at verify-badge-center.co within 24 hours'],
        ],
        replies: [
          { id: 'pay', label: 'Pay the fee', say: ['ok sending now'], end: 'close', outcome: { consequences: { moneyDelta: -200, flavorText: 'You paid "shipping" for a luxury watch. There is no watch. There was never a watch.' } } },
          { id: 'ask', label: 'Ask for details', say: ['what brand is this exactly?'], next: 'pushy' },
          { id: 'report', label: 'Report it', say: [], end: 'block' },
        ],
      },
      pushy: {
        say: [['dear only $200!!! offer ends TODAY', 'trust me 🙏🙏']],
        replies: [
          { id: 'pay', label: 'Pay the fee', say: ['fine'], end: 'close', outcome: { consequences: { moneyDelta: -200, flavorText: 'You paid the fee. LUXORA has stopped replying. LUXORA was never real.' } } },
          { id: 'report', label: 'Report it', say: [], end: 'block' },
        ],
      },
    },
  },
  {
    id: 'conspiracy',
    kind: 'conspiracy',
    weight: 2,
    sender: 'crowd',
    platforms: ['chirper', 'tunetok'],
    minFans: 3_000,
    cooldown: 6,
    start: 'open',
    stages: {
      open: {
        say: [
          ['I decoded your album', 'track 3 is about the illuminati right', 'blink twice if your label is holding you hostage'],
          ['why did you wear a triangle necklace at your last show 🔺', 'I KNOW what that means'],
          ['the numbers in your last caption add up to 33', 'coincidence? I think NOT'],
        ],
        replies: [
          { id: 'play', label: 'Play along 😂', say: ['👁️👄👁️'], end: 'close', outcome: { consequences: { fansDelta: 250, flavorText: 'You replied "👁️👄👁️" to a conspiracy fan. They posted it as proof. The conspiracy has a fandom now.' }, moment: { kind: 'meme', headline: '{playerName} Replies to an Illuminati Theory With One Emoji', topic: 'the 👁️👄👁️ reply', heat: 32, valence: 15, hashtag: 'BlinkTwice', tags: ['banter'] } } },
          { id: 'deny', label: 'Deny everything', say: ["it's a necklace. it's just a necklace"], next: 'suspicious' },
          { id: 'ignore', label: 'Ignore', say: [], end: 'close' },
        ],
      },
      suspicious: { say: [["that's exactly what they'd make you say", 'stay safe 🔺']], replies: [] },
    },
  },
  {
    id: 'hater-dm',
    kind: 'hater',
    weight: 4,
    sender: 'crowd',
    platforms: ['chirper', 'flashpic', 'tunetok'],
    start: 'open',
    stages: {
      open: {
        say: [["you're trash lol"], ['your last song made me lose brain cells', 'refund my ears'], ['fell off. hard. 🗑️'], ['how are you famous', 'genuinely asking']],
        replies: [
          {
            id: 'clap',
            label: 'Clap back',
            say: ["and yet you're in my DMs 😂", "you spelled 'fan' wrong", 'thanks for the stream 🫶'],
            end: 'close',
            roll: {
              p: 0.6,
              stat: 'charisma',
              then: { end: 'close', outcome: { consequences: { fansDelta: 450, statChanges: [{ stat: 'charisma', delta: 1 }], flavorText: 'A hater came to your DMs. Your clapback ended up on every meme page.' }, moment: { kind: 'meme', headline: "{playerName}'s Clapback to a Hater Is the Internet's New Favorite Screenshot", topic: 'the clapback', heat: 38, valence: 25, hashtag: '{playerName}Clapback', tags: ['banter'] } } },
              otherwise: { end: 'close', outcome: { consequences: { statChanges: [{ stat: 'reputation', delta: -3 }], flavorText: 'You argued with a hater in the DMs for an hour. They posted all of it. You do not look great.' }, moment: { kind: 'ugly', headline: '{playerName} Spent an Hour Arguing With a Random Hater', topic: 'the DM argument with a hater', heat: 30, valence: -30, tags: ['banter'] } } },
            },
          },
          { id: 'kind', label: 'Kill them with kindness', say: ['sending love anyway 🫶'], next: 'confused', outcome: { consequences: { statChanges: [{ stat: 'reputation', delta: 1 }, { stat: 'mentalHealth', delta: 1 }] } } },
          { id: 'block', label: 'Block', say: [], end: 'block' },
        ],
      },
      confused: { say: [["...ok that's actually kinda nice", 'your music is still mid though']], replies: [] },
    },
  },
  {
    id: 'rival-dm',
    kind: 'rival',
    weight: 3,
    sender: 'rival',
    platforms: ['flashpic', 'chirper'],
    needsRival: true,
    cooldown: 6,
    start: 'open',
    stages: {
      open: {
        say: [['you really wanna do this publicly?'], ['keep my name out your mouth'], ["we both know who's winning this"]],
        replies: [
          { id: 'escalate', label: 'Escalate', say: ['see you on the charts 🏆', "it's not a competition when only one of us is trying"], end: 'close', outcome: { consequences: { rivalryIntensityDelta: { delta: 15 }, statChanges: [{ stat: 'fanLoyalty', delta: 2 }], flavorText: 'You told {rival} to see you on the charts. They took it personally. Good.' } } },
          {
            id: 'truce',
            label: 'Offer a truce',
            say: ['this is getting old. truce?'],
            roll: {
              p: 0.45,
              stat: 'reputation',
              then: { next: 'truce', outcome: { consequences: { rivalryIntensityDelta: { delta: -30 }, statChanges: [{ stat: 'reputation', delta: 3 }, { stat: 'industryRespect', delta: 3 }], flavorText: 'You offered {rival} a truce. They took it. The internet is furious there is no more beef.' }, moment: { kind: 'best', headline: '{playerName} and {rival} Squash the Beef', topic: 'the truce with {rival}', heat: 45, valence: 50, tags: ['beef', 'truce'] } } },
              otherwise: { next: 'laughed', outcome: { consequences: { rivalryIntensityDelta: { delta: 8 }, flavorText: '{rival} laughed at your truce offer. Then screenshotted it.' }, moment: { kind: 'beef', headline: '{rival} Posts {playerName}\'s Truce Request: "lol no"', topic: 'the rejected truce', heat: 48, valence: -25, hashtag: 'LolNo', tags: ['beef'] } } },
            },
          },
          { id: 'leak', label: 'Screenshot & post it', say: [], end: 'close', outcome: { consequences: { rivalryIntensityDelta: { delta: 20 }, fansDelta: 700, statChanges: [{ stat: 'reputation', delta: -2 }], flavorText: "You posted {rival}'s DM for the world to see. It's war now." }, moment: { kind: 'beef', headline: "{playerName} Leaks {rival}'s DMs: 'Keep My Name Out Your Mouth'", topic: "{rival}'s leaked DM", heat: 62, valence: 5, hashtag: '{rival}DMs', tags: ['beef', 'leak'] } } },
        ],
      },
      truce: { say: [['...fine. respect.', 'studio sometime?']], replies: [] },
      laughed: { say: [['lol. no.']], replies: [] },
    },
  },
];

export function getArc(id: string): DmArc | undefined {
  return DM_ARCS.find((a) => a.id === id);
}
