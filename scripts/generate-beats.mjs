// Procedural instrumental generator — original, royalty-free backing tracks.
//
// Synthesizes one looping FULL INSTRUMENTAL per catalog beat — drums + bass +
// chord bed + topline melody + texture — entirely from math. No samples, no
// copyrighted audio, no musician's recording.
//
// What makes two beats in the SAME genre actually sound different (the thing
// that used to be broken): every beat seeds its own pick of
//   • chord / lead / pad INSTRUMENTS  (from a genre-appropriate pool)
//   • DRUM PATTERN                     (from a per-genre pattern library)
//   • chord COMP rhythm + arrangement flags + swing amount
// so "the 6 trap beats" are no longer the same loop transposed — they use
// different sounds, grooves, and feels. Beat `quality` drives how lush the
// arrangement gets, so better beats genuinely sound better.
//
// Studio polish (so it doesn't sound like a toy): STEREO output, a Freeverb-
// style algorithmic reverb send, a tempo-synced ping-pong delay on the topline,
// a sidechain "pump", swing + velocity humanization, and a glue bus
// (high-pass → compressor → low-pass → normalize → soft-clip).
//
//   Run:  node scripts/generate-beats.mjs
//
// Output: 44.1kHz STEREO 16-bit WAV at assets/beats/<folder>/<id>.wav, plus the
// BEAT_ASSETS map to paste into data/beats/beatAssets.ts.
//
// The BEATS list below MIRRORS data/beats/beatCatalog.ts (id/genre/bpm/key/
// mood/quality). Add or rename a catalog beat -> update this list and re-run.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SR = 44100;
const BARS = 2;
const STEPS = BARS * 16; // 16th-note grid

// ── Catalog mirror (6 per genre) ─────────────────────────────────────────────
// q = catalog `quality` (drives arrangement lushness + brightness).
const BEATS = [
  // trap
  { id: 'trap-midnight-bloom', genre: 'trap', bpm: 140, key: 'F# min', mood: 'dark', q: 82 },
  { id: 'trap-foreign-engine', genre: 'trap', bpm: 146, key: 'C min', mood: 'hype', q: 74 },
  { id: 'trap-glass-tears', genre: 'trap', bpm: 132, key: 'A min', mood: 'melodic', q: 79 },
  { id: 'trap-velvet-smoke', genre: 'trap', bpm: 136, key: 'D# min', mood: 'melodic', q: 80 },
  { id: 'trap-paranoia', genre: 'trap', bpm: 138, key: 'B min', mood: 'dark', q: 77 },
  { id: 'trap-victory-lap', genre: 'trap', bpm: 144, key: 'G# min', mood: 'triumphant', q: 84 },
  // drill
  { id: 'drill-cold-corner', genre: 'drill', bpm: 144, key: 'G min', mood: 'aggressive', q: 76 },
  { id: 'drill-sliding', genre: 'drill', bpm: 142, key: 'D min', mood: 'dark', q: 71 },
  { id: 'drill-no-hook', genre: 'drill', bpm: 145, key: 'E min', mood: 'hype', q: 68 },
  { id: 'drill-trenches', genre: 'drill', bpm: 143, key: 'A min', mood: 'aggressive', q: 75 },
  { id: 'drill-midnight-run', genre: 'drill', bpm: 141, key: 'F min', mood: 'dark', q: 72 },
  { id: 'drill-opps-down', genre: 'drill', bpm: 146, key: 'C# min', mood: 'hype', q: 70 },
  // afrobeats
  { id: 'afro-lagos-nights', genre: 'afrobeats', bpm: 108, key: 'B maj', mood: 'romantic', q: 85 },
  { id: 'afro-sunlight', genre: 'afrobeats', bpm: 112, key: 'F maj', mood: 'triumphant', q: 77 },
  { id: 'afro-slow-wind', genre: 'afrobeats', bpm: 102, key: 'A maj', mood: 'melodic', q: 73 },
  { id: 'afro-island-time', genre: 'afrobeats', bpm: 105, key: 'E maj', mood: 'romantic', q: 82 },
  { id: 'afro-gold-coast', genre: 'afrobeats', bpm: 110, key: 'D maj', mood: 'triumphant', q: 86 },
  { id: 'afro-palm-wine', genre: 'afrobeats', bpm: 100, key: 'G maj', mood: 'melodic', q: 75 },
  // r&b
  { id: 'rnb-2am-text', genre: 'r&b', bpm: 88, key: 'E maj', mood: 'romantic', q: 88 },
  { id: 'rnb-afterglow', genre: 'r&b', bpm: 76, key: 'Db maj', mood: 'dreamy', q: 80 },
  { id: 'rnb-bruised', genre: 'r&b', bpm: 82, key: 'C min', mood: 'sad', q: 75 },
  { id: 'rnb-silk-sheets', genre: 'r&b', bpm: 84, key: 'A maj', mood: 'romantic', q: 87 },
  { id: 'rnb-3am-confession', genre: 'r&b', bpm: 72, key: 'F# maj', mood: 'dreamy', q: 81 },
  { id: 'rnb-overrated', genre: 'r&b', bpm: 90, key: 'E min', mood: 'sad', q: 76 },
  // pop
  { id: 'pop-neon-rush', genre: 'pop', bpm: 124, key: 'A maj', mood: 'hype', q: 90 },
  { id: 'pop-paper-hearts', genre: 'pop', bpm: 100, key: 'G maj', mood: 'melodic', q: 83 },
  { id: 'pop-comeback', genre: 'pop', bpm: 118, key: 'D maj', mood: 'triumphant', q: 86 },
  { id: 'pop-supernova', genre: 'pop', bpm: 128, key: 'B maj', mood: 'hype', q: 90 },
  { id: 'pop-daydream', genre: 'pop', bpm: 104, key: 'C maj', mood: 'melodic', q: 83 },
  { id: 'pop-glow-up', genre: 'pop', bpm: 120, key: 'F maj', mood: 'triumphant', q: 87 },
  // indie
  { id: 'indie-old-film', genre: 'indie', bpm: 96, key: 'C maj', mood: 'dreamy', q: 72 },
  { id: 'indie-static', genre: 'indie', bpm: 90, key: 'A min', mood: 'sad', q: 69 },
  { id: 'indie-rooftops', genre: 'indie', bpm: 112, key: 'E maj', mood: 'triumphant', q: 76 },
  { id: 'indie-polaroid', genre: 'indie', bpm: 98, key: 'G maj', mood: 'dreamy', q: 73 },
  { id: 'indie-grey-skies', genre: 'indie', bpm: 88, key: 'D min', mood: 'sad', q: 70 },
  { id: 'indie-first-light', genre: 'indie', bpm: 110, key: 'A maj', mood: 'triumphant', q: 77 },
  // hyperpop
  { id: 'hyper-sugar-crash', genre: 'hyperpop', bpm: 160, key: 'F# maj', mood: 'hype', q: 81 },
  { id: 'hyper-melt', genre: 'hyperpop', bpm: 150, key: 'B maj', mood: 'dreamy', q: 78 },
  { id: 'hyper-screwface', genre: 'hyperpop', bpm: 168, key: 'D min', mood: 'aggressive', q: 74 },
  { id: 'hyper-glitter-bomb', genre: 'hyperpop', bpm: 162, key: 'C# maj', mood: 'hype', q: 82 },
  { id: 'hyper-feels', genre: 'hyperpop', bpm: 148, key: 'E maj', mood: 'dreamy', q: 79 },
  { id: 'hyper-rage-quit', genre: 'hyperpop', bpm: 170, key: 'F min', mood: 'aggressive', q: 75 },
];

