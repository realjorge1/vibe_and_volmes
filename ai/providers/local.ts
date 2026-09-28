import type { AIProvider, AIRequest, AIResult, CareerCapsule } from '../../types/ai';

/**
 * The always-on, $0, offline, deterministic provider. It is NOT a fallback of
 * last resort — it is the default truth of the game. It reads the structured
 * GenSpec (never natural language) and renders memory-aware text by seeded
 * recombination, so output references the player's actual scandals, rivals,
 * and arc the same way a cloud model would, just without the prose variety.
 *
 * Deterministic: identical spec+seed → identical output, which makes every
 * local generation perfectly cacheable.
 */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed: string) {
  const rnd = mulberry32(hashString(seed));
  return {
    pick: <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)],
    chance: (p: number) => rnd() < p,
  };
}

function memoryClause(cap: CareerCapsule, rng: ReturnType<typeof makeRng>): string {
  if (cap.activeControversy && rng.chance(0.7)) {
    return rng.pick([
      `after the ${cap.activeControversy.kind.replace(/-/g, ' ')} situation`,
      `with the ${cap.activeControversy.kind.replace(/-/g, ' ')} still everywhere`,
      `mid-scandal`,
    ]);
  }
  if (cap.topRival && cap.topRival.intensity > 40 && rng.chance(0.7)) {
    return rng.pick([
      `and ${cap.topRival.name} is watching`,
      `right in front of ${cap.topRival.name}`,
      cap.topRival.legendary
        ? `— this ${cap.topRival.name} feud is legendary now`
        : `while the ${cap.topRival.name} thing simmers`,
    ]);
  }
  if (cap.memorableBeats.length && rng.chance(0.55)) {
    const b = rng.pick(cap.memorableBeats);
    return rng.pick([
      `(we still remember when they ${b.summary.toLowerCase()})`,
      `— some of us never forgot the ${b.kind}`,
      `after everything with the ${b.kind}`,
    ]);
  }
  return rng.pick([
    `in their ${cap.arcPhase} era`,
    cap.momentum > 30 ? `on this run` : cap.momentum < -30 ? `mid-slump` : ``,
    ``,
  ]);
}

/** Segment-flavored sign-off so the same line reads as a different fan. */
const SEGMENT_FLAIR: Record<string, string[]> = {
  hardcore: ['day one btw', 'the deep cuts know', 'never doubted'],
  casual: ['i guess', 'idk i just heard it', 'not that deep'],
  stan: ['DEFEND THEM WITH MY LIFE', 'cope harder', 'WE WON'],
  toxic: ['anyway flop', 'this aged like milk', 'industry plant'],
  local: ['we knew first', 'put the city on', 'homegrown'],
  international: ['🌍 worldwide', 'streaming from abroad', 'global takeover'],
};

/** Platform medium tail — clips the post into the right register. */
const PLATFORM_TAIL: Record<string, string[]> = {
  chirper: ['', 'ratio', 'quote tweeting this forever'],
  flashpic: ['📸✨', 'the aesthetic', '#nofilter'],
  tunetok: ['POV:', 'the way—', '0:14 and i felt that'],
  vibestream: ['— DEVELOPING', 'sources confirm', 'full story'],
};

