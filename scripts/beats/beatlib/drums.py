"""Synthesized drum voices and the pattern renderer.

Each voice is built the way the classic machines build them (sine pitch
sweeps for kicks/toms, tuned body + filtered noise for snares, inharmonic
square banks for hats), with per-beat random variation so two beats never
share an identical kit."""
import math

import numpy as np

from .dsp import SR, secs, hp, lp, filt, soft, noise, decay, sine, square, fade

VOICE_BUS = {
    'kick': 'kick', 'kick2': 'kick',
    'snare': 'snare', 'clap': 'snare', 'rim': 'snare', 'snap': 'snare', 'snare2': 'snare',
    'hat': 'hats', 'ohat': 'hats', 'ride': 'hats', 'shaker': 'hats', 'tamb': 'hats',
    'conga_hi': 'perc', 'conga_lo': 'perc', 'bongo': 'perc', 'tom_hi': 'perc', 'tom_lo': 'perc',
    'perc': 'perc', 'clave': 'perc', 'cowbell': 'perc',
    'crash': 'fx', 'revcym': 'fx', 'riser': 'fx', 'impact': 'fx', 'downlift': 'fx',
}


def _norm(x: np.ndarray, peak: float = 1.0) -> np.ndarray:
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


class Kit:
    """A seeded drum kit: every voice is synthesized once and reused."""

    def __init__(self, rng: np.random.Generator, style: str):
        self.rng = rng
        self.style = style
        self.cache: dict = {}
        r = rng.uniform
        # per-kit character
        self.kick_f_end = r(44, 56)
        self.kick_f_start = r(130, 230)
        self.kick_tau = {'trap': r(0.16, 0.26), 'drill': r(0.12, 0.2), 'rnb': r(0.2, 0.32), 'afro': r(0.12, 0.2),
                         'pop': r(0.12, 0.2), 'hyper': r(0.14, 0.22), 'indie': r(0.1, 0.16)}.get(style, 0.18)
        self.kick_drive = {'trap': 2.2, 'drill': 2.4, 'hyper': 4.0, 'pop': 1.8, 'afro': 1.6}.get(style, 1.4)
        self.snare_f = r(170, 230)
        self.snare_tau = r(0.1, 0.19)
        self.snare_tone = r(3500, 6500)
        self.hat_scale = r(1.6, 2.6)
        self.hat_tau = r(0.018, 0.038)
        self.ohat_tau = r(0.12, 0.26)
        self.clap_tau = r(0.07, 0.14)
        self.clap_f = r(1000, 1700)

    def get(self, voice: str, pitch: float = 0.0) -> np.ndarray:
        k = (voice, round(pitch, 2))
        if k not in self.cache:
            self.cache[k] = getattr(self, '_' + voice)(pitch)
        return self.cache[k]

    # --- voices --------------------------------------------------------------------

    def _kick(self, pitch=0.0):
        n = secs(0.9 if self.style in ('rnb', 'trap') else 0.6)
        t = np.arange(n) / SR
        f_end = self.kick_f_end * 2 ** (pitch / 12)
        f = f_end + (self.kick_f_start - f_end) * np.exp(-t / 0.032)
        body = sine(f) * np.exp(-t / self.kick_tau)
        click = hp(noise(n, self.rng), 2500) * np.exp(-t / 0.0025) * 0.35
        thump = sine(np.full(n, f_end * 2.02)) * np.exp(-t / 0.02) * 0.25
        x = soft(body + click + thump, self.kick_drive)
        return fade(_norm(x), 0.0005, 0.02)

    def _kick2(self, pitch=0.0):  # softer ghost kick
        return self._kick(pitch) * 0.6

    def _snare(self, pitch=0.0):
        n = secs(0.45)
        t = np.arange(n) / SR
        f0 = self.snare_f * 2 ** (pitch / 12)
        fdrop = f0 * (1 + 0.5 * np.exp(-t / 0.01))
        body = sine(fdrop) * np.exp(-t / 0.055) * 0.75 + sine(fdrop * 1.62) * np.exp(-t / 0.035) * 0.35
        nz = hp(noise(n, self.rng), 1200)
        nz = filt(nz, 'peak', self.snare_tone, 0.8, 6)
        nz = nz * np.exp(-t / self.snare_tau)
        x = soft(body + nz * 0.9, 1.6)
        return fade(_norm(x), 0.0003, 0.02)

    def _snare2(self, pitch=0.0):  # lighter, brighter ghost snare
        x = self._snare(pitch + 2)
        return hp(x, 600) * 0.45

    def _clap(self, pitch=0.0):
        n = secs(0.5)
        t = np.arange(n) / SR
        nz = filt(noise(n, self.rng), 'bp', self.clap_f * 2 ** (pitch / 12), 0.9)
        nz = hp(nz, 700)
        env = np.zeros(n)
        for k, off in enumerate((0.0, 0.009, 0.018, 0.026)):
            s = secs(off)
            seg = np.exp(-(t[: n - s]) / (0.004 if k < 3 else self.clap_tau))
            env[s:] = np.maximum(env[s:], seg * (0.85 if k < 3 else 1.0))
        x = nz * env
        x = x + 0.25 * hp(noise(n, self.rng), 4000) * np.exp(-t / 0.03)
        return fade(_norm(soft(x, 1.3)), 0.0002, 0.03)

    def _rim(self, pitch=0.0):
        n = secs(0.12)
        t = np.arange(n) / SR
        f = 1750 * 2 ** (pitch / 12)
        x = sine(np.full(n, f)) * np.exp(-t / 0.012) + 0.6 * sine(np.full(n, f * 0.32)) * np.exp(-t / 0.02)
        x += hp(noise(n, self.rng), 3000) * np.exp(-t / 0.003) * 0.5
        return fade(_norm(x), 0.0002, 0.01)

    def _snap(self, pitch=0.0):
        n = secs(0.15)
        t = np.arange(n) / SR
        nz = filt(noise(n, self.rng), 'bp', 2400 * 2 ** (pitch / 12), 1.4)
        env = np.exp(-t / 0.018)
        env2 = np.zeros(n)
        s = secs(0.006)
        env2[s:] = np.exp(-t[: n - s] / 0.025)
        return fade(_norm(nz * (env + 0.7 * env2)), 0.0002, 0.01)

    def _metal(self, n: int, scale: float) -> np.ndarray:
        ratios = (205.3, 304.4, 369.6, 522.7, 540.0, 800.0)
        x = np.zeros(n)
        for f in ratios:
            x += square(np.full(n, f * scale), self.rng.uniform())
        return x

    def _hat(self, pitch=0.0):
        n = secs(0.25)
        t = np.arange(n) / SR
        x = self._metal(n, self.hat_scale * 2 ** (pitch / 12)) * 0.6 + noise(n, self.rng) * 0.5
        x = hp(filt(x, 'bp', 10000, 0.6), 6500, order=2)
        x = x * np.exp(-t / self.hat_tau)
        return fade(_norm(x), 0.0002, 0.01)

    def _ohat(self, pitch=0.0):
        n = secs(0.9)
        t = np.arange(n) / SR
        x = self._metal(n, self.hat_scale * 2 ** (pitch / 12)) * 0.6 + noise(n, self.rng) * 0.5
        x = hp(filt(x, 'bp', 9500, 0.5), 5500, order=2)
        x = x * np.exp(-t / self.ohat_tau)
        return fade(_norm(x), 0.0005, 0.05)

    def _ride(self, pitch=0.0):
        n = secs(1.6)
        t = np.arange(n) / SR
        x = self._metal(n, self.hat_scale * 0.8) * 0.5 + noise(n, self.rng) * 0.3
        x = hp(filt(x, 'bp', 6500, 0.7), 3000)
        ping = sine(np.full(n, 3200.0)) * 0.25
        x = (x + ping) * np.exp(-t / 0.5)
        return fade(_norm(x), 0.0005, 0.1)

    def _shaker(self, pitch=0.0):
        n = secs(0.12)
        t = np.arange(n) / SR
        x = filt(noise(n, self.rng), 'bp', 7500 * 2 ** (pitch / 12), 1.2)
        env = np.minimum(1.0, t / 0.008) * np.exp(-np.maximum(0, t - 0.008) / 0.035)
        return fade(_norm(hp(x * env, 4000)), 0.0005, 0.01)

    def _tamb(self, pitch=0.0):
        n = secs(0.35)
        t = np.arange(n) / SR
        jingles = np.zeros(n)
        for f in (6800, 7900, 9100, 10400):
            jingles += sine(np.full(n, f * self.rng.uniform(0.97, 1.03)))
        x = jingles * 0.3 + hp(noise(n, self.rng), 6000)
        x *= np.exp(-t / 0.09) * (1 + 0.5 * np.sin(2 * math.pi * 38 * t))
        return fade(_norm(hp(x, 5000)), 0.0005, 0.02)

    def _drum(self, f0: float, tau: float, slap: float, n_s: float = 0.5) -> np.ndarray:
        n = secs(n_s)
        t = np.arange(n) / SR
        f = f0 * (1 + 0.25 * np.exp(-t / 0.015))
        x = sine(f) * np.exp(-t / tau) + 0.3 * sine(f * 1.5) * np.exp(-t / (tau * 0.5))
        x += slap * filt(noise(n, self.rng), 'bp', 2500, 0.8) * np.exp(-t / 0.008)
        return fade(_norm(soft(x, 1.2)), 0.0003, 0.02)

    def _conga_hi(self, pitch=0.0):
        return self._drum(330 * 2 ** (pitch / 12), 0.12, 0.5)

    def _conga_lo(self, pitch=0.0):
        return self._drum(220 * 2 ** (pitch / 12), 0.16, 0.4)

    def _bongo(self, pitch=0.0):
        return self._drum(480 * 2 ** (pitch / 12), 0.07, 0.6, 0.3)

    def _tom_hi(self, pitch=0.0):
        return self._drum(190 * 2 ** (pitch / 12), 0.22, 0.25, 0.8)

    def _tom_lo(self, pitch=0.0):
        return self._drum(120 * 2 ** (pitch / 12), 0.3, 0.2, 0.9)

    def _clave(self, pitch=0.0):
        n = secs(0.12)
        t = np.arange(n) / SR
        x = sine(np.full(n, 2500 * 2 ** (pitch / 12))) * np.exp(-t / 0.018)
        return fade(_norm(x), 0.0002, 0.01)

    def _cowbell(self, pitch=0.0):
        n = secs(0.4)
        t = np.arange(n) / SR
        x = square(np.full(n, 540 * 2 ** (pitch / 12))) + square(np.full(n, 800 * 2 ** (pitch / 12)))
        x = filt(x, 'bp', 1800, 1.2) * np.exp(-t / 0.08)
        return fade(_norm(x), 0.0003, 0.02)

    def _perc(self, pitch=0.0):  # pitched pluck-perc (afro / pop ear candy)
        n = secs(0.25)
        t = np.arange(n) / SR
        f = 880 * 2 ** (pitch / 12)
        x = sine(np.full(n, f)) * np.exp(-t / 0.05) + 0.4 * sine(np.full(n, f * 2.76)) * np.exp(-t / 0.02)
        return fade(_norm(x), 0.0003, 0.02)

    def _crash(self, pitch=0.0):
        n = secs(2.6)
        t = np.arange(n) / SR
        x = self._metal(n, self.hat_scale * 0.6) * 0.4 + noise(n, self.rng)
        x = hp(x, 3500, order=2)
        x = lp(x, 14000) * (np.exp(-t / 0.7) * (0.6 + 0.4 * np.exp(-t / 0.05)))
        return fade(_norm(x), 0.0005, 0.3)

    def _revcym(self, pitch=0.0):
        x = self._crash()[: secs(1.8)][::-1]
        return fade(x, 0.2, 0.004)

    def _riser(self, pitch=0.0):
        n = secs(3.5)
        t = np.arange(n) / SR
        nz = noise(n, self.rng)
        cut = 400 * (30 ** (t / t[-1]))
        out = np.zeros(n)
        blk = 256
        for s in range(0, n, blk):
            out[s:s + blk] = filt(nz[s:s + blk], 'bp', float(cut[s]), 1.2)
        env = (t / t[-1]) ** 2
        return fade(_norm(out * env), 0.05, 0.004)

    def _impact(self, pitch=0.0):
        n = secs(2.2)
        t = np.arange(n) / SR
        f = 38 + 80 * np.exp(-t / 0.08)
        x = sine(f) * np.exp(-t / 0.6) + 0.3 * lp(noise(n, self.rng), 900) * np.exp(-t / 0.25)
        return fade(_norm(soft(x, 1.6)), 0.0005, 0.2)

    def _downlift(self, pitch=0.0):
        return self._riser()[::-1] * 0.8


def render_hits(kit: Kit, hits, beat_s: float, n: int) -> dict:
    """hits: [(beat, voice, vel 0..1, pitch, pan)] -> {bus: stereo array of length n (+tail)}."""
    tail = secs(3.0)
    buses: dict = {}
    for beat, voice, vel, pitch, pan_pos in hits:
        x = kit.get(voice, pitch) * vel
        bus = VOICE_BUS.get(voice, 'perc')
        if bus not in buses:
            buses[bus] = np.zeros((n + tail, 2))
        s = int(round(beat * beat_s * SR))
        if voice == 'revcym' or voice == 'riser':
            s -= len(x)  # reverse/rising sounds END on the beat
        a = math.pi / 4 * (pan_pos + 1)
        L, R = math.cos(a), math.sin(a)
        if s < 0:  # wraps from the end of the loop
            s += n
        e = min(s + len(x), n + tail)
        buses[bus][s:e, 0] += x[: e - s] * L
        buses[bus][s:e, 1] += x[: e - s] * R
    return buses