const GENRE_FOLDER = {
  trap: 'trap', drill: 'drill', afrobeats: 'afrobeats', 'r&b': 'rnb',
  pop: 'pop', indie: 'indie', hyperpop: 'hyperpop',
};

// ── Music theory ─────────────────────────────────────────────────────────────
const NOTE_SEMI = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};
const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };

function parseKey(key) {
  const [note, mode] = key.split(' ');
  return { semi: NOTE_SEMI[note], mode: mode === 'min' ? 'minor' : 'major' };
}
function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
function scaleMidi(rootSemi, mode, octave, degree) {
  const sc = SCALE[mode], len = sc.length;
  const oct = octave + Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return 12 * (oct + 1) + rootSemi + sc[idx];
}

// ── Seeded RNG ───────────────────────────────────────────────────────────────
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Oscillators ──────────────────────────────────────────────────────────────
function osc(type, phase) {
  switch (type) {
    case 'sine': return Math.sin(phase);
    case 'square': return Math.sin(phase) >= 0 ? 1 : -1;
    case 'saw': { const x = (phase / (2 * Math.PI)) % 1; return 2 * x - 1; }
    case 'tri': { const x = (phase / (2 * Math.PI)) % 1; return 2 * Math.abs(2 * x - 1) - 1; }
    default: return Math.sin(phase);
  }
}

// ── Drum voices ──────────────────────────────────────────────────────────────
function renderKick(dur, { f0 = 150, f1 = 50, pDecay = 28, aDecay = 8, click = 0.5, drive = 1.3, sub = 0.0 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let phase = 0, subPh = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * pDecay);
    phase += (2 * Math.PI * f) / SR;
    subPh += (2 * Math.PI * f1) / SR;
    let s = Math.sin(phase) * Math.exp(-t * aDecay);
    if (sub > 0) s += Math.sin(subPh) * Math.exp(-t * (aDecay * 0.6)) * sub;
    if (t < 0.006) s += (Math.random() * 2 - 1) * Math.exp(-t * 400) * click;
    out[i] = Math.tanh(s * drive);
  }
  return out;
}
function render808(dur, freq, { aDecay = 2.0, drive = 1.6, glideTo = null, glideTime = 0.07, harm = 0.18 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let phase = 0;
  // short pitch "thump" at the top adds punch before the sustained sub.
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let f = freq;
    if (glideTo != null) { const g = Math.min(1, t / glideTime); f = freq + (glideTo - freq) * g; }
    f *= 1 + 0.6 * Math.exp(-t * 60); // attack pitch blip
    phase += (2 * Math.PI * f) / SR;
    let s = Math.sin(phase) + harm * Math.sin(2 * phase);
    out[i] = Math.tanh(s * drive) * Math.exp(-t * aDecay);
  }
  return out;
}
function renderSnare(dur, { tone = 180, tone2 = 330, nDecay = 20, tDecay = 13, nLvl = 0.85, tLvl = 0.5 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let p1 = 0, p2 = 0, prev = 0, hp = 0, hx = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    hp = 0.82 * (hp + w - hx); hx = w; // one-pole high-pass → crisp, less boxy
    const pdrop = Math.exp(-t * 60);
    p1 += (2 * Math.PI * tone * (1 + 0.5 * pdrop)) / SR;
    p2 += (2 * Math.PI * tone2 * (1 + 0.5 * pdrop)) / SR;
    const body = (Math.sin(p1) * 0.6 + Math.sin(p2) * 0.4) * Math.exp(-t * tDecay) * tLvl;
    out[i] = hp * Math.exp(-t * nDecay) * nLvl + body;
    prev = w;
  }
  return out;
}
function renderRim(dur, { tone = 1700, decay = 60 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * tone) / SR;
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 600) * 0.5;
    out[i] = (Math.sin(ph) + click) * Math.exp(-t * decay);
  }
  return out;
}
function renderClap(dur, { decay = 16 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let hp = 0, hx = 0;
  const offs = [0, 0.009, 0.018, 0.027];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1;
    hp = 0.85 * (hp + w - hx); hx = w;
    let env = 0;
    for (const o of offs) if (t >= o) env = Math.max(env, Math.exp(-(t - o) * 120));
    env = Math.max(env, 0.4 * Math.exp(-t * decay));
    out[i] = hp * env;
  }
  return out;
}
function renderHat(dur, { decay = 90, hp = 0.9 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let prev = 0, f = 0, fx = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = Math.random() * 2 - 1, h = w - prev * 0.55; prev = w;
    f = hp * (f + h - fx); fx = h; // high-pass → metallic, not white-noisy
    out[i] = f * Math.exp(-t * decay);
  }
  return out;
}
function renderPerc(dur, freq, { decay = 24, drive = 1.2 } = {}) {
  // short woody log-drum / conga-ish tone for afrobeats texture.
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = freq * (1 + 0.4 * Math.exp(-t * 80));
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.tanh(Math.sin(ph) * drive) * Math.exp(-t * decay);
  }
  return out;
}

