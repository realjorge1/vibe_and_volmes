"""Synthesized instruments: 808 bass with glides, log drum, sub, plucks,
supersaw pads and stabs, FM bells, leads and formant "vocal" chops.

Every renderer takes notes (theory.Note, times in beats) and returns a
stereo buffer of length n + tail, so it can be mixed like any stem."""
import math

import numpy as np

from .dsp import SR, secs, hp, lp, filt, soft, saw, sine, square, sweep_lp, midi_hz, fade, crush, noise

TAIL = 3.0


def _buf(n: int) -> np.ndarray:
    return np.zeros((n + secs(TAIL), 2))


def _place(buf: np.ndarray, x: np.ndarray, start: int, pan_pos: float = 0.0):
    if start < 0:
        start += len(buf) - secs(TAIL)
    a = math.pi / 4 * (pan_pos + 1)
    e = min(start + len(x), len(buf))
    if x.ndim == 1:
        buf[start:e, 0] += x[: e - start] * math.cos(a)
        buf[start:e, 1] += x[: e - start] * math.sin(a)
    else:
        buf[start:e] += x[: e - start]


def bass808(notes, beat_s: float, n: int, rng: np.random.Generator, drive: float = 2.5, decay_s: float = 1.2,
            glide_s: float = 0.09, punch: float = 0.6) -> np.ndarray:
    """One continuous 808 voice: retriggers on new notes, slides on glide notes."""
    total = n + secs(TAIL)
    freq = np.zeros(total)
    amp = np.zeros(total)
    notes = sorted(notes, key=lambda x: x.t)
    prev_f = None
    seg_start_amp = 0.0
    for i, nt in enumerate(notes):
        s = int(round(nt.t * beat_s * SR))
        e = int(round((nt.t + nt.dur) * beat_s * SR))
        nxt = int(round(notes[i + 1].t * beat_s * SR)) if i + 1 < len(notes) else e
        e = min(max(e, s + secs(0.05)), total)
        f = midi_hz(nt.pitch)
        L = e - s
        t = np.arange(L) / SR
        if nt.glide and prev_f is not None:
            g = min(L, secs(glide_s))
            curve = np.ones(L) * f
            curve[:g] = prev_f * (f / prev_f) ** (np.linspace(0, 1, g) ** 0.6)
            freq[s:e] = curve
            a0 = seg_start_amp
            amp[s:e] = a0 * np.exp(-t / decay_s)
        else:
            freq[s:e] = f * (1 + punch * np.exp(-t / 0.018))
            env = np.exp(-t / decay_s)
            env[: secs(0.002)] *= np.linspace(0, 1, secs(0.002))
            amp[s:e] = env * (nt.vel / 110.0)
        # release
        r = min(secs(0.035), total - e)
        last_amp = amp[e - 1] if e > s else 0
        if r > 0 and (i + 1 >= len(notes) or nxt > e or not notes[i + 1].glide):
            amp[e:e + r] = last_amp * np.linspace(1, 0, r)
            freq[e:e + r] = freq[e - 1]
        seg_start_amp = amp[e - 1] if e > s else 0
        prev_f = f
    freq[freq == 0] = 50.0
    x = sine(freq) * amp
    x = x + 0.12 * x * x  # a touch of 2nd harmonic (warmth)
    x = soft(x * 1.0, drive)
    x = hp(lp(x, 4200), 26)
    out = np.stack([x, x], axis=1)
    return out


def logdrum(notes, beat_s: float, n: int, rng: np.random.Generator, tau: float = 0.24) -> np.ndarray:
    """Amapiano-style log drum: woody pitched hit with a downward pitch flick."""
    buf = _buf(n)
    for nt in notes:
        f = midi_hz(nt.pitch)
        L = secs(max(0.25, min(nt.dur * beat_s + 0.2, 1.2)))
        t = np.arange(L) / SR
        fr = f * (1 + 0.8 * np.exp(-t / 0.012))
        x = sine(fr) + 0.45 * sine(fr * 2.0) * np.exp(-t / 0.08) + 0.18 * sine(fr * 3.01) * np.exp(-t / 0.04)
        x *= np.exp(-t / tau)
        x = soft(x, 2.2)
        x = lp(x, 2600)
        _place(buf, fade(x * (nt.vel / 110), 0.001, 0.02), int(round(nt.t * beat_s * SR)))
    return buf


