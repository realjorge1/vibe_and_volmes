import { Asset } from 'expo-asset';
import type { MixSettings } from '../../types/audio';
import { withMixDefaults } from '../../constants/audioConfig';
import type { PlaybackSource } from './audioPlayer';
import {
  LayeredPlayer,
  type LayeredStatus,
  type PlaybackEngine,
} from './layeredPlayback';

/**
 * Real-time studio preview with live, tweakable DJ FX, built on
 * `react-native-audio-api` (a Web Audio graph that runs natively).
 *
 *   beat ─► gain ─► drive(pre→shaper→post) ─┐
 *   vocal ─► gain ───────────────────────────┴─► sum ─► FILTER ─► preMaster ─┬─► master ─► out
 *                                                                            ├─► reverb send ─► convolver ─► master
 *                                                                            └─► echo send ─► delay ⇄ feedback ─► master
 *
 * Every knob in `MixSettings` maps to an `AudioParam` and is ramped live, so
 * dragging a slider sweeps the sound in real time. The native module only
 * exists in a custom dev/release build (not Expo Go), so `createPlaybackEngine`
 * feature-detects it and falls back to the volume-only `LayeredPlayer`.
 */

// ── Guarded native module load (type-only import is erased at build time) ────
type RNAA = typeof import('react-native-audio-api');
let cachedMod: RNAA | null | undefined;
function loadModule(): RNAA | null {
  if (cachedMod !== undefined) return cachedMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedMod = require('react-native-audio-api') as RNAA;
  } catch {
    cachedMod = null;
  }
  return cachedMod;
}

let fxAvailable: boolean | undefined;
function fxIsAvailable(mod: RNAA): boolean {
  if (fxAvailable !== undefined) return fxAvailable;
  try {
    // Constructing a context throws if the native side isn't linked in
    // (Expo Go, or a build made before the package was added).
    const probe = new mod.AudioContext();
    void probe.close();
    fxAvailable = true;
  } catch {
    fxAvailable = false;
  }
  return fxAvailable;
}

type AnyCtx = InstanceType<RNAA['AudioContext']>;
type AnyNode = ReturnType<AnyCtx['createGain']>;
type AnyBuffer = Awaited<ReturnType<AnyCtx['decodeAudioData']>>;
type AnySource = ReturnType<AnyCtx['createBufferSource']>;

const STATUS_INTERVAL_MS = 120;

