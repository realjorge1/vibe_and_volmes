import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DmThread, Moment } from '../../../types/drama';
import { composePost, fillText, pickTopic, reach, topicsFor, TAKE_SENTIMENT, type DiscourseInput } from '../discourse';
import { admirerGender, crowdPerson, genderOfId, seeded } from '../crowd';
import { coolMoments, fillSpec, isHistoric, makeMoment, stoke } from '../moments';
import { newWar, phaseFor, settle, standing, swing } from '../rivalWar';
import { arcEligible, newThreadCount, replyDm, startThread, weeklyDms, ROMANCE_GAP, type DmCtx } from '../dmEngine';
import { DM_ARCS, getArc } from '../../../data/drama/dmArcs';
import { WOMEN, MEN } from '../../../data/drama/crowdNames';

function input(over: Partial<DiscourseInput> = {}): DiscourseInput {
  return {
    playerName: 'Nova Vale',
    gender: 'male',
    genre: 'Hip-Hop',
    city: 'Atlanta',
    fans: 200_000,
    reputation: 55,
    trackTitle: 'Midnight',
    trackScore: 70,
    moments: [],
    rival: null,
    partnerName: null,
    ...over,
  };
}

function moment(over: Partial<Moment> = {}): Moment {
  return makeMoment({ kind: 'scandal', headline: 'H', topic: 'the leaked DMs', heat: 60, valence: -60, ...over }, 5, {}, over.id ?? 'm1');
}

const ctx = (over: Partial<DmCtx> = {}): DmCtx => ({
  week: 10,
  now: 1_000_000,
  fans: 50_000,
  gender: 'male',
  partnerName: null,
  rival: null,
  celeb: null,
  playerName: 'Nova Vale',
  trackTitle: 'Midnight',
  city: 'Atlanta',
  ...over,
});

// --- discourse ---------------------------------------------------------------------

test('the internet is never unanimous: every artist gets love AND hate', () => {
  for (const fans of [500, 20_000, 2_000_000]) {
    const vibe = topicsFor(input({ fans })).find((t) => t.kind === 'vibe')!;
    assert.ok((vibe.takes.love ?? 0) > 0, `love at ${fans}`);
    assert.ok((vibe.takes.hate ?? 0) > 0, `hate at ${fans}`);
    assert.ok((vibe.takes.banter ?? 0) > 0, `banter at ${fans}`);
  }
});

test('fame grows the haters (tall poppies)', () => {
  const hate = (fans: number) => topicsFor(input({ fans })).find((t) => t.kind === 'vibe')!.takes.hate!;
  assert.ok(hate(5_000_000) > hate(5_000) * 1.5);
  assert.ok(hate(5_000) > hate(100));
});

test('a hot scandal becomes a topic and brings draggers and defenders', () => {
  const ts = topicsFor(input({ moments: [moment()] }));
  const t = ts.find((x) => x.moment?.id === 'm1');
  assert.ok(t, 'scandal topic exists');
  assert.ok((t!.takes.drag ?? 0) > 0 && (t!.takes.defend ?? 0) > 0);
});

test('looks stay a sprinkle, never the whole feed', () => {
  const ts = topicsFor(input({ fans: 5_000_000 }));
  const total = ts.reduce((s, t) => s + t.weight, 0);
  const looks = ts.find((t) => t.kind === 'looks')!.weight;
  assert.ok(looks / total < 0.25, `looks share ${looks / total}`);
});

test('a heated rivalry becomes a beef topic with subtweets', () => {
  const ts = topicsFor(input({ rival: { id: 'blaze-omen', name: 'Blaze Omen', handle: 'blazeomen', intensity: 60, score: 40 } }));
  const beef = ts.find((t) => t.kind === 'beef');
  assert.ok(beef && (beef.takes.subtweet ?? 0) > 0);
});