def sub(notes, beat_s: float, n: int, rng: np.random.Generator, warmth: float = 0.2) -> np.ndarray:
    buf = _buf(n)
    for nt in notes:
        f = midi_hz(nt.pitch)
        L = secs(nt.dur * beat_s) + secs(0.06)
        t = np.arange(L) / SR
        x = sine(np.full(L, f)) + warmth * sine(np.full(L, f * 2))
        env = np.minimum(1, t / 0.008) * np.where(t < nt.dur * beat_s, 1.0, np.exp(-(t - nt.dur * beat_s) / 0.02))
        _place(buf, soft(x * env, 1.3) * (nt.vel / 110), int(round(nt.t * beat_s * SR)))
    return buf


def _unison(f: float, L: int, voices: int, detune: float, rng: np.random.Generator, shape: str = 'saw'):
    """Detuned stack of oscillators -> (left, right)."""
    left = np.zeros(L)
    right = np.zeros(L)
    for v in range(voices):
        off = 0.0 if voices == 1 else (v / (voices - 1) - 0.5) * 2 * detune
        fv = np.full(L, f * 2 ** (off / 12))
        osc = saw(fv, rng.uniform()) if shape == 'saw' else square(fv, rng.uniform())
        p = 0.5 if voices == 1 else v / (voices - 1)
        left += osc * math.cos(p * math.pi / 2)
        right += osc * math.sin(p * math.pi / 2)
    g = 1 / math.sqrt(max(1, voices))
    return left * g, right * g


def pluck(notes, beat_s: float, n: int, rng: np.random.Generator, bright: float = 5000, voices: int = 3,
          detune: float = 0.12, decay_s: float = 0.32, shape: str = 'saw') -> np.ndarray:
    buf = _buf(n)
    for nt in notes:
        f = midi_hz(nt.pitch)
        hold = nt.dur * beat_s
        L = secs(hold + 0.35)
        t = np.arange(L) / SR
        l, r = _unison(f, L, voices, detune, rng, shape)
        cut = 300 + bright * np.exp(-t / (decay_s * 0.6)) + f * 1.5
        env = np.minimum(1, t / 0.002) * (0.25 + 0.75 * np.exp(-t / decay_s))
        env *= np.where(t < hold, 1.0, np.exp(-(t - hold) / 0.08))
        st = np.stack([l, r], axis=1)
        st = sweep_lp(st, cut, 0.9)
        _place(buf, st * env[:, None] * (nt.vel / 110), int(round(nt.t * beat_s * SR)))
    return buf


def pad(chords, beat_s: float, n: int, rng: np.random.Generator, cutoff: float = 2200, voices: int = 5,
        detune: float = 0.16, attack: float = 0.35, release: float = 0.6) -> np.ndarray:
    """chords: [(start_beat, dur_beats, [pitches])] -> lush supersaw bed."""
    buf = _buf(n)
    for start, dur, pitches in chords:
        hold = dur * beat_s
        L = secs(hold + release * 3)
        t = np.arange(L) / SR
        env = np.minimum(1, t / attack) * np.where(t < hold, 1.0, np.exp(-(t - hold) / release))
        acc = np.zeros((L, 2))
        for p in pitches:
            l, r = _unison(midi_hz(p), L, voices, detune, rng)
            acc[:, 0] += l
            acc[:, 1] += r
        acc = lp(acc, cutoff, order=2)
        acc = hp(acc, 120)
        _place(buf, acc * env[:, None] / max(1, len(pitches)) ** 0.5, int(round(start * beat_s * SR)))
    return buf


def stab(chords, beat_s: float, n: int, rng: np.random.Generator, cutoff: float = 4500, voices: int = 7,
         detune: float = 0.2, decay_s: float = 0.22) -> np.ndarray:
    """Short supersaw chord stabs (pop/hyperpop)."""
    buf = _buf(n)
    for start, dur, pitches in chords:
        hold = dur * beat_s
        L = secs(hold + 0.4)
        t = np.arange(L) / SR
        env = np.minimum(1, t / 0.003) * np.exp(-t / max(decay_s, hold * 0.6))
        acc = np.zeros((L, 2))
        for p in pitches:
            l, r = _unison(midi_hz(p), L, voices, detune, rng)
            acc[:, 0] += l
            acc[:, 1] += r
        cut = cutoff * (0.4 + 0.6 * np.exp(-t / 0.15)) + 400
        acc = sweep_lp(acc, cut, 0.8)
        _place(buf, acc * env[:, None] / max(1, len(pitches)) ** 0.5, int(round(start * beat_s * SR)))
    return buf