// ── Pitched voices ───────────────────────────────────────────────────────────
function renderTone(dur, freq, {
  type = 'saw', attack = 0.005, decay = 3, sustain = 0, cutoff = 4000,
  drive = 1, detune = 0, voices = 1, release = 0.04,
} = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  const phases = new Array(voices).fill(0), freqs = [];
  for (let v = 0; v < voices; v++) {
    const cents = voices > 1 ? (v - (voices - 1) / 2) * detune : 0;
    freqs.push(freq * Math.pow(2, cents / 1200));
  }
  const rc = 1 / (2 * Math.PI * cutoff), alpha = 1 / SR / (rc + 1 / SR);
  let lp = 0;
  const relStart = dur - release;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let v = 0; v < voices; v++) { phases[v] += (2 * Math.PI * freqs[v]) / SR; s += osc(type, phases[v]); }
    s = Math.tanh((s / voices) * drive);
    lp += alpha * (s - lp); s = lp;
    let env = t < attack ? t / attack : sustain + (1 - sustain) * Math.exp(-(t - attack) * decay);
    if (t > relStart) env *= Math.max(0, 1 - (t - relStart) / release); // click-free tail
    out[i] = s * env;
  }
  return out;
}
// 2-operator FM — Rhodes / e-piano / bells / marimba / piano-ish tones.
function renderFM(dur, freq, { ratio = 2, index = 4, idxDecay = 6, aDecay = 4, attack = 0.003, drive = 1 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  let cp = 0, mp = 0;
  const mf = freq * ratio;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const idx = index * Math.exp(-t * idxDecay);
    mp += (2 * Math.PI * mf) / SR;
    cp += (2 * Math.PI * freq) / SR;
    const s = Math.sin(cp + idx * Math.sin(mp));
    const env = t < attack ? t / attack : Math.exp(-(t - attack) * aDecay);
    out[i] = Math.tanh(s * drive) * env;
  }
  return out;
}
// Karplus-Strong plucked string — guitar / harp / pluck.
function renderPluck(dur, freq, { decay = 5, bright = 0.5 } = {}) {
  const n = Math.floor(dur * SR), out = new Float32Array(n);
  const N = Math.max(2, Math.round(SR / freq));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx], nxt = buf[(idx + 1) % N];
    const avg = cur * bright + nxt * (1 - bright);
    out[i] = cur * 0.8;
    buf[idx] = avg * 0.996;
    idx = (idx + 1) % N;
  }
  for (let i = 0; i < n; i++) out[i] *= Math.exp(-(i / SR) * decay);
  return out;
}

// Instrument registry: name -> { oct, sustained, render(dur, freq) }.
const INSTRUMENTS = {
  rhodes: { oct: 5, sustained: false, render: (d, f) => renderFM(d, f, { ratio: 1, index: 2.4, idxDecay: 5, aDecay: 3, attack: 0.004 }) },
  epiano: { oct: 5, sustained: false, render: (d, f) => renderFM(d, f, { ratio: 2, index: 3, idxDecay: 7, aDecay: 4, attack: 0.003 }) },
  piano: { oct: 5, sustained: false, render: (d, f) => renderFM(d, f, { ratio: 1, index: 1.6, idxDecay: 9, aDecay: 3.2, attack: 0.002, drive: 1.1 }) },
  bells: { oct: 6, sustained: false, render: (d, f) => renderFM(d, f, { ratio: 3.5, index: 5, idxDecay: 8, aDecay: 5, attack: 0.001 }) },
  marimba: { oct: 5, sustained: false, render: (d, f) => renderFM(d, f, { ratio: 4, index: 3, idxDecay: 14, aDecay: 9, attack: 0.001 }) },
  glasskeys: { oct: 5, sustained: false, render: (d, f) => renderFM(d, f, { ratio: 2, index: 4.2, idxDecay: 9, aDecay: 4.5, attack: 0.002 }) },
  guitar: { oct: 4, sustained: false, render: (d, f) => renderPluck(d, f, { decay: 4, bright: 0.5 }) },
  pluck: { oct: 5, sustained: false, render: (d, f) => renderPluck(d, f, { decay: 7, bright: 0.6 }) },
  harp: { oct: 5, sustained: false, render: (d, f) => renderPluck(d, f, { decay: 3.4, bright: 0.7 }) },
  organ: { oct: 4, sustained: true, render: (d, f) => renderTone(d, f, { type: 'square', cutoff: 2400, decay: 0.3, sustain: 0.85, attack: 0.01 }) },
  supersaw: { oct: 4, sustained: true, render: (d, f) => renderTone(d, f, { type: 'saw', voices: 7, detune: 20, cutoff: 4200, decay: 1.2, sustain: 0.4, attack: 0.012 }) },
  strings: { oct: 4, sustained: true, render: (d, f) => renderTone(d, f, { type: 'saw', voices: 4, detune: 9, cutoff: 2600, decay: 0.7, sustain: 0.6, attack: 0.08 }) },
  warmpad: { oct: 4, sustained: true, render: (d, f) => renderTone(d, f, { type: 'tri', voices: 3, detune: 7, cutoff: 2200, decay: 0.9, sustain: 0.5, attack: 0.06 }) },
  glasspad: { oct: 4, sustained: true, render: (d, f) => renderTone(d, f, { type: 'tri', voices: 4, detune: 11, cutoff: 3200, decay: 0.8, sustain: 0.5, attack: 0.05 }) },
  saw: { oct: 4, sustained: true, render: (d, f) => renderTone(d, f, { type: 'saw', cutoff: 1500, decay: 4, drive: 1.3 }) },
};

