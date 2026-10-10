"""Signal processing for the beat engine: filters, oscillators, envelopes,
space (reverb/delay/chorus), dynamics and loudness. Mono signals are 1-D
float arrays; stereo is shape (n, 2). Everything is vectorized numpy/scipy."""
import math

import numpy as np
from scipy.ndimage import minimum_filter1d, maximum_filter1d
from scipy.signal import fftconvolve, lfilter

SR = 44100


def db(x: float) -> float:
    return 10.0 ** (x / 20.0)


def to_db(x: float) -> float:
    return 20.0 * math.log10(max(x, 1e-12))


def secs(n: float) -> int:
    return int(round(n * SR))


def stereo(x: np.ndarray) -> np.ndarray:
    return x if x.ndim == 2 else np.stack([x, x], axis=1)


def mono(x: np.ndarray) -> np.ndarray:
    return x if x.ndim == 1 else x.mean(axis=1)


def pan(x: np.ndarray, p: float) -> np.ndarray:
    """Constant-power pan of a mono signal, p in [-1, 1]."""
    a = (p + 1) * math.pi / 4
    return np.stack([x * math.cos(a), x * math.sin(a)], axis=1)


# --- Filters (RBJ cookbook biquads) ---------------------------------------------


def biquad(kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0):
    f = min(max(f, 10.0), SR * 0.49)
    w0 = 2 * math.pi * f / SR
    cw, sw = math.cos(w0), math.sin(w0)
    alpha = sw / (2 * q)
    A = 10 ** (gain_db / 40)
    if kind == 'lp':
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'hp':
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'bp':
        b = [alpha, 0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == 'peak':
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind in ('lowshelf', 'highshelf'):
        sq = 2 * math.sqrt(A) * alpha
        if kind == 'lowshelf':
            b = [A * ((A + 1) - (A - 1) * cw + sq), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sq)]
            a = [(A + 1) + (A - 1) * cw + sq, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sq]
        else:
            b = [A * ((A + 1) + (A - 1) * cw + sq), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sq)]
            a = [(A + 1) - (A - 1) * cw + sq, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sq]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return b, a


def filt(x: np.ndarray, kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0, order: int = 1) -> np.ndarray:
    b, a = biquad(kind, f, q, gain_db)
    y = x
    for _ in range(order):
        y = lfilter(b, a, y, axis=0)
    return y


def hp(x, f, order=1):
    return filt(x, 'hp', f, order=order)


def lp(x, f, order=1):
    return filt(x, 'lp', f, order=order)


def eq(x: np.ndarray, bands) -> np.ndarray:
    """bands: [(kind, freq, gain_db, q)]."""
    for kind, f, g, q in bands:
        x = filt(x, kind, f, q, g)
    return x


def sweep_lp(x: np.ndarray, cutoff: np.ndarray, q: float = 0.8, block: int = 64) -> np.ndarray:
    """Low-pass whose cutoff follows a per-sample curve (updated every `block` samples)."""
    y = np.zeros_like(x)
    zi = np.zeros(2) if x.ndim == 1 else np.zeros((2, x.shape[1]))
    for start in range(0, len(x), block):
        seg = x[start:start + block]
        b, a = biquad('lp', float(cutoff[min(start, len(cutoff) - 1)]), q)
        if x.ndim == 1:
            y[start:start + block], zi = lfilter(b, a, seg, zi=zi)
        else:
            out, zi = lfilter(b, a, seg, axis=0, zi=zi)
            y[start:start + block] = out
    return y


# --- Oscillators -------------------------------------------------------------------


