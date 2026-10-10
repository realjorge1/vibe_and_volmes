"""Song model + the mix: stems -> processing -> sends -> bus -> seamless loop -> master."""
from dataclasses import dataclass, field

import numpy as np

from . import dsp
from .dsp import SR, secs, db
from .drums import Kit, render_hits
from .sfrender import render as sf_render
from . import synths


@dataclass
class Mix:
    gain_db: float = 0.0
    pan: float = 0.0
    width: float = 1.0
    hp: float = 0.0
    lp: float = 0.0
    eq: list = field(default_factory=list)        # [(kind, f, gain_db, q)]
    comp: dict | None = None                      # compress() kwargs
    drive: float = 0.0                            # saturation
    tape: float = 0.0
    chorus: float = 0.0                           # chorus mix
    haas_ms: float = 0.0
    reverb: float = 0.0                           # send level
    room: str = 'plate'                           # which reverb
    delay: float = 0.0                            # send level
    duck: float = 0.0                             # sidechain depth 0..1 from the kick
    crush_bits: int = 0


@dataclass
class Part:
    name: str
    kind: str                                     # 'sf' | 'synth'
    notes: list = field(default_factory=list)
    chords: list = field(default_factory=list)    # pad/stab: [(start, dur, [pitches])]
    bank: int = 0
    program: int = 0
    drums: bool = False                           # sf drum kit on channel 10
    synth: str = ''
    params: dict = field(default_factory=dict)
    mix: Mix = field(default_factory=Mix)
    level: float = 0.25                           # target RMS-ish before gain_db (normalization)


@dataclass
class Song:
    id: str
    bpm: float
    bars: int
    parts: list
    hits: list                                    # synthesized drums [(beat, voice, vel, pitch, pan)]
    kit_style: str
    bus_mix: dict = field(default_factory=dict)   # drum bus name -> Mix
    kick_beats: list = field(default_factory=list)
    delay_beats: float = 0.75
    rooms: dict = field(default_factory=lambda: {'room': 0.9, 'plate': 1.7, 'hall': 3.0})
    master: dict = field(default_factory=dict)

    @property
    def beat_s(self) -> float:
        return 60.0 / self.bpm

    @property
    def n(self) -> int:
        return int(round(self.bars * 4 * self.beat_s * SR))


def _rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x ** 2) + 1e-12))