def bell(notes, beat_s: float, n: int, rng: np.random.Generator, ratio: float = 3.5, index: float = 3.0,
         decay_s: float = 1.1, bits: int = 0) -> np.ndarray:
    """FM bell / glass keys. bits > 0 crushes it (hyperpop)."""
    buf = _buf(n)
    for nt in notes:
        f = midi_hz(nt.pitch)
        L = secs(max(nt.dur * beat_s, 0.2) + decay_s * 1.5)
        t = np.arange(L) / SR
        I = index * np.exp(-t / (decay_s * 0.35))
        x = np.sin(2 * math.pi * f * t + I * np.sin(2 * math.pi * f * ratio * t))
        x += 0.25 * np.sin(2 * math.pi * f * 2 * t) * np.exp(-t / (decay_s * 0.5))
        env = np.minimum(1, t / 0.0015) * np.exp(-t / decay_s)
        x = x * env
        if bits:
            x = crush(x, bits, 2)
        _place(buf, fade(x * (nt.vel / 110), 0.0005, 0.05), int(round(nt.t * beat_s * SR)), rng.uniform(-0.3, 0.3))
    return buf


def lead(notes, beat_s: float, n: int, rng: np.random.Generator, shape: str = 'saw', cutoff: float = 3200,
         vibrato: float = 0.15, glide_s: float = 0.05, voices: int = 2) -> np.ndarray:
    """Monophonic lead with portamento and delayed vibrato."""
    total = n + secs(TAIL)
    freq = np.full(total, 0.0)
    amp = np.zeros(total)
    prev = None
    for nt in sorted(notes, key=lambda x: x.t):
        s = int(round(nt.t * beat_s * SR))
        e = min(total, s + secs(nt.dur * beat_s))
        L = e - s
        if L <= 0:
            continue
        t = np.arange(L) / SR
        f = midi_hz(nt.pitch)
        fc = np.full(L, f)
        if prev is not None and nt.glide:
            g = min(L, secs(glide_s))
            fc[:g] = prev * (f / prev) ** np.linspace(0, 1, g)
        vib = 1 + vibrato / 12 * np.sin(2 * math.pi * 5.2 * t) * np.clip((t - 0.15) / 0.2, 0, 1) * math.log(2)
        freq[s:e] = fc * vib
        a = np.minimum(1, t / 0.01) * (0.8 + 0.2 * np.exp(-t / 0.15)) * (nt.vel / 110)
        r = min(secs(0.06), L)
        a[-r:] *= np.linspace(1, 0, r)
        amp[s:e] = np.maximum(amp[s:e], a)
        prev = f
    freq[freq == 0] = 220.0
    l, r = np.zeros(total), np.zeros(total)
    for v in range(voices):
        det = 2 ** ((v - (voices - 1) / 2) * 0.08 / 12)
        osc = saw(freq * det, rng.uniform()) if shape == 'saw' else square(freq * det, rng.uniform())
        l += osc * (1 - v / max(1, voices))
        r += osc * (v / max(1, voices - 1) if voices > 1 else 1)
    st = np.stack([l, r], axis=1) * amp[:, None]
    st = lp(st, cutoff, order=2)
    return st


VOWELS = {
    'ah': [(800, 1.0), (1150, 0.5), (2900, 0.25)],
    'oh': [(450, 1.0), (800, 0.45), (2830, 0.15)],
    'ee': [(300, 1.0), (2300, 0.35), (3000, 0.25)],
    'oo': [(325, 1.0), (700, 0.3), (2530, 0.1)],
}


def chop(notes, beat_s: float, n: int, rng: np.random.Generator, vowel: str = 'ah') -> np.ndarray:
    """Formant-filtered 'vocal' chops: pitched vowel stabs with breath."""
    buf = _buf(n)
    forms = VOWELS[vowel]
    for nt in notes:
        f = midi_hz(nt.pitch)
        L = secs(nt.dur * beat_s + 0.12)
        t = np.arange(L) / SR
        vib = 1 + 0.004 * np.sin(2 * math.pi * 5.5 * t)
        src = saw(np.full(L, f) * vib, rng.uniform()) + 0.08 * noise(L, rng)
        x = np.zeros(L)
        for ff, g in forms:
            x += filt(src, 'bp', ff, 5.0) * g
        env = np.minimum(1, t / 0.012) * np.where(t < nt.dur * beat_s, 1.0, np.exp(-(t - nt.dur * beat_s) / 0.04))
        _place(buf, x * env * (nt.vel / 110) * 2.2, int(round(nt.t * beat_s * SR)), rng.uniform(-0.25, 0.25))
    return buf


RENDERERS = {
    '808': bass808, 'log': logdrum, 'sub': sub, 'pluck': pluck, 'bell': bell, 'lead': lead, 'chop': chop,
}