function renderSocial(req: AIRequest): string {
  const cap = req.spec.capsule;
  const rng = makeRng(req.spec.seed);
  const sentiment = String(req.spec.params.sentiment ?? 'neutral');
  const count = Number(req.spec.params.count ?? 3);
  const platform = String(req.spec.params.platform ?? '');
  const segment = String(req.spec.params.segment ?? '');
  const name = cap.artistName;
  const track = cap.latestTrack;

  const banks: Record<string, string[]> = {
    hype: [
      `${name} ${memoryClause(cap, rng)} and STILL the best to do it. obsessed`,
      `nobody talks about how ${name} carried ${cap.genre} ${memoryClause(cap, rng)}`,
      `${track ? `"${track}"` : 'this rollout'} ${memoryClause(cap, rng)}?? album of the year discussion over`,
    ],
    hostile: [
      `${name} really thought we'd forget ${memoryClause(cap, rng)}. we didn't.`,
      `the ${name} fall off is crazy ${memoryClause(cap, rng)} #fell`,
      `imagine still defending ${name} ${memoryClause(cap, rng)}. couldn't be me`,
    ],
    shade: [
      `not ${name} dropping ${track ? `"${track}"` : 'a single'} ${memoryClause(cap, rng)} like nothing happened 😭`,
      `${name} ${memoryClause(cap, rng)}… anyway who asked`,
      `“${cap.reputationTier} artist of the year” ${name} ${memoryClause(cap, rng)}`,
    ],
    news: [
      `${name} (${cap.fameTier}, ${cap.fanBand} fans) trends again ${memoryClause(cap, rng)}.`,
      `SOURCES: ${name}'s camp responds ${memoryClause(cap, rng)}.`,
      `${cap.genre.toUpperCase()} REPORT — ${name} ${memoryClause(cap, rng)}, label silent.`,
    ],
    meme: [
      `${name} ${memoryClause(cap, rng)} got me CRYING this edit is insane 💀`,
      `me explaining the ${name} timeline ${memoryClause(cap, rng)} to my mom:`,
      `${name} ${memoryClause(cap, rng)} aged like milk lmaooo`,
    ],
    critical: [
      `${track ? `"${track}"` : 'the new direction'} is fine but ${name} ${memoryClause(cap, rng)} — we expected more`,
      `${name} is talented, the ${memoryClause(cap, rng)} narrative is exhausting though`,
    ],
    positive: [
      `genuinely rooting for ${name} ${memoryClause(cap, rng)}. growth is real`,
      `${name} ${memoryClause(cap, rng)} and handling it better than i would`,
    ],
    neutral: [
      `${name} ${memoryClause(cap, rng)}. thoughts?`,
      `so where does ${name} go from here ${memoryClause(cap, rng)}`,
    ],
  };

  const pool = banks[sentiment] ?? banks.neutral;
  const flair = SEGMENT_FLAIR[segment];
  const tail = PLATFORM_TAIL[platform];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let line = pool[(hashString(req.spec.seed + i) % pool.length)];
    // Voice it as the dominant fan segment / platform when known.
    if (tail && platform === 'tunetok') {
      const lead = tail[hashString(req.spec.seed + 'p' + i) % tail.length];
      if (lead) line = `${lead} ${line}`;
    } else if (tail) {
      const t = tail[hashString(req.spec.seed + 'p' + i) % tail.length];
      if (t) line = `${line} ${t}`;
    }
    if (flair && rng.chance(0.5)) {
      line = `${line} — ${flair[hashString(req.spec.seed + 's' + i) % flair.length]}`;
    }
    out.push(line);
  }
  return out.join('\n');
}

function take(
  seed: string,
  count: number,
  build: (i: number, rng: ReturnType<typeof makeRng>) => string
): string {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(build(i, makeRng(seed + '#' + i)).trim());
  }
  return out.filter(Boolean).join('\n');
}

/** In-character interview question prompts that escalate with controversy. */
function renderInterview(req: AIRequest): string {
  const cap = req.spec.capsule;
  const tone = String(req.spec.params.tone ?? 'probing');
  const count = Number(req.spec.params.count ?? 4);
  const rival = cap.topRival?.name ?? 'your biggest rival';
  const ctrl = cap.activeControversy?.kind.replace(/-/g, ' ');

  const byTone: Record<string, string[]> = {
    softball: [
      `${cap.fameTier} suits you — when did it start feeling real?`,
      `Walk me through the ${cap.genre} record everyone's playing right now.`,
      `Who were you before any of ${cap.fanBand} people knew the name?`,
    ],
    neutral: [
      `You're ${cap.arcPhase.replace(/-/g, ' ')} — where does this go next?`,
      `What does ${cap.latestTrack ? `"${cap.latestTrack}"` : 'the new direction'} say that you couldn't say out loud?`,
    ],
    probing: [
      `Some say the "${cap.reputationTier}" label is fair. Is it?`,
      `${ctrl ? `Let's not dance around the ${ctrl}.` : `The momentum cooled. Be honest about why.`}`,
      `You changed after the come-up. Did you lose something getting here?`,
    ],
    gotcha: [
      `${rival} did it first and arguably better. Defend that.`,
      `${ctrl ? `Off the record's over — the ${ctrl}. Yes or no?` : `People think you're overrated. Convince them on air.`}`,
      `Your fans excuse everything. Doesn't that scare you?`,
    ],
    hostile: [
      `${ctrl ? `You owe people an answer on the ${ctrl}. Now.` : `Why should anyone still take you seriously?`}`,
      `${rival} called you a phase. The numbers kind of agree. React.`,
      `Was any of it real, or just a very good ${cap.genre} marketing run?`,
    ],
  };
  const pool = byTone[tone] ?? byTone.probing;
  return take(req.spec.seed, count, (i, rng) =>
    pool[(hashString(req.spec.seed + i) % pool.length)] ||
    `${cap.artistName}, ${memoryClause(cap, rng)} — talk about it.`
  );
}