// ── Genre config: instrument POOLS + drum pattern LIBRARY + groove ────────────
// Each pool is picked-from per beat (seeded), so 6 beats in a genre differ in
// timbre, groove and feel — not just key/tempo.
const GENRE = {
  trap: {
    chordPool: ['epiano', 'rhodes', 'bells', 'glasskeys'],
    leadPool: ['bells', 'pluck', 'glasskeys', 'epiano'],
    padPool: ['warmpad', 'glasspad', 'strings'],
    bass: '808', seventh: true, swing: 0.14, reverb: 0.22, delay: 0.18,
    sidechain: 0.35, bright: 0.0,
    comps: [[0, 4], [0, 6, 10], [0], [0, 3, 6, 10]],
    drums: ['trap-bounce', 'trap-sparse', 'trap-roll', 'trap-spacey'],
  },
  drill: {
    chordPool: ['piano', 'bells', 'glasskeys'],
    leadPool: ['strings', 'bells', 'pluck'],
    padPool: ['warmpad', 'strings'],
    bass: '808', seventh: false, swing: 0.1, reverb: 0.2, delay: 0.12,
    sidechain: 0.4, bright: -0.05,
    comps: [[0], [0, 6], [0, 8]],
    drums: ['drill-slide', 'drill-skippy', 'drill-dark'],
  },
  afrobeats: {
    chordPool: ['marimba', 'pluck', 'rhodes', 'epiano'],
    leadPool: ['pluck', 'marimba', 'harp', 'glasskeys'],
    padPool: ['organ', 'warmpad', 'strings'],
    bass: 'sub', seventh: true, ninth: false, swing: 0.18, reverb: 0.26, delay: 0.2,
    sidechain: 0.4, bright: 0.06,
    comps: [[0, 3, 6], [0, 4, 6, 10], [0, 6, 8, 12]],
    drums: ['afro-classic', 'afro-bounce', 'afro-log'],
  },
  'r&b': {
    chordPool: ['rhodes', 'epiano', 'glasskeys'],
    leadPool: ['epiano', 'rhodes', 'harp', 'bells'],
    padPool: ['warmpad', 'glasspad', 'strings'],
    bass: 'sub', seventh: true, ninth: true, swing: 0.2, reverb: 0.3, delay: 0.22,
    sidechain: 0.2, bright: -0.02,
    comps: [[0], [0, 6], [0, 10]],
    drums: ['rnb-laid', 'rnb-trapsoul', 'rnb-boombap'],
  },
  pop: {
    chordPool: ['supersaw', 'piano', 'epiano', 'glasskeys'],
    leadPool: ['piano', 'pluck', 'bells', 'supersaw'],
    padPool: ['strings', 'glasspad', 'warmpad'],
    bass: 'saw', seventh: false, swing: 0.05, reverb: 0.2, delay: 0.16,
    sidechain: 0.5, bright: 0.08,
    comps: [[0, 4], [0, 4, 8, 12], [0, 6]],
    drums: ['pop-four', 'pop-backbeat', 'pop-dance'],
  },
  indie: {
    chordPool: ['guitar', 'piano', 'rhodes'],
    leadPool: ['piano', 'guitar', 'glasskeys', 'bells'],
    padPool: ['warmpad', 'strings', 'organ'],
    bass: 'sub', seventh: false, swing: 0.12, reverb: 0.28, delay: 0.18,
    sidechain: 0.15, bright: 0.0,
    comps: [[0, 2, 4, 6], [0, 4], [0, 8]],
    drums: ['indie-backbeat', 'indie-four', 'indie-soft'],
  },
  hyperpop: {
    chordPool: ['supersaw', 'bells', 'glasskeys', 'glasspad'],
    leadPool: ['bells', 'supersaw', 'glasskeys', 'pluck'],
    padPool: ['strings', 'glasspad', 'supersaw'],
    bass: '808', seventh: false, swing: 0.04, reverb: 0.24, delay: 0.2,
    sidechain: 0.55, bright: 0.12,
    comps: [[0], [0, 4, 8, 12], [0, 8]],
    drums: ['hyper-glitch', 'hyper-fourfloor', 'hyper-rave'],
  },
};

// ── Drum pattern library ─────────────────────────────────────────────────────
// Each pattern returns events for a renderDrums() interpreter. Step grid 0..31.
// hat: per-step density code; ghosts/accents are added by the renderer.
const HAT_8 = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const HAT_16 = Array.from({ length: 32 }, (_, i) => i);
const HAT_OFF = [2, 6, 10, 14, 18, 22, 26, 30];