test('composed posts fill every token and use the artist pronouns', () => {
  const rnd = seeded('compose');
  const inp = input({ gender: 'female', moments: [moment()], rival: { id: 'x', name: 'Blaze Omen', handle: 'blazeomen', intensity: 70, score: 45 }, partnerName: 'Theo' });
  const topics = topicsFor(inp);
  for (let i = 0; i < 400; i++) {
    const c = composePost(pickTopic(topics, rnd), inp, rnd, { visual: i % 2 === 0 });
    if (!c) continue;
    const texts = [c.text, c.meme?.top ?? '', c.meme?.bottom ?? '', ...(c.poll?.options ?? [])];
    for (const t of texts) assert.ok(!/\{[a-zA-Z']+\}/.test(t), `unfilled token in: ${t}`);
    assert.equal(c.sentiment, c.meme?.format === 'caption' ? 'meme' : TAKE_SENTIMENT[c.take]);
  }
  assert.equal(fillText('{He} said {he} loves {his} fans', inp), 'She said she loves her fans');
});

test('unknown artists hear from critics before stans and gossip pages', () => {
  const rnd = seeded('unknown');
  const inp = input({ fans: 300 });
  const topics = topicsFor(inp);
  for (let i = 0; i < 300; i++) {
    const c = composePost(pickTopic(topics, rnd), inp, rnd);
    if (!c || c.voice.kind !== 'type') continue;
    assert.ok(!['stan', 'gossip', 'news'].includes(c.voice.type), `unexpected ${c.voice.type} for an unknown`);
  }
  assert.ok(reach(300) < 0.4);
});

test('thirst comes from the opposite gender for male and female artists', () => {
  assert.equal(admirerGender('male'), 'woman');
  assert.equal(admirerGender('female'), 'man');
});

// --- crowd ---------------------------------------------------------------------------

test('a stranger is stable and their name matches their gender', () => {
  const a = crowdPerson('seed-1', { gender: 'woman' });
  assert.deepEqual(a, crowdPerson('seed-1', { gender: 'woman' }));
  assert.equal(genderOfId(a.id), 'woman');
  const first = a.username.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/)[0];
  assert.ok(WOMEN.some((n) => n.toLowerCase() === first.toLowerCase()), `${a.username} is a woman's name`);
  const m = crowdPerson('seed-2', { gender: 'man' });
  const firstM = m.username.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/)[0];
  assert.ok(MEN.some((n) => n.toLowerCase() === firstM.toLowerCase() || n.toLowerCase().startsWith(firstM.toLowerCase())), `${m.username} is a man's name`);
});

// --- moments ------------------------------------------------------------------------------

test('moments cool off and burn out', () => {
  const ms = [moment({ id: 'a', kind: 'meme', heat: 30 }), moment({ id: 'b', kind: 'scandal', heat: 80 })];
  const after = coolMoments(ms, 2);
  assert.ok(!after.some((m) => m.id === 'a'), 'the meme burned out');
  assert.ok(after.find((m) => m.id === 'b')!.heat < 80);
  const hot = stoke(after[0], 50);
  assert.ok(hot.peak >= hot.heat);
  assert.ok(isHistoric(moment({ heat: 80 })));
});

test('moment text tokens are filled for the artist', () => {
  const s = fillSpec({ kind: 'beef', headline: '{rival} vs {playerName}', topic: "{rival}'s diss", heat: 50, valence: -20, hashtag: '{playerName} Wins!' }, { playerName: 'Nova Vale', rival: 'Blaze Omen' });
  assert.equal(s.headline, 'Blaze Omen vs Nova Vale');
  assert.equal(s.hashtag, 'NovaValeWins');
});

// --- rival war ---------------------------------------------------------------------------

test('the war scores swings, settles toward even and reads out the standings', () => {
  let w = newWar('blaze-omen', 1);
  w = swing(w, -15, 2, 'diss');
  assert.equal(w.score, 35);
  assert.match(standing(w, 'Blaze Omen'), /Blaze Omen is winning/);
  const settled = settle(w, 3);
  assert.ok(settled.score > 35 && settled.score <= 50);
  assert.equal(phaseFor(80), 'war');
  assert.equal(phaseFor(10), 'cold');
});

// --- DMs ----------------------------------------------------------------------------------

test('every arc stage it points to exists, and every reply leads somewhere real', () => {
  for (const arc of DM_ARCS) {
    assert.ok(arc.stages[arc.start], `${arc.id} start`);
    for (const [id, st] of Object.entries(arc.stages)) {
      assert.ok(st.say.length > 0, `${arc.id}.${id} says something`);
      if (st.ignored) assert.ok(arc.stages[st.ignored.next], `${arc.id}.${id} ignored -> ${st.ignored.next}`);
      for (const r of st.replies) {
        for (const n of [r.next, r.roll?.then.next, r.roll?.otherwise.next]) {
          if (n) assert.ok(arc.stages[n], `${arc.id}.${id}.${r.id} -> ${n}`);
        }
      }
    }
  }
});

test('the inbox gets busier with fame', () => {
  const rnd = seeded('count');
  const avg = (fans: number) => {
    let n = 0;
    for (let i = 0; i < 200; i++) n += newThreadCount(fans, rnd);
    return n / 200;
  };
  assert.ok(avg(1_000_000) > avg(1_000));
});

test('romance is rationed: at most one romantic opener every two weeks', () => {
  const rnd = seeded('romance');
  let threads: DmThread[] = [];
  let mem = { arcWeeks: {} as Record<string, number>, lastRomanceWeek: -99 };
  const romanticWeeks: number[] = [];
  for (let week = 1; week <= 30; week++) {
    const res = weeklyDms(ctx({ week, fans: 2_000_000 }), threads, mem, rnd);
    threads = res.threads;
    mem = { arcWeeks: res.arcWeeks, lastRomanceWeek: res.lastRomanceWeek };
    const romantic = res.started.filter((t) => t.kind === 'admirer' || t.kind === 'celeb-crush' || t.kind === 'ex');
    assert.ok(romantic.length <= 1, `week ${week}: ${romantic.length} romantic`);
    if (romantic.length) romanticWeeks.push(week);
  }
  for (let i = 1; i < romanticWeeks.length; i++) assert.ok(romanticWeeks[i] - romanticWeeks[i - 1] >= ROMANCE_GAP);
  assert.ok(romanticWeeks.length > 0, 'romance does happen');
});

test('admirers write in as the opposite gender and their messages are filled', () => {
  const arc = getArc('admirer-shot')!;
  const t = startThread(arc, ctx(), seeded('adm'))!;
  assert.equal(t.person.gender, 'woman');
  assert.ok(t.messages.length > 0 && t.messages.every((m) => !/\{[a-zA-Z]+\}/.test(m.text)));
  assert.ok(t.options.length > 0);
  // Partner-only replies are hidden for a single artist.
  assert.ok(!t.options.some((o) => o.id === 'taken'));
});

test('answering moves the arc; leaving on read closes it', () => {
  const arc = getArc('admirer-shot')!;
  const rnd = seeded('reply');
  const t = startThread(arc, ctx(), rnd)!;
  const flirt = replyDm(t, 'flirt', ctx(), rnd)!;
  assert.equal(flirt.thread.stage, 'flirting');
  assert.ok(flirt.thread.messages.some((m) => m.from === 'me'));
  assert.ok(flirt.thread.options.length > 0);
  const read = replyDm(t, 'read', ctx(), rnd)!;
  assert.equal(read.thread.state, 'closed');
  assert.equal(replyDm(read.thread, 'flirt', ctx(), rnd), null, 'a closed thread takes no replies');
});

test('an ignored obsessed fan follows up, and rival DMs need a hot rivalry', () => {
  const rnd = seeded('obsessed');
  const arc = getArc('obsessed')!;
  const t = startThread(arc, ctx(), rnd)!;
  const res = weeklyDms(ctx({ week: 11, fans: 100 }), [t], { arcWeeks: {}, lastRomanceWeek: -99 }, rnd);
  const after = res.threads.find((x) => x.id === t.id)!;
  assert.equal(after.stage, 'closer');
  assert.ok(res.escalated.some((x) => x.id === t.id));

  const rivalArc = getArc('rival-dm')!;
  assert.equal(arcEligible(rivalArc, ctx(), [], { arcWeeks: {}, lastRomanceWeek: -99 }), false);
  assert.equal(
    arcEligible(rivalArc, ctx({ rival: { id: 'b', name: 'Blaze Omen', handle: 'blazeomen', intensity: 50, followers: 1000 } }), [], { arcWeeks: {}, lastRomanceWeek: -99 }),
    true
  );
});