/** Lyric line ideas for a theme, colored by the player's world. */
function renderLyric(req: AIRequest): string {
  const cap = req.spec.capsule;
  const theme = String(req.spec.params.theme ?? 'flex');
  const lines = Number(req.spec.params.lines ?? 4);
  const rival = cap.topRival?.name ?? 'them';

  const banks: Record<string, string[]> = {
    flex: [
      `Came up ${cap.arcPhase.replace(/-/g, ' ')}, now it's ${cap.fanBand} deep`,
      `${cap.genre} king, they study how I sleep`,
      `Said I'd fold, now the whole game on repeat`,
    ],
    heartbreak: [
      `You left in the ${cap.arcPhase.replace(/-/g, ' ')}, took the quiet with you`,
      `Still hear ${cap.latestTrack ? `"${cap.latestTrack}"` : 'that song'} and it ain't about you — it is`,
      `Fame got loud so I wouldn't hear the empty`,
    ],
    diss: [
      `${rival} want my lane, can't merge with no engine`,
      `Talk that ${cap.reputationTier.toLowerCase()} talk, you a press release`,
      `I'm the ${cap.fameTier.toLowerCase()}, you the footnote, stay seated`,
    ],
    motivational: [
      `If you almost quit ${cap.arcPhase.replace(/-/g, ' ')}, this one's yours`,
      `They counted me out at every ${cap.fanBand} door`,
      `Slump don't mean stop, it mean load before the roar`,
    ],
    party: [
      `${cap.genre} shaking the room, ${cap.fanBand} in the building`,
      `No phones up, just us and the ceiling`,
      `Pour it for the version of me they weren't feeling`,
    ],
    introspective: [
      `3am, ${cap.reputationTier.toLowerCase()} on the timeline, who am I off it`,
      `Counted ${cap.fanBand} faces, still couldn't find one mine`,
      `Fame's a mirror that only shows you the outline`,
    ],
    love: [
      `Ordinary Tuesday, you and the ${cap.genre} low`,
      `Whole world wants the ${cap.fameTier.toLowerCase()}, you want the slow`,
      `Stay when the ${cap.arcPhase.replace(/-/g, ' ')} fades — that's all I know`,
    ],
  };
  const pool = banks[theme] ?? banks.flex;
  return take(req.spec.seed, lines, (i) => pool[(hashString(req.spec.seed + 'L' + i) % pool.length)]);
}

/** A single in-character rival utterance. */
function renderRivalry(req: AIRequest): string {
  const cap = req.spec.capsule;
  const mode = String(req.spec.params.mode ?? 'sneak-diss');
  const rng = makeRng(req.spec.seed);
  const rival = cap.topRival?.name ?? 'A rival';
  const me = cap.artistName;
  const banks: Record<string, string[]> = {
    'sneak-diss': [
      `${rival}: "no names, but some people peaked in their ${cap.arcPhase.replace(/-/g, ' ')} and never noticed 🤷"`,
      `${rival}: "funny how the ${cap.reputationTier.toLowerCase()} ones always need a rival to stay relevant"`,
    ],
    statement: [
      `${rival}: "I respect real ones. ${me} knows what that means. We'll leave it there."`,
      `${rival}: "I said what I said about ${me}. Context doesn't change a thing."`,
    ],
    'fake-apology': [
      `${rival}: "if ${me} FELT some way that's on them — but sure, my bad I guess 🙏"`,
      `${rival}: "apologies if the truth about ${me} landed wrong. growth."`,
    ],
    threat: [
      `${rival}: "tell ${me} the studio's open and so is my schedule. say less."`,
      `${rival}: "keep my name in that ${cap.genre} mouth and find out, ${me}."`,
    ],
    reconcile: [
      `${rival}: "me and ${me} talked. Grown. The ${cap.genre} bigger than egos."`,
      `${rival}: "no more shots. ${me} earned the respect ${memoryClause(cap, rng)}."`,
    ],
  };
  const pool = banks[mode] ?? banks['sneak-diss'];
  return pool[hashString(req.spec.seed) % pool.length];
}