const PATTERNS = {
  // trap / drill share the 808 + tight-hat family
  'trap-bounce': { kick: [0, 7, 10, 16, 22, 26], snare: [8, 24], hat: HAT_16, oh: [14, 30], roll: [28], rollLen: 4 },
  'trap-sparse': { kick: [0, 11, 16, 27], snare: [8, 24], hat: HAT_8, oh: [6, 22], roll: [], rollLen: 0 },
  'trap-roll': { kick: [0, 6, 16, 19, 24], snare: [8, 24], hat: HAT_16, oh: [], roll: [12, 28], rollLen: 6 },
  'trap-spacey': { kick: [0, 10, 16, 24], snare: [8, 24], hat: HAT_8, oh: [4, 20], roll: [30], rollLen: 4 },
  'drill-slide': { kick: [0, 3, 6, 16, 19, 22], snare: [7, 8, 23, 24], hat: HAT_16, oh: [12], roll: [], rollLen: 0, slide: true },
  'drill-skippy': { kick: [0, 6, 10, 16, 22, 26], snare: [8, 24], hat: HAT_OFF.concat(HAT_8), oh: [14, 30], roll: [28], rollLen: 4, slide: true },
  'drill-dark': { kick: [0, 11, 16, 27], snare: [8, 24], hat: HAT_8, oh: [], roll: [], rollLen: 0, slide: true },
  // afrobeats — syncopated kicks, hand perc, no harsh hats
  'afro-classic': { kick: [0, 6, 10, 16, 22, 26], snare: [8, 24], hat: HAT_OFF, oh: [], roll: [], rollLen: 0, perc: [3, 7, 11, 14, 19, 23, 27, 30] },
  'afro-bounce': { kick: [0, 3, 8, 11, 16, 19, 24, 27], snare: [8, 24], hat: HAT_8, oh: [], roll: [], rollLen: 0, perc: [5, 13, 21, 29] },
  'afro-log': { kick: [0, 6, 16, 22], snare: [12, 28], hat: HAT_OFF, oh: [], roll: [], rollLen: 0, perc: [2, 5, 7, 10, 18, 21, 23, 26] },
  // r&b — soft, swung, rim/snare backbeat
  'rnb-laid': { kick: [0, 10, 16], snare: [8, 24], rim: [4, 12, 20, 28], hat: HAT_8, oh: [], roll: [], rollLen: 0 },
  'rnb-trapsoul': { kick: [0, 7, 16, 22], snare: [8, 24], hat: HAT_16, oh: [14], roll: [30], rollLen: 3 },
  'rnb-boombap': { kick: [0, 10, 16, 26], snare: [8, 24], hat: HAT_8, oh: [6, 22], roll: [], rollLen: 0 },
  // pop — clap backbeat / four-on-floor
  'pop-four': { kick: [0, 4, 8, 12, 16, 20, 24, 28], clap: [4, 12, 20, 28], hat: HAT_OFF, oh: [2, 10, 18, 26], roll: [], rollLen: 0 },
  'pop-backbeat': { kick: [0, 8, 10, 16, 24], clap: [8, 24], snare: [], hat: HAT_8, oh: [4, 20], roll: [], rollLen: 0 },
  'pop-dance': { kick: [0, 4, 8, 12, 16, 20, 24, 28], clap: [8, 24], hat: HAT_16, oh: [2, 6, 10, 14, 18, 22, 26, 30], roll: [], rollLen: 0 },
  // indie — live backbeat / tambourine
  'indie-backbeat': { kick: [0, 8, 16, 24], snare: [8, 24], hat: HAT_8, oh: [4, 12, 20, 28], roll: [], rollLen: 0 },
  'indie-four': { kick: [0, 4, 8, 12, 16, 20, 24, 28], snare: [8, 24], hat: HAT_OFF, oh: [], roll: [], rollLen: 0 },
  'indie-soft': { kick: [0, 10, 16, 26], rim: [8, 24], hat: HAT_8, oh: [], roll: [], rollLen: 0 },
  // hyperpop — distorted, glitchy
  'hyper-glitch': { kick: [0, 4, 8, 10, 16, 20, 24, 28], clap: [8, 24], hat: HAT_16, oh: [14, 30], roll: [12, 28], rollLen: 4 },
  'hyper-fourfloor': { kick: [0, 4, 8, 12, 16, 20, 24, 28], clap: [4, 12, 20, 28], hat: HAT_OFF, oh: [2, 10, 18, 26], roll: [], rollLen: 0 },
  'hyper-rave': { kick: [0, 3, 6, 8, 16, 19, 22, 24], clap: [8, 24], hat: HAT_16, oh: [], roll: [30], rollLen: 6 },
};

// ── WAV writer (PCM 16-bit STEREO interleaved) ───────────────────────────────
function writeWavStereo(path, L, R, sr = SR) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, L[i])), r = Math.max(-1, Math.min(1, R[i]));
    buf.writeInt16LE((l * 32767) | 0, o); buf.writeInt16LE((r * 32767) | 0, o + 2); o += 4;
  }
  writeFileSync(path, buf);
}

// ── Freeverb-style stereo reverb (loop-seamless via 2× pre-roll) ─────────────
const COMB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLP = [556, 441, 341, 225];
const SPREAD = 23;
function combFilter(input, delay, feedback, damp) {
  const out = new Float32Array(input.length);
  const buf = new Float32Array(delay);
  let i = 0, store = 0;
  for (let k = 0; k < input.length; k++) {
    const o = buf[i];
    store = o * (1 - damp) + store * damp;
    buf[i] = input[k] + store * feedback;
    out[k] = o;
    if (++i >= delay) i = 0;
  }
  return out;
}
function allpassFilter(input, delay, feedback) {
  const out = new Float32Array(input.length);
  const buf = new Float32Array(delay);
  let i = 0;
  for (let k = 0; k < input.length; k++) {
    const bufout = buf[i];
    const o = -input[k] + bufout;
    buf[i] = input[k] + bufout * feedback;
    out[k] = o;
    if (++i >= delay) i = 0;
  }
  return out;
}
function reverbChannel(input, spread, { roomSize = 0.84, damp = 0.3 } = {}) {
  let acc = new Float32Array(input.length);
  for (const c of COMB) {
    const f = combFilter(input, c + spread, roomSize, damp);
    for (let k = 0; k < acc.length; k++) acc[k] += f[k] * 0.18;
  }
  for (const a of ALLP) acc = allpassFilter(acc, a + spread, 0.5);
  return acc;
}
function stereoReverb(inL, inR, opts) {
  // Pre-roll one loop so the tail wraps seamlessly: process [in,in], keep 2nd.
  const n = inL.length;
  const dL = new Float32Array(n * 2), dR = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) { dL[k] = dL[k + n] = inL[k]; dR[k] = dR[k + n] = inR[k]; }
  const wL = reverbChannel(dL, 0, opts), wR = reverbChannel(dR, SPREAD, opts);
  return [wL.subarray(n), wR.subarray(n)];
}