function makeTanhCurve(samples = 1024): Float32Array {
  const c = new Float32Array(samples);
  const k = 2.5;
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

/** Map a 0..1 knob across [min,max] on a log scale (musical for frequencies). */
function mapLog(min: number, max: number, k: number): number {
  return min * Math.pow(max / min, Math.max(0, Math.min(1, k)));
}

class FxPlayer implements PlaybackEngine {
  private mod: RNAA;
  private ctx: AnyCtx | null = null;
  private mix: MixSettings;
  private onStatus?: (s: LayeredStatus) => void;

  // graph
  private beatGain!: AnyNode;
  private vocalGain!: AnyNode;
  private drivePre!: AnyNode;
  private drivePost!: AnyNode;
  private shaper!: ReturnType<AnyCtx['createWaveShaper']>;
  private filter!: ReturnType<AnyCtx['createBiquadFilter']>;
  private reverbSend!: AnyNode;
  private echoSend!: AnyNode;
  private delay!: ReturnType<AnyCtx['createDelay']>;
  private fbGain!: AnyNode;
  private masterGain!: AnyNode;

  // sources / buffers
  private beatBuf: AnyBuffer | null = null;
  private vocalBuf: AnyBuffer | null = null;
  private beatSrc: AnySource | null = null;
  private vocalSrc: AnySource | null = null;

  // transport
  private playing = false;
  private basePos = 0; // seconds accumulated before the current run
  private wallStart = 0; // Date.now() when the current run started
  private durationSec = 0;
  private hasVocal = false;
  private finished = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private loadToken = 0;
  private released = false;

  constructor(mix: MixSettings, mod: RNAA) {
    this.mod = mod;
    this.mix = withMixDefaults(mix);
  }

  setStatusListener(cb: (s: LayeredStatus) => void) {
    this.onStatus = cb;
  }

  load(beatSource: PlaybackSource | null, vocalUri: string | null) {
    this.disposeGraph();
    this.released = false;
    const token = ++this.loadToken;

    const ctx = new this.mod.AudioContext();
    this.ctx = ctx;
    // Configure the iOS audio session for playback; harmless / no-op elsewhere.
    try {
      this.mod.AudioManager.setAudioSessionOptions({ iosCategory: 'playback' });
      void this.mod.AudioManager.setAudioSessionActivity(true);
    } catch {
      /* session config is best-effort */
    }
    this.buildGraph(ctx);
    this.applyMix(); // initial param values
    // Start paused so loading never blasts audio; play() resumes.
    void ctx.suspend();
    this.playing = false;
    this.basePos = 0;
    this.finished = false;

    const beatInput = typeof beatSource === 'number' ? beatSource : beatSource?.uri ?? null;
    void this.decodeAndBuild(ctx, token, beatInput, vocalUri ?? null);
  }

  private async decodeAndBuild(
    ctx: AnyCtx,
    token: number,
    beatInput: number | string | null,
    vocalUri: string | null
  ) {
    try {
      const [bb, vb] = await Promise.all([
        beatInput != null ? this.decode(ctx, beatInput) : Promise.resolve(null),
        vocalUri ? this.decode(ctx, vocalUri) : Promise.resolve(null),
      ]);
      if (token !== this.loadToken || this.released) return;
      this.beatBuf = bb;
      this.vocalBuf = vb;
      this.hasVocal = !!vb;
      this.durationSec = vb?.duration ?? bb?.duration ?? 0;
      this.buildSources();
      this.emit();
    } catch {
      // Leave the engine silent but alive; the UI still works.
      if (token === this.loadToken) this.emit();
    }
  }

  /** Decode an asset id / uri, resolving bundled `require()` ids via expo-asset on fallback. */
  private async decode(ctx: AnyCtx, input: number | string): Promise<AnyBuffer> {
    try {
      return await ctx.decodeAudioData(input);
    } catch (err) {
      if (typeof input === 'number') {
        const asset = Asset.fromModule(input);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (uri) return await ctx.decodeAudioData(uri);
      }
      throw err;
    }
  }

  private buildGraph(ctx: AnyCtx) {
    this.beatGain = ctx.createGain();
    this.vocalGain = ctx.createGain();
    this.drivePre = ctx.createGain();
    this.drivePost = ctx.createGain();
    this.shaper = ctx.createWaveShaper();
    this.shaper.curve = makeTanhCurve();
    this.shaper.oversample = '2x';
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    const sum = ctx.createGain();
    const preMaster = ctx.createGain();
    this.reverbSend = ctx.createGain();
    this.echoSend = ctx.createGain();
    const convolver = ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = this.makeImpulse(ctx);
    this.delay = ctx.createDelay(1.0);
    this.delay.delayTime.value = 0.33;
    this.fbGain = ctx.createGain();
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 1;

    // beat → gain → drive(pre→shaper→post) → sum
    this.beatGain.connect(this.drivePre);
    this.drivePre.connect(this.shaper);
    this.shaper.connect(this.drivePost);
    this.drivePost.connect(sum);
    // vocal → gain → sum (kept clean, no drive)
    this.vocalGain.connect(sum);
    // sum → filter → preMaster
    sum.connect(this.filter);
    this.filter.connect(preMaster);
    // dry
    preMaster.connect(this.masterGain);
    // reverb send → convolver → master
    preMaster.connect(this.reverbSend);
    this.reverbSend.connect(convolver);
    convolver.connect(this.masterGain);
    // echo send → delay (with feedback loop) → master
    preMaster.connect(this.echoSend);
    this.echoSend.connect(this.delay);
    this.delay.connect(this.masterGain);
    this.delay.connect(this.fbGain);
    this.fbGain.connect(this.delay);
    // master → out
    this.masterGain.connect(ctx.destination);
  }

  /** Stereo decaying-noise impulse response — a simple, warm algorithmic room. */
  private makeImpulse(ctx: AnyCtx): AnyBuffer {
    const len = Math.floor(ctx.sampleRate * 1.8);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6);
      }
    }
    return ir;
  }

  private buildSources() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.stopSources();
    if (this.beatBuf) {
      const s = ctx.createBufferSource();
      s.buffer = this.beatBuf;
      s.loop = true;
      s.connect(this.beatGain);
      s.start();
      this.beatSrc = s;
    }
    if (this.vocalBuf) {
      const v = ctx.createBufferSource();
      v.buffer = this.vocalBuf;
      v.loop = false;
      v.connect(this.vocalGain);
      v.start();
      this.vocalSrc = v;
    }
    this.basePos = 0;
    this.wallStart = Date.now();
  }

  private stopSources() {
    for (const s of [this.beatSrc, this.vocalSrc]) {
      try {
        s?.stop();
        s?.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.beatSrc = null;
    this.vocalSrc = null;
  }

  setMix(mix: MixSettings) {
    this.mix = withMixDefaults(mix);
    this.applyMix();
  }

  private applyMix() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const m = this.mix;
    const ramp = (p: { value: number; setTargetAtTime: (v: number, s: number, tc: number) => unknown }, v: number) => {
      try {
        p.setTargetAtTime(v, t, 0.02);
      } catch {
        p.value = v;
      }
    };

    ramp(this.beatGain.gain, m.beatVolume);
    ramp(this.vocalGain.gain, m.vocalVolume);

    // DJ filter: one knob, low-pass below center, high-pass above.
    if (m.filter <= 0.5) {
      this.filter.type = 'lowpass';
      const k = m.filter / 0.5; // 0 (closed) .. 1 (open)
      ramp(this.filter.frequency, mapLog(180, 18000, k));
      ramp(this.filter.Q, 0.9 + (1 - k) * 2.2);
    } else {
      this.filter.type = 'highpass';
      const k = (m.filter - 0.5) / 0.5; // 0 (open) .. 1 (thin)
      ramp(this.filter.frequency, mapLog(20, 3000, k));
      ramp(this.filter.Q, 0.9 + k * 2.2);
    }

    ramp(this.reverbSend.gain, m.space * 0.9);
    ramp(this.echoSend.gain, m.echo * 0.7);
    ramp(this.fbGain.gain, 0.28 + m.echo * 0.3);

    // Drive: push into the fixed tanh shaper, then trim back the makeup gain.
    ramp(this.drivePre.gain, 1 + m.drive * 7);
    ramp(this.drivePost.gain, 1 / (1 + m.drive * 2.2));
  }

  play() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.finished) this.buildSources(); // restart a finished take
    this.finished = false;
    void ctx.resume();
    this.playing = true;
    this.wallStart = Date.now();
    this.startTimer();
    this.emit();
  }

  pause() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.basePos = this.currentPos();
    this.playing = false;
    void ctx.suspend();
    this.stopTimer();
    this.emit();
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.playing = false;
    void ctx.suspend();
    this.stopTimer();
    this.buildSources(); // reset to 0
    this.basePos = 0;
    this.finished = false;
    this.emit();
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  release() {
    this.released = true;
    this.stopTimer();
    this.disposeGraph();
  }

  private disposeGraph() {
    this.stopTimer();
    this.stopSources();
    const ctx = this.ctx;
    this.ctx = null;
    this.beatBuf = null;
    this.vocalBuf = null;
    this.playing = false;
    if (ctx) {
      try {
        void ctx.close();
      } catch {
        /* noop */
      }
    }
  }

  private currentPos(): number {
    if (!this.playing) return this.basePos;
    return this.basePos + (Date.now() - this.wallStart) / 1000;
  }

  private startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), STATUS_INTERVAL_MS);
  }

  private stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const pos = this.currentPos();
    if (this.hasVocal && this.durationSec > 0 && pos >= this.durationSec) {
      // Vocal take ended — stop and report the finish once.
      this.playing = false;
      void this.ctx?.suspend();
      this.stopTimer();
      this.buildSources();
      this.basePos = 0;
      this.finished = true;
      this.emit(true);
      return;
    }
    this.emit();
  }

  private emit(didJustFinish = false) {
    const pos = this.currentPos();
    const positionSec =
      this.hasVocal || this.durationSec <= 0 ? pos : pos % this.durationSec;
    this.onStatus?.({
      playing: this.playing,
      positionSec,
      durationSec: this.durationSec,
      didJustFinish,
    });
  }
}

/**
 * Build the best available preview engine: the real-time FX graph when the
 * native module is present (custom dev/release build), else the expo-audio
 * volume-only player. Both honour the same `PlaybackEngine` interface.
 */
export function createPlaybackEngine(mix: MixSettings): PlaybackEngine {
  const mod = loadModule();
  if (mod && fxIsAvailable(mod)) {
    try {
      return new FxPlayer(mix, mod);
    } catch {
      /* fall through to the simple player */
    }
  }
  return new LayeredPlayer(mix);
}

/** Whether live DJ FX are active in this build (used to tune copy/UI). */
export function fxEngineActive(): boolean {
  const mod = loadModule();
  return !!(mod && fxIsAvailable(mod));
}