/** Punchy outlet headline/blurb with the outlet's bias baked in. */
function renderNews(req: AIRequest): string {
  const cap = req.spec.capsule;
  const outlet = String(req.spec.params.outlet ?? 'gossip');
  const count = Number(req.spec.params.count ?? 2);
  const ctrl = cap.activeControversy?.kind.replace(/-/g, ' ');
  const rival = cap.topRival?.name;
  const banks: Record<string, string[]> = {
    gossip: [
      `SOURCES: ${cap.artistName}'s camp in "full panic" over ${ctrl ?? 'the next move'} 👀`,
      `Is ${cap.artistName} ${cap.arcPhase === 'decline' ? 'finished' : 'faking the comeback'}? Insiders spill`,
      `${rival ? `${cap.artistName} vs ${rival}: it's WAY uglier than they're admitting` : `${cap.artistName} unfollowed everyone. We have theories.`}`,
    ],
    critic: [
      `${cap.latestTrack ? `"${cap.latestTrack}"` : 'The new era'}: ${cap.artistName} is talented and terrified, in equal measure`,
      `The ${cap.reputationTier} years: a measured case for and against ${cap.artistName}`,
    ],
    industry: [
      `${cap.artistName} (${cap.fameTier}) ${ctrl ? `weathers ${ctrl}` : 'repositions'} as ${cap.genre} shifts`,
      `What ${cap.artistName}'s ${cap.arcPhase.replace(/-/g, ' ')} signals for the ${cap.genre} market`,
    ],
    tabloid: [
      `${cap.artistName} SPOTTED — and the internet has decided what it means`,
      `${rival ? `${cap.artistName} & ${rival}: the feud nobody can stop watching` : `${cap.artistName}'s wildest week yet, ranked`}`,
    ],
  };
  const pool = banks[outlet] ?? banks.gossip;
  return take(req.spec.seed, count, (i) => pool[(hashString(req.spec.seed + 'N' + i) % pool.length)]);
}

/** A vivid sentence layered onto a systemic event. */
function renderEvent(req: AIRequest): string {
  const cap = req.spec.capsule;
  const rng = makeRng(req.spec.seed);
  const variants = [
    `It doesn't stay contained. By morning it's ${cap.fanBand} timelines and a hashtag, ${memoryClause(cap, rng)}.`,
    `Your phone won't stop. ${cap.topRival ? `${cap.topRival.name}'s fans found it first.` : 'Everyone has a take and none of them are yours.'}`,
    `The ${cap.genre} world reacts before you do — ${cap.reputationTier.toLowerCase()} artists don't get the benefit of the doubt.`,
    `Quiet at first. Then a screenshot, ${memoryClause(cap, rng)}, and it's the only thing anyone wants to talk about.`,
  ];
  return variants[hashString(req.spec.seed) % variants.length];
}

/** Cinematic documentary narration paragraphs. */
function renderDocumentary(req: AIRequest): string {
  const cap = req.spec.capsule;
  const count = Number(req.spec.params.count ?? 4);
  const beats = cap.memorableBeats.length
    ? cap.memorableBeats.map((b) => b.summary.toLowerCase())
    : ['the night nobody was watching'];
  const paras = [
    `Before the ${cap.fanBand} and the ${cap.fameTier.toLowerCase()} title, there was a ${cap.genre} artist and a room with bad acoustics. Nobody films the beginning. They wish they had.`,
    `The footage they replay is ${beats.slice(0, 2).join(', and ')}. You can see the exact frame it stopped being a hobby.`,
    `${cap.topRival ? `Every story needs the other one. ${cap.topRival.name} was the mirror — ${cap.topRival.legendary ? 'and that mirror became legend.' : 'and the reflection got personal.'}` : `There was no villain. Just the work, and what it cost.`}`,
    `${cap.activeControversy ? `Then the ${cap.activeControversy.kind.replace(/-/g, ' ')}. The part where the camera keeps rolling and you wish it wouldn't.` : `Then the slow part. The ${cap.arcPhase.replace(/-/g, ' ')} that documentaries usually skip but lived the longest.`}`,
    `What's left isn't the ${cap.reputationTier.toLowerCase()} headline. It's that the ${cap.genre} kept moving and, somehow, so did they.`,
  ];
  return paras.slice(0, Math.min(count, paras.length)).join('\n');
}