// ── Tempo-synced ping-pong delay (loop-seamless via 2× pre-roll) ─────────────
function pingPong(inL, inR, delaySamp, feedback) {
  const n = inL.length;
  const dL = new Float32Array(n * 2), dR = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) { dL[k] = dL[k + n] = inL[k]; dR[k] = dR[k + n] = inR[k]; }
  const oL = new Float32Array(n * 2), oR = new Float32Array(n * 2);
  for (let k = 0; k < n * 2; k++) {
    const tapR = k - delaySamp >= 0 ? oR[k - delaySamp] : 0;
    const tapL = k - delaySamp >= 0 ? oL[k - delaySamp] : 0;
    oL[k] = dL[k] + tapR * feedback; // cross-feed → ping-pong
    oR[k] = dR[k] + tapL * feedback;
  }
  return [oL.subarray(n), oR.subarray(n)];
}

// ── Composer ─────────────────────────────────────────────────────────────────
function buildBeat(beat) {
  const { semi: rootSemi, mode } = parseKey(beat.key);
  const stepDur = 60 / beat.bpm / 4;
  const total = Math.round(STEPS * stepDur * SR);
  const g = beat.genre;
  const cfg = GENRE[g];
  const rng = mulberry32(hashSeed(beat.id));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const hype = ['hype', 'aggressive', 'triumphant'].includes(beat.mood);
  const lush = Math.max(0, Math.min(1, (beat.q - 66) / 24)); // 0..1 arrangement richness

  // Per-beat seeded selections — THIS is what makes siblings sound different.
  const chordName = pick(cfg.chordPool);
  const leadName = pick(cfg.leadPool);
  const padName = pick(cfg.padPool);
  const drumName = pick(cfg.drums);
  const comp = pick(cfg.comps);
  const pattern = PATTERNS[drumName];
  const swing = cfg.swing * (0.8 + 0.4 * rng());
  const brightMul = Math.pow(2, cfg.bright + (lush - 0.5) * 0.4); // cutoff scaler

  // Buses: music (gets sidechained) + drums (steady), each with FX sends.
  const mL = new Float32Array(total), mR = new Float32Array(total);
  const dL = new Float32Array(total), dR = new Float32Array(total);
  const rsL = new Float32Array(total), rsR = new Float32Array(total);
  const dsL = new Float32Array(total), dsR = new Float32Array(total);

  // place a mono source onto a stereo bus with equal-power pan + FX sends.
  const placeOn = (busL, busR, src, startStep, gain, { pan = 0, rev = 0, dly = 0, swung = true } = {}) => {
    const sw = swung && (Math.floor(startStep) % 2 === 1) ? swing * stepDur : 0;
    let start = Math.round((startStep * stepDur + sw) * SR);
    const th = (pan + 1) * Math.PI / 4, lg = gain * Math.cos(th), rgn = gain * Math.sin(th);
    for (let j = 0; j < src.length; j++) {
      let idx = start + j; if (idx >= total) idx -= total; if (idx < 0) idx += total;
      const sl = src[j] * lg, sr = src[j] * rgn;
      busL[idx] += sl; busR[idx] += sr;
      if (rev) { rsL[idx] += sl * rev; rsR[idx] += sr * rev; }
      if (dly) { dsL[idx] += sl * dly; dsR[idx] += sr * dly; }
    }
  };
  const music = (src, step, gain, opts) => placeOn(mL, mR, src, step, gain, opts);
  const drum = (src, step, gain, opts) => placeOn(dL, dR, src, step, gain, { ...opts, swung: false });
  const hum = (base, spread = 0.12) => base * (1 - spread + 2 * spread * rng()); // velocity jitter

  // Progression (scale degrees, 4 chords over 2 bars).
  const MINOR_PROGS = [[0, 5, 3, 4], [0, 3, 4, 0], [0, 5, 6, 4], [0, 6, 5, 3], [0, 4, 5, 5]];
  const MAJOR_PROGS = [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 0], [0, 4, 3, 4], [0, 5, 1, 4]];
  const prog = pick(mode === 'minor' ? MINOR_PROGS : MAJOR_PROGS);
  const chordStarts = [0, 8, 16, 24], chordLen = 8 * stepDur;
  const chordDegAt = (step) => prog[Math.min(3, Math.floor(step / 8))];
  const chordTones = (c) => {
    const d = prog[c], t = [d, d + 2, d + 4];
    if (cfg.seventh) t.push(d + 6);
    if (cfg.ninth) t.push(d + 8);
    return t;
  };
  const I = (name) => INSTRUMENTS[name];
  const withCut = (inst, dur, midi, extra = {}) => inst.render(dur, midiToFreq(midi)); // cutoff baked per-instr

  // 1) Pad bed — sustained warmth, voices spread L/R for width.
  {
    const pad = I(padName), oct = pad.oct, rev = cfg.reverb * 1.1;
    for (let c = 0; c < 4; c++) {
      const tones = [prog[c], prog[c] + 2, prog[c] + 4];
      tones.forEach((d, k) => {
        const pan = (k - 1) * 0.55;
        music(pad.render(chordLen * 1.05, midiToFreq(scaleMidi(rootSemi, mode, oct, d))), chordStarts[c], 0.17 * (0.8 + 0.3 * lush), { pan, rev });
      });
    }
  }

  // 2) Chord instrument — sustained holds or rhythmic comp / strum.
  {
    const chord = I(chordName), oct = chord.oct, rev = cfg.reverb;
    for (let c = 0; c < 4; c++) {
      const tones = chordTones(c);
      if (chord.sustained) {
        tones.forEach((d, k) => music(chord.render(chordLen * 1.02, midiToFreq(scaleMidi(rootSemi, mode, oct, d))), chordStarts[c], 0.26, { pan: (k % 2 ? 0.2 : -0.2), rev }));
      } else {
        for (const r of comp) {
          tones.forEach((d, k) => {
            const strum = g === 'indie' ? k * 0.16 : 0;
            const pan = (k % 2 ? 0.22 : -0.22);
            music(chord.render(chordLen * 0.55, midiToFreq(scaleMidi(rootSemi, mode, oct, d))), chordStarts[c] + r + strum, hum(0.3), { pan, rev, dly: cfg.delay * 0.4 });
          });
        }
      }
    }
  }

  // 3) Bass — follows chord roots with movement; centered + sub-heavy.
  {
    for (let c = 0; c < 4; c++) {
      const here = midiToFreq(scaleMidi(rootSemi, mode, cfg.bass === 'sub' ? 2 : 1, prog[c]));
      const next = midiToFreq(scaleMidi(rootSemi, mode, cfg.bass === 'sub' ? 2 : 1, prog[(c + 1) % 4]));
      if (cfg.bass === '808') {
        music(render808(chordLen * 0.95, here, { aDecay: 1.7, glideTo: pattern.slide && rng() > 0.4 ? next : null }), chordStarts[c], 0.6, { pan: 0 });
      } else if (cfg.bass === 'sub') {
        music(renderTone(chordLen * 0.92, here, { type: 'sine', cutoff: 900, decay: 1.4, drive: 1.3 }), chordStarts[c], 0.5, { pan: 0 });
        if (rng() < 0.6) music(renderTone(stepDur * 2, midiToFreq(scaleMidi(rootSemi, mode, 2, prog[c] + 1)), { type: 'sine', cutoff: 1000, decay: 4 }), chordStarts[c] + 6, 0.38, { pan: 0 });
      } else {
        for (let s = chordStarts[c]; s < chordStarts[c] + 8; s += 2)
          music(renderTone(stepDur * 1.8, here, { type: 'saw', cutoff: 1200, decay: 5, drive: 1.3 }), s, 0.32, { pan: 0 });
      }
    }
  }

  // 4) Drums — interpret the chosen pattern with accents, ghosts, swing-free.
  renderDrumKit(beat, pattern, { drum, hum, rng, stepDur });

  // 5) Topline melody — the hook, snapped to chord tones, delayed for space.
  {
    const lead = I(leadName), leadOct = Math.min(lead.oct, 5);
    const motif = [];
    let d = [0, 2, 4][Math.floor(rng() * 3)];
    for (let i = 0; i < 8; i++) {
      motif.push(d);
      const leap = rng() < 0.72 ? (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 2 : -2);
      d = Math.max(-2, Math.min(7, d + leap));
    }
    const density = (hype ? 0.9 : 0.74) * (0.85 + 0.3 * lush);
    for (let bar = 0; bar < 2; bar++) {
      for (let k = 0; k < 8; k++) {
        if (rng() > density) continue;
        const step = bar * 16 + k * 2;
        const deg = chordDegAt(step) + motif[(bar * 8 + k) % motif.length];
        const dur = (rng() < 0.4 ? 4 : 2) * stepDur * 0.92;
        music(lead.render(dur, midiToFreq(scaleMidi(rootSemi, mode, leadOct, deg))), step, hum(0.32), { pan: 0.16, rev: cfg.reverb, dly: cfg.delay });
      }
    }
  }

  // 6) Counter-melody / arp sparkle — only on lusher beats, panned opposite.
  if (lush > 0.4 || ['afrobeats', 'pop', 'indie', 'hyperpop'].includes(g)) {
    const arpInst = I(g === 'indie' ? 'guitar' : (chordName === 'supersaw' ? 'pluck' : 'harp'));
    const shape = [prog[0], prog[0] + 2, prog[0] + 4, prog[0] + 7, prog[0] + 4, prog[0] + 2];
    const stepGap = lush > 0.6 ? 2 : 4;
    for (let s = 0; s < STEPS; s += stepGap) {
      const deg = shape[(s / stepGap) % shape.length];
      music(arpInst.render(stepDur * 2, midiToFreq(scaleMidi(rootSemi, mode, 5, deg))), s, 0.12 * (0.6 + lush), { pan: -0.4, rev: cfg.reverb, dly: cfg.delay * 0.6 });
    }
  }

  // ── FX returns ──
  const [revL, revR] = stereoReverb(rsL, rsR, { roomSize: 0.82 + 0.06 * lush, damp: 0.32 - 0.1 * lush });
  const dlySamp = Math.round(stepDur * 3 * SR); // dotted-8th feel
  const [dlyL, dlyR] = pingPong(dsL, dsR, dlySamp, 0.34);

  // ── Sidechain duck envelope from kick steps (modern "pump") ──
  const duck = new Float32Array(total).fill(1);
  if (cfg.sidechain > 0) {
    const atk = Math.round(0.004 * SR), rel = Math.round(stepDur * 2.2 * SR);
    for (const ks of pattern.kick) {
      const k0 = Math.round(ks * stepDur * SR);
      for (let j = -atk; j < rel; j++) {
        let idx = k0 + j; if (idx >= total) idx -= total; if (idx < 0) idx += total;
        const env = j < 0 ? 1 - (1 + j / atk) * cfg.sidechain
          : 1 - cfg.sidechain * Math.exp(-(j / SR) * (1 / (stepDur * 0.5)));
        duck[idx] = Math.min(duck[idx], env);
      }
    }
  }

  // ── Master sum + glue bus ──
  const L = new Float32Array(total), R = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    L[i] = dL[i] + mL[i] * duck[i] + revL[i] * 0.5 + dlyL[i] * 0.45;
    R[i] = dR[i] + mR[i] * duck[i] + revR[i] * 0.5 + dlyR[i] * 0.45;
  }
  busChain(L, R, brightMul);

  let peak = 0, sumsq = 0;
  for (let i = 0; i < total; i++) { peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const norm = peak > 0 ? 0.92 / peak : 1;
  for (let i = 0; i < total; i++) {
    L[i] = Math.tanh(L[i] * norm * 1.04); R[i] = Math.tanh(R[i] * norm * 1.04);
    sumsq += L[i] * L[i] + R[i] * R[i];
  }
  return {
    L, R, durationSec: total / SR, rms: Math.sqrt(sumsq / (total * 2)),
    info: { chord: chordName, lead: leadName, pad: padName, drums: drumName },
  };
}