def phase_of(freq: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    return (phase0 + np.cumsum(freq) / SR) % 1.0


def _polyblep(t: np.ndarray, dt: np.ndarray) -> np.ndarray:
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1.0
    m2 = t > 1.0 - dt
    x2 = (t[m2] - 1.0) / dt[m2]
    out[m2] = x2 * x2 + x2 + x2 + 1.0
    return out


def saw(freq: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    freq = np.asarray(freq, dtype=float)
    ph = phase_of(freq, phase0)
    dt = np.clip(freq / SR, 1e-6, 0.5)
    return (2.0 * ph - 1.0) - _polyblep(ph, dt)


def square(freq: np.ndarray, phase0: float = 0.0, width: float = 0.5) -> np.ndarray:
    return 0.5 * (saw(freq, phase0) - saw(freq, (phase0 + width) % 1.0))


def sine(freq: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    return np.sin(2 * math.pi * phase_of(np.asarray(freq, dtype=float), phase0))


def tri(freq: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    ph = phase_of(np.asarray(freq, dtype=float), phase0)
    return 4.0 * np.abs(ph - 0.5) - 1.0


def noise(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.uniform(-1.0, 1.0, n)


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12.0)


# --- Envelopes ------------------------------------------------------------------


def adsr(n: int, a: float, d: float, s: float, r: float, hold: float) -> np.ndarray:
    """Exponential-ish ADSR over n samples; `hold` = seconds until release starts."""
    t = np.arange(n) / SR
    env = np.empty(n)
    a = max(a, 1e-4)
    att = t < a
    env[att] = t[att] / a
    dec = ~att
    env[dec] = s + (1 - s) * np.exp(-(t[dec] - a) / max(d, 1e-4))
    rel = t >= hold
    if rel.any():
        level = env[np.argmax(rel)] if rel.any() else s
        env[rel] = level * np.exp(-(t[rel] - hold) / max(r, 1e-4))
    return env


def decay(n: int, tau: float, attack: float = 0.001) -> np.ndarray:
    t = np.arange(n) / SR
    env = np.exp(-t / max(tau, 1e-4))
    na = max(1, secs(attack))
    env[:na] *= np.linspace(0, 1, na)
    return env


def fade(x: np.ndarray, fin: float = 0.002, fout: float = 0.01) -> np.ndarray:
    n = len(x)
    a, b = min(n, secs(fin)), min(n, secs(fout))
    x = x.copy()
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b > 0:
        x[n - b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


# --- Saturation -------------------------------------------------------------------


def soft(x: np.ndarray, drive: float = 1.0) -> np.ndarray:
    """tanh saturation, unity gain at small levels."""
    if drive <= 0:
        return x
    return np.tanh(x * drive) / math.tanh(drive)


def tape(x: np.ndarray, drive: float = 1.5, warmth: float = 0.15) -> np.ndarray:
    """Asymmetric soft clip (even harmonics) with a gentle top roll-off."""
    y = np.tanh((x + warmth * x * x) * drive) / math.tanh(drive)
    y = y - np.mean(y, axis=0)
    return lp(y, 14000)


def crush(x: np.ndarray, bits: int = 8, hold: int = 2) -> np.ndarray:
    q = 2 ** (bits - 1)
    y = np.round(x * q) / q
    if hold > 1:
        idx = (np.arange(len(y)) // hold) * hold
        y = y[idx]
    return y


# --- Space -------------------------------------------------------------------------


def make_ir(rt60: float, predelay: float = 0.02, damping: float = 0.5, width: float = 1.0, seed: int = 7,
            early: int = 9) -> np.ndarray:
    """A stereo reverb impulse: sparse early reflections, then a decorrelated,
    band-wise decaying noise tail (highs die faster than lows, like a real room)."""
    rng = np.random.default_rng(seed)
    n = secs(rt60 * 1.15 + predelay)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    bands = [(0, 400, 1.0), (400, 2500, 0.8), (2500, 7000, 0.55 - 0.25 * damping), (7000, 16000, 0.35 - 0.2 * damping)]
    pd = secs(predelay)
    for lo, hi, rt_scale in bands:
        for ch in range(2):
            nz = rng.standard_normal(n)
            if lo > 0:
                nz = hp(nz, lo, order=2)
            nz = lp(nz, hi, order=2)
            rt = max(0.05, rt60 * rt_scale)
            env = np.exp(-6.91 * t / rt)
            env[:pd] = 0
            ramp = min(n - pd, secs(0.03))
            env[pd:pd + ramp] *= np.linspace(0, 1, ramp)
            ir[:, ch] += nz * env
    # early reflections
    for k in range(early):
        d = pd + secs(rng.uniform(0.004, 0.06))
        g = rng.uniform(0.25, 0.6) * (0.85 ** k)
        ch = k % 2
        if d < n:
            ir[d, ch] += g * 2.0
    # width: blend toward mono for narrower rooms
    m = ir.mean(axis=1, keepdims=True)
    ir = m + (ir - m) * width
    ir /= np.sqrt(np.sum(ir ** 2) / 2 + 1e-12)
    return ir


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """Stereo convolution (x mono or stereo). Output is len(x) + len(ir) - 1."""
    xs = stereo(x)
    out = np.zeros((len(xs) + len(ir) - 1, 2))
    out[:, 0] = fftconvolve(xs[:, 0], ir[:, 0])
    out[:, 1] = fftconvolve(xs[:, 1], ir[:, 1])
    return out


def pingpong(x: np.ndarray, delay_s: float, feedback: float = 0.38, repeats: int = 6, tone: float = 5000) -> np.ndarray:
    """Tempo-synced ping-pong echo (wet only). Output is longer than input by the echo tail."""
    xm = mono(x)
    d = secs(delay_s)
    out = np.zeros((len(xm) + d * (repeats + 1), 2))
    sig = xm
    for k in range(1, repeats + 1):
        sig = lp(sig, max(1500, tone * (0.85 ** k))) * feedback
        start = d * k
        out[start:start + len(sig), k % 2] += sig
    return out


def chorus(x: np.ndarray, rate: float = 0.6, depth_ms: float = 4.0, base_ms: float = 12.0, mix: float = 0.5) -> np.ndarray:
    """Stereo chorus: two modulated delay lines in quadrature."""
    xm = mono(x)
    n = len(xm)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    idx = np.arange(n, dtype=float)
    for ch, ph in ((0, 0.0), (1, math.pi / 2)):
        dl = (base_ms + depth_ms * np.sin(2 * math.pi * rate * t + ph)) * SR / 1000.0
        out[:, ch] = np.interp(idx - dl, idx, xm, left=0.0)
    dry = stereo(x)
    return dry * (1 - mix) + out * mix


def widen(x: np.ndarray, amount: float) -> np.ndarray:
    """M/S width: 0 = mono, 1 = unchanged, >1 = wider."""
    xs = stereo(x)
    m = (xs[:, 0] + xs[:, 1]) / 2
    s = (xs[:, 0] - xs[:, 1]) / 2 * amount
    return np.stack([m + s, m - s], axis=1)


def haas(x: np.ndarray, ms: float = 12.0, side: int = 1) -> np.ndarray:
    xm = mono(x)
    d = secs(ms / 1000)
    a = xm
    b = np.concatenate([np.zeros(d), xm[:-d]]) if d > 0 else xm
    return np.stack([a, b] if side > 0 else [b, a], axis=1)


# --- Dynamics ----------------------------------------------------------------------


def envelope(x: np.ndarray, attack: float, release: float) -> np.ndarray:
    """Peak-ish level follower: fast attack via a max filter, smooth release."""
    level = np.abs(mono(x)) if x.ndim == 2 else np.abs(x)
    a = max(1, secs(attack))
    level = maximum_filter1d(level, size=a * 2 + 1)
    r = math.exp(-1.0 / max(1, secs(release)))
    return lfilter([1 - r], [1, -r], level)


def compress(x: np.ndarray, threshold_db: float = -18.0, ratio: float = 3.0, attack: float = 0.005,
             release: float = 0.12, knee_db: float = 6.0, makeup_db: float = 0.0, sidechain: np.ndarray | None = None) -> np.ndarray:
    env = envelope(x if sidechain is None else sidechain, attack, release)
    lvl = 20 * np.log10(env + 1e-9)
    over = lvl - threshold_db
    gr = np.where(
        over <= -knee_db / 2, 0.0,
        np.where(over >= knee_db / 2, over * (1 - 1 / ratio), (1 - 1 / ratio) * (over + knee_db / 2) ** 2 / (2 * knee_db)),
    )
    g = 10 ** ((-gr + makeup_db) / 20)
    return x * (g[:, None] if x.ndim == 2 else g)


def duck_curve(n: int, times_s, depth: float, release_s: float, attack_s: float = 0.004) -> np.ndarray:
    """Sidechain gain curve: dips by `depth` (0..1) at each trigger, recovers over release."""
    g = np.ones(n)
    rel = secs(release_s)
    att = max(1, secs(attack_s))
    shape = np.concatenate([np.linspace(1, 1 - depth, att), 1 - depth * (1 - np.linspace(0, 1, rel)) ** 2])
    for t in times_s:
        s = secs(t) - att
        for wrap in (0, -n):  # wrap around the loop end
            a = s + wrap
            lo, hi = max(0, a), min(n, a + len(shape))
            if hi > lo:
                g[lo:hi] = np.minimum(g[lo:hi], shape[lo - a:hi - a])
    return g


def limit(x: np.ndarray, ceiling_db: float = -1.0, lookahead: float = 0.0015, release: float = 0.08) -> np.ndarray:
    """Look-ahead brickwall-ish limiter (vectorized), then a safety soft clip."""
    from scipy.signal import resample_poly
    c = db(ceiling_db)
    xs = stereo(x)
    # true-peak aware: look at the 4x oversampled waveform, not just the samples
    up = np.abs(resample_poly(xs, 4, 1, axis=0))
    peak = np.max(up[: len(xs) * 4].reshape(len(xs), 4, 2), axis=(1, 2))
    peak = np.maximum(peak, np.max(np.abs(xs), axis=1))
    need = np.minimum(1.0, c / np.maximum(peak, 1e-9))
    la = max(1, secs(lookahead))
    g = minimum_filter1d(need, size=2 * la + 1)
    r = math.exp(-1.0 / max(1, secs(release)))
    # smooth the recovery only: 1-g rises instantly (via max with raw), falls slowly
    gr = 1 - g
    sm = lfilter([1 - r], [1, -r], gr)
    gr = np.maximum(gr, sm)
    g = 1 - gr
    y = x * (g[:, None] if x.ndim == 2 else g)
    # catch what slipped through
    return np.clip(y, -c, c) if np.max(np.abs(y)) > c else y


# --- Loudness (ITU-R BS.1770 / EBU R128 integrated) ---------------------------------


def _k_weight(x: np.ndarray) -> np.ndarray:
    f0, G, Q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    K = math.tan(math.pi * f0 / SR)
    Vh = 10 ** (G / 20)
    Vb = Vh ** 0.4996667741545416
    a0 = 1 + K / Q + K * K
    b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    y = lfilter(b, a, x, axis=0)
    f0, Q = 38.13547087602444, 0.5003270373238773
    K = math.tan(math.pi * f0 / SR)
    a0 = 1 + K / Q + K * K
    a = [1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    return lfilter([1, -2, 1], a, y, axis=0)


def lufs(x: np.ndarray) -> float:
    y = _k_weight(stereo(x))
    n, hop = secs(0.4), secs(0.1)
    if len(y) < n:
        return -70.0
    ms = np.array([np.sum(np.mean(y[i:i + n] ** 2, axis=0)) for i in range(0, len(y) - n + 1, hop)])
    L = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[L > -70]
    if len(g) == 0:
        return -70.0
    rel = -0.691 + 10 * np.log10(np.mean(g)) - 10
    g2 = ms[(L > -70) & (L > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(g2)))


def true_peak_db(x: np.ndarray) -> float:
    from scipy.signal import resample_poly
    up = resample_poly(stereo(x), 4, 1, axis=0)
    return to_db(float(np.max(np.abs(up))))