/** A stan-vs-hater argument thread under a hot post. Roles alternate by line. */
function renderComment(req: AIRequest): string {
  const cap = req.spec.capsule;
  const count = Number(req.spec.params.count ?? 4);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const rng = makeRng(req.spec.seed + 'c' + i);
    const stan = i % 2 === 0;
    const bank = stan
      ? [
          `y'all will say ANYTHING about ${cap.artistName} ${memoryClause(cap, rng)}. stay pressed`,
          `${cap.artistName} is ${cap.fameTier.toLowerCase()} for a REASON, ${memoryClause(cap, rng)} or not 🙄`,
          `not the pile-on again 😭 ${cap.artistName} ${memoryClause(cap, rng)} and STILL standing`,
        ]
      : [
          `"for a reason" — the reason is ${memoryClause(cap, rng)} 💀 be so serious`,
          `imagine defending ${cap.artistName} ${memoryClause(cap, rng)}. the stockholm is wild`,
          `${cap.artistName} fell off ${memoryClause(cap, rng)} and the stans are the last to know`,
        ];
    out.push(bank[hashString(req.spec.seed + 'c' + i) % bank.length]);
  }
  return out.join('\n');
}

/** Live award-show broadcast commentary reacting to the artist's moment. */
function renderAward(req: AIRequest): string {
  const cap = req.spec.capsule;
  const outcome = String(req.spec.params.outcome ?? 'nomination');
  const count = Number(req.spec.params.count ?? 3);
  const ceremony = String(req.spec.params.ceremony ?? 'the ceremony');
  const category = String(req.spec.params.category ?? 'the category');
  const rival = cap.topRival?.name;
  const banks: Record<string, string[]> = {
    win: [
      `And ${cap.artistName} takes ${category} — the ${cap.fameTier.toLowerCase()} arc pays off, live at ${ceremony}.`,
      `Listen to this room. ${cap.arcPhase.replace(/-/g, ' ')} to the podium — ${cap.artistName} did not see this coming and neither did the odds.`,
      `${rival ? `Cut to ${rival}, clapping like it costs money.` : `Half this room wanted the other name in that envelope.`}`,
    ],
    nomination: [
      `${cap.artistName} is up for ${category} tonight — ${cap.reputationTier.toLowerCase()}, divisive, and impossible to ignore.`,
      `The nomination alone reignited the ${cap.genre} conversation. ${ceremony} loves a story.`,
      `${rival ? `And yes — ${rival} is in the same category. The cameras know exactly where to point.` : `Whether they win or not, this is the name trending out of ${ceremony}.`}`,
    ],
    snub: [
      `${cap.artistName} loses ${category} — and you can read it on their face from here.`,
      `The snub is already the headline. ${ceremony} just handed the internet its morning.`,
      `${rival ? `${rival} took it. Of course they did. The feud writes itself.` : `Somewhere a fanbase is drafting a very long thread.`}`,
    ],
    performance: [
      `${cap.artistName} live at ${ceremony} — ${cap.latestTrack ? `"${cap.latestTrack}"` : 'the new one'}, full production, no net.`,
      `Whatever you think of the ${cap.reputationTier.toLowerCase()} headlines, the room just went quiet for the right reasons.`,
      `${rival ? `That was aimed at ${rival} and everyone in here knew it.` : `That is the performance they'll be clipping all week.`}`,
    ],
  };
  const pool = banks[outcome] ?? banks.nomination;
  return take(req.spec.seed, count, (i) => pool[(hashString(req.spec.seed + 'A' + i) % pool.length)]);
}