// Drum kit interpreter — turns a pattern into placed, humanized hits.
function renderDrumKit(beat, p, { drum, hum, rng }) {
  const g = beat.genre;
  const tight = g === 'trap' || g === 'drill' || g === 'hyperpop';
  const kick = () => g === 'hyperpop'
    ? renderKick(0.22, { f0: 180, f1: 60, aDecay: 14, drive: 1.7, sub: 0.3 })
    : renderKick(0.3, { f0: g === 'indie' ? 120 : 150, f1: g === 'r&b' ? 50 : 52, aDecay: g === 'r&b' ? 8 : 10, sub: 0.35 });
  const closedHat = () => renderHat(0.05, { decay: 100, hp: tight ? 0.93 : 0.88 });
  const openHat = () => renderHat(0.22, { decay: 20, hp: 0.9 });

  for (const s of p.kick) drum(kick(), s, hum(g === 'r&b' ? 0.6 : 0.82, 0.08), { pan: 0 });
  if (p.snare) for (const s of p.snare) drum(renderSnare(0.26, { nLvl: g === 'afrobeats' ? 0.55 : 0.85 }), s, hum(0.55), { pan: 0 });
  if (p.clap) for (const s of p.clap) drum(renderClap(0.3), s, hum(0.5), { pan: 0 });
  if (p.rim) for (const s of p.rim) drum(renderRim(0.12), s, hum(0.4), { pan: rng() < 0.5 ? -0.25 : 0.25 });
  if (p.perc) for (let i = 0; i < p.perc.length; i++) {
    const s = p.perc[i];
    drum(renderPerc(0.16, 240 + (i % 3) * 90), s, hum(0.3, 0.2), { pan: (i % 2 ? 0.4 : -0.4) });
  }
  for (let i = 0; i < p.hat.length; i++) {
    const s = p.hat[i];
    const accent = s % 4 === 0 ? 0.04 : 0;
    drum(closedHat(), s, hum(0.16 + accent, 0.25), { pan: (i % 2 ? 0.18 : -0.18) });
  }
  if (p.oh) for (const s of p.oh) drum(openHat(), s, hum(0.18), { pan: 0.12 });
  // hat roll (accelerating burst into the turnaround)
  if (p.rollLen) for (const r of p.roll) {
    for (let k = 0; k < p.rollLen; k++) drum(closedHat(), r + k * (0.5 - k * 0.04), hum(0.14), { pan: 0 });
  }
}