def _active_rms(x: np.ndarray) -> float:
    """RMS over the loud part of a stem (ignores silence between notes)."""
    m = np.abs(dsp.mono(x))
    if m.max() <= 0:
        return 1e-6
    blk = secs(0.05)
    k = len(m) // blk
    if k == 0:
        return _rms(x)
    r = np.sqrt(np.mean(m[: k * blk].reshape(k, blk) ** 2, axis=1))
    top = np.sort(r)[-max(1, k // 3):]
    return float(np.mean(top))


def process(x: np.ndarray, m: Mix, duck: np.ndarray | None) -> np.ndarray:
    if m.hp:
        x = dsp.hp(x, m.hp, order=2)
    if m.lp:
        x = dsp.lp(x, m.lp, order=2)
    if m.eq:
        x = dsp.eq(x, m.eq)
    if m.crush_bits:
        x = dsp.crush(x, m.crush_bits, 2)
    if m.drive:
        x = dsp.soft(x, m.drive)
    if m.tape:
        x = dsp.tape(x, 1 + m.tape)
    if m.comp:
        x = dsp.compress(x, **m.comp)
    x = dsp.stereo(x)
    if m.chorus:
        x = dsp.chorus(x, mix=m.chorus)
    if m.haas_ms:
        x = dsp.widen(dsp.haas(dsp.mono(x), m.haas_ms), 1.0)
    if m.width != 1.0:
        x = dsp.widen(x, m.width)
    if m.pan:
        mono = dsp.mono(x)
        x = dsp.pan(mono, m.pan) * 1.41 * 0.5 + x * 0.5
    if duck is not None and m.duck > 0:
        g = 1 - m.duck * (1 - duck)
        g = np.concatenate([g, np.ones(len(x) - len(g))]) if len(g) < len(x) else g[: len(x)]
        x = x * g[:, None]
    return x * db(m.gain_db)


def render_part(p: Part, song: Song, rng: np.random.Generator) -> np.ndarray:
    n = song.n
    if p.kind == 'sf':
        return sf_render(p.notes, p.bank, p.program, song.bpm, n, drums=p.drums, cc=p.params.get('cc'))
    if p.synth == 'pad':
        return synths.pad(p.chords, song.beat_s, n, rng, **p.params)
    if p.synth == 'stab':
        return synths.stab(p.chords, song.beat_s, n, rng, **p.params)
    fn = synths.RENDERERS[p.synth]
    return fn(p.notes, song.beat_s, n, rng, **p.params)


def fold(x: np.ndarray, n: int) -> np.ndarray:
    """Wrap everything past the loop end back onto the start: a seamless loop."""
    out = np.zeros((n, 2))
    xs = dsp.stereo(x)
    for s in range(0, len(xs), n):
        seg = xs[s:s + n]
        out[: len(seg)] += seg
    return out


def circular(fn, x: np.ndarray, pad_s: float = 2.0) -> np.ndarray:
    """Apply a stateful process as if the loop had been playing forever."""
    p = min(len(x), secs(pad_s))
    padded = np.concatenate([x[-p:], x, x[:p]])
    y = fn(padded)
    return y[p:p + len(x)]


def mix_song(song: Song, seed: int, stems_out: dict | None = None) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = song.n
    beat_s = song.beat_s
    duck = dsp.duck_curve(n, [b * beat_s for b in song.kick_beats], 1.0, min(0.22, beat_s * 0.55))
    total = n + secs(8.0)
    bus = np.zeros((total, 2))
    sends = {k: np.zeros((total, 2)) for k in song.rooms}
    delay_send = np.zeros((total, 2))

    def add(dst, x):
        e = min(len(dst), len(x))
        dst[:e] += x[:e]

    # synthesized drums, one bus per group
    kit = Kit(rng, song.kit_style)
    drum_buses = render_hits(kit, song.hits, beat_s, n)
    for name, x in drum_buses.items():
        m = song.bus_mix.get(name, Mix())
        x = x / max(_active_rms(x), 1e-6) * 0.25
        y = process(x, m, duck)
        add(bus, y)
        if m.reverb:
            add(sends[m.room], y * m.reverb)
        if m.delay:
            add(delay_send, y * m.delay)
        if stems_out is not None:
            stems_out['drums:' + name] = y

    for p in song.parts:
        x = render_part(p, song, rng)
        x = x / max(_active_rms(x), 1e-6) * p.level
        y = process(x, p.mix, duck)
        add(bus, y)
        if p.mix.reverb:
            add(sends[p.mix.room], y * p.mix.reverb)
        if p.mix.delay:
            add(delay_send, y * p.mix.delay)
        if stems_out is not None:
            stems_out[p.name] = y

    # space
    for room, rt in song.rooms.items():
        s = sends[room]
        if not np.any(s):
            continue
        ir = dsp.make_ir(rt, predelay=0.012 if room == 'room' else 0.025, damping=0.6 if room == 'hall' else 0.35,
                         seed=seed % 1000 + len(room))
        wet = dsp.convolve(dsp.hp(s, 180), ir)
        add(bus, wet[:total] * 0.55)
    if np.any(delay_send):
        wet = dsp.pingpong(dsp.hp(delay_send, 250), song.delay_beats * beat_s, 0.36, 7)
        add(bus, wet[:total] * 0.5)

    loop = fold(bus, n)
    return master(loop, song.master)


def master(x: np.ndarray, cfg: dict) -> np.ndarray:
    target = cfg.get('lufs', -12.0)
    tape = cfg.get('tape', 0.0)
    tilt = cfg.get('tilt', 0.0)  # +dB = brighter

    def chain(y):
        y = dsp.hp(y, 24, order=2)
        if tilt:
            y = dsp.eq(y, [('lowshelf', 180, -tilt * 0.5, 0.7), ('highshelf', 6000, tilt, 0.7)])
        y = dsp.compress(y, threshold_db=-14, ratio=1.8, attack=0.012, release=0.2, knee_db=8)
        if tape:
            y = dsp.tape(y, 1 + tape)
        return y

    y = circular(chain, x)
    for _ in range(3):
        g = target - dsp.lufs(y)
        y = y * db(g)
        y = circular(lambda z: dsp.limit(z, cfg.get('ceiling', -1.2)), y, 0.5)
    return y