/** Encyclopedic career biography paragraphs (distinct from the documentary). */
function renderBiography(req: AIRequest): string {
  const cap = req.spec.capsule;
  const count = Number(req.spec.params.count ?? 5);
  const beats = cap.memorableBeats.length
    ? cap.memorableBeats.map((b) => b.summary.toLowerCase())
    : ['a slow, unglamorous climb'];
  const paras = [
    `${cap.artistName} is a ${cap.genre} artist whose reputation — "${cap.reputationTier}" — arrived long before any consensus on the music did.`,
    `The rise was its own kind of proof: from nobody to ${cap.fameTier.toLowerCase()} with ${cap.fanBand} fans, currently ${cap.arcPhase.replace(/-/g, ' ')} and ${cap.momentum > 20 ? 'still climbing' : cap.momentum < -20 ? 'fighting the slide' : 'holding the line'}.`,
    `What fixed them in the public record was the noise around the work — ${beats.slice(0, 2).join(', and ')} — the kind of thing a career never fully outruns.`,
    `${cap.topRival ? `No account of ${cap.artistName} is complete without ${cap.topRival.name}; ${cap.topRival.legendary ? 'the feud became part of the canon.' : 'the rivalry sharpened both of them.'}` : `They built it largely without a foil — the story was always the artist against the room.`}`,
    `${cap.activeControversy ? `The ${cap.activeControversy.kind.replace(/-/g, ' ')} is the open chapter — unresolved, and the part everyone is arguing about right now.` : `The current chapter is quieter, which for this artist has never lasted long.`}`,
    `Whatever comes next, the ${cap.genre} story now has a ${cap.artistName}-shaped hole in it where there used to be none.`,
  ];
  return paras.slice(0, Math.min(count, paras.length)).join('\n');
}

/** A ranked "Top Moments" list, most legendary first, drawn from the beats. */
function renderTopMoments(req: AIRequest): string {
  const cap = req.spec.capsule;
  const count = Number(req.spec.params.count ?? 5);
  const beats = [...cap.memorableBeats].sort((a, b) => b.severity - a.severity);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const b = beats[i];
    if (b) {
      const frame = [
        `${b.summary} — the ${b.kind} that nobody around ${cap.artistName} could spin.`,
        `${b.summary}. The ${cap.genre} timeline still hasn't deleted the screenshots.`,
        `When ${cap.artistName.toLowerCase()} ${b.summary.toLowerCase()} — peak ${b.kind}, peak discourse.`,
      ];
      out.push(frame[hashString(req.spec.seed + 'T' + i) % frame.length]);
    } else if (i === 0) {
      out.push(`The career of ${cap.artistName} is quieter than the headlines — the biggest moment may not have happened yet.`);
    }
  }
  return out.join('\n');
}

function renderGeneric(req: AIRequest): string {
  switch (req.feature) {
    case 'comment-thread':
      return renderComment(req);
    case 'interview-write':
      return renderInterview(req);
    case 'lyric-assist':
      return renderLyric(req);
    case 'rivalry-voice':
      return renderRivalry(req);
    case 'news-rewrite':
      return renderNews(req);
    case 'award-commentary':
      return renderAward(req);
    case 'event-enrich':
      return renderEvent(req);
    case 'documentary':
      return renderDocumentary(req);
    case 'chronicle-bio':
      return renderBiography(req);
    case 'top-moments':
      return renderTopMoments(req);
    default: {
      const rng = makeRng(req.spec.seed);
      return `${req.spec.capsule.artistName} ${memoryClause(req.spec.capsule, rng)}.`;
    }
  }
}

export class LocalProvider implements AIProvider {
  id = 'local' as const;

  async isHealthy(): Promise<boolean> {
    return true;
  }

  async generate(req: AIRequest): Promise<AIResult> {
    const text =
      req.feature === 'social-enhance'
        ? renderSocial(req)
        : renderGeneric(req);
    return {
      text,
      provider: 'local',
      tokensIn: 0,
      tokensOut: 0,
      cached: false,
      degraded: false,
      moderated: false,
    };
  }
}

export const localProvider = new LocalProvider();