// Glue bus: DC high-pass → linked soft-knee compressor → gentle low-pass.
function busChain(L, R, brightMul) {
  const n = L.length;
  // 1) high-pass ~28Hz (kill DC/rumble)
  let hxl = 0, hyl = 0, hxr = 0, hyr = 0;
  const rcH = 1 / (2 * Math.PI * 28), aH = rcH / (rcH + 1 / SR);
  for (let i = 0; i < n; i++) {
    hyl = aH * (hyl + L[i] - hxl); hxl = L[i]; L[i] = hyl;
    hyr = aH * (hyr + R[i] - hxr); hxr = R[i]; R[i] = hyr;
  }
  // 2) bus compressor (linked, peak-follow)
  const thr = 0.5, ratio = 3;
  const atk = Math.exp(-1 / (0.005 * SR)), rel = Math.exp(-1 / (0.12 * SR));
  let env = 0;
  for (let i = 0; i < n; i++) {
    const peak = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    env = peak > env ? atk * env + (1 - atk) * peak : rel * env + (1 - rel) * peak;
    let gr = 1;
    if (env > thr) gr = (thr + (env - thr) / ratio) / env;
    L[i] *= gr; R[i] *= gr;
  }
  // 3) low-pass (tame fizz); brighter beats keep more top.
  const cutoff = 12000 * brightMul;
  const rcL = 1 / (2 * Math.PI * cutoff), aL = 1 / SR / (rcL + 1 / SR);
  let lpl = 0, lpr = 0;
  for (let i = 0; i < n; i++) { lpl += aL * (L[i] - lpl); L[i] = lpl; lpr += aL * (R[i] - lpr); R[i] = lpr; }
}

// ── Run ──────────────────────────────────────────────────────────────────────
let totalBytes = 0;
const assetLines = [];
for (const beat of BEATS) {
  const folder = GENRE_FOLDER[beat.genre];
  const dir = join(ROOT, 'assets', 'beats', folder);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${beat.id}.wav`);
  const { L, R, durationSec, rms, info } = buildBeat(beat);
  writeWavStereo(file, L, R);
  const bytes = 44 + L.length * 4;
  totalBytes += bytes;
  assetLines.push(`  '${beat.id}': require('../../assets/beats/${folder}/${beat.id}.wav'),`);
  console.log(
    `✓ ${beat.id.padEnd(22)} ${String(beat.bpm).padStart(3)}bpm ${beat.key.padEnd(7)} ${durationSec.toFixed(2)}s ` +
    `rms ${rms.toFixed(3)} | ${info.drums.padEnd(15)} ch:${info.chord.padEnd(9)} lead:${info.lead.padEnd(9)} pad:${info.pad}`
  );
}
console.log(`\n${BEATS.length} beats · STEREO · ${(totalBytes / 1024 / 1024).toFixed(1)}MB total\n`);
console.log('BEAT_ASSETS for data/beats/beatAssets.ts:\n');
console.log(assetLines.join('\n'));
