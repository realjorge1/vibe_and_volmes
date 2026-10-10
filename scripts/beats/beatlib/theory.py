"""Keys, chords, voicings and phrase writing. Pitches are MIDI numbers; time
is in beats (quarter notes) from the start of the loop."""
from dataclasses import dataclass, field
import random

PC = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
      'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}

SCALES = {
    'major': [0, 2, 4, 5, 7, 9, 11],
    'minor': [0, 2, 3, 5, 7, 8, 10],
    'harmonic': [0, 2, 3, 5, 7, 8, 11],
    'dorian': [0, 2, 3, 5, 7, 9, 10],
    'phrygian': [0, 1, 3, 5, 7, 8, 10],
    'mixolydian': [0, 2, 4, 5, 7, 9, 10],
    'lydian': [0, 2, 4, 6, 7, 9, 11],
}


@dataclass
class Note:
    t: float            # start, beats
    dur: float          # beats
    pitch: int
    vel: int = 96
    glide: bool = False  # 808/lead: slide from the previous note instead of retriggering


@dataclass
class Key:
    tonic: int          # pitch class
    mode: str           # 'major' | 'minor' | modal names
    scale: list = field(default_factory=list)

    @staticmethod
    def parse(text: str, mode_override: str | None = None) -> 'Key':
        name, quality = text.split()
        mode = 'major' if quality.lower().startswith('maj') else 'minor'
        if mode_override:
            mode = mode_override
        return Key(PC[name], mode, SCALES[mode])

    def pitch(self, degree: int, octave: int = 4, scale: list | None = None) -> int:
        """MIDI pitch of a scale degree (0-based; may exceed 6 or be negative)."""
        sc = scale or self.scale
        o, d = divmod(degree, 7)
        return 12 * (octave + 1) + self.tonic + sc[d] + 12 * o

    def chord(self, degree: int, size: int = 3, octave: int = 3, scale: list | None = None) -> list:
        """Stacked diatonic thirds on a degree: 3=triad, 4=7th, 5=9th."""
        return [self.pitch(degree + 2 * k, octave, scale) for k in range(size)]

    def in_scale(self, p: int) -> bool:
        return (p - self.tonic) % 12 in self.scale

    def snap(self, p: int) -> int:
        """Nearest pitch in the key (ties go down)."""
        for d in (0, -1, 1, -2, 2):
            if self.in_scale(p + d):
                return p + d
        return p


@dataclass
class Chord:
    degree: int
    size: int = 4
    beats: float = 4.0
    scale: str | None = None   # e.g. 'harmonic' for a major V in a minor key

    def tones(self, key: Key, octave: int = 3) -> list:
        sc = SCALES[self.scale] if self.scale else None
        return key.chord(self.degree, self.size, octave, sc)


def voice(tones: list, center: int, prev: list | None, spread: int = 0) -> list:
    """Pick an inversion of `tones` near `center` that moves least from `prev`."""
    pcs = sorted({t % 12 for t in tones})
    root = tones[0] % 12
    cands = []
    for base in range(center - 14, center + 3):
        notes = []
        p = base
        for pc in pcs * 2:
            while p % 12 != pc:
                p += 1
            notes.append(p)
            if len(notes) == len(pcs):
                break
        if notes and min(notes) >= center - 14 and max(notes) <= center + 14:
            if spread and len(notes) >= 3:
                notes = [notes[0] - 12] + notes[1:] if spread < 0 else notes[:-1] + [notes[-1] + 12]
            cands.append(notes)
    if not cands:
        return [t for t in tones]
    if prev:
        def cost(v):
            return sum(min(abs(a - b) for b in prev) for a in v) + 0.3 * abs(sum(v) / len(v) - center)
    else:
        def cost(v):
            # prefer root at or near the bottom on the first chord
            return abs(sum(v) / len(v) - center) + (0 if v[0] % 12 == root else 3)
    return min(cands, key=cost)


# --- Progressions --------------------------------------------------------------------
# Degrees are 0-based (0 = I/i). 'h' marks the harmonic-minor (major) V.

PROGRESSIONS = {
    'minor-dark': [[0, 5, 2, 6], [0, 3, 5, 4], [0, 0, 5, 4], [0, 5, 3, 4], [0, 1, 0, 6], [0, 3, 0, 4]],
    'minor-melodic': [[0, 5, 2, 6], [5, 6, 0, 0], [0, 6, 5, 6], [3, 0, 5, 6], [0, 2, 5, 6], [5, 3, 0, 6]],
    'minor-triumphant': [[0, 5, 6, 4], [5, 6, 0, 4], [0, 3, 5, 6], [0, 6, 5, 4]],
    'major-pop': [[0, 4, 5, 3], [5, 3, 0, 4], [3, 4, 2, 5], [0, 5, 3, 4], [3, 0, 4, 5], [0, 2, 3, 4]],
    'major-romantic': [[0, 2, 5, 3], [3, 4, 2, 5], [1, 4, 0, 5], [0, 5, 1, 4], [3, 2, 1, 0], [0, 3, 1, 4]],
    'major-dreamy': [[0, 3, 0, 3], [3, 0, 5, 4], [0, 2, 3, 3], [5, 3, 0, 0], [0, 6, 5, 3]],
    'major-sad': [[0, 2, 3, 3], [5, 3, 0, 4], [3, 2, 5, 0], [0, 4, 5, 2]],
}


def progression(rng: random.Random, family: str) -> list:
    return list(rng.choice(PROGRESSIONS[family]))


# --- Phrase writing --------------------------------------------------------------------

RHYTHM_CELLS = {
    # (start, dur) over two bars (8 beats)
    'sparse': [[(0, 1.5), (2, 0.5), (2.5, 1.5), (4, 1.5), (6, 0.5), (6.5, 1.5)],
               [(0, 0.75), (0.75, 0.75), (1.5, 2.5), (4, 0.75), (4.75, 0.75), (5.5, 2.5)],
               [(0.5, 1), (1.5, 0.5), (2, 2), (4.5, 1), (5.5, 0.5), (6, 1), (7, 1)]],
    'busy': [[(0, .5), (.5, .5), (1, .5), (1.5, .5), (2, 1), (3, .5), (3.5, .5), (4, .5), (4.5, .5), (5, .5), (5.5, .5), (6, 2)],
             [(0, .75), (.75, .75), (1.5, .5), (2, .5), (2.5, .5), (3, 1), (4, .75), (4.75, .75), (5.5, .5), (6, 1), (7, 1)],
             [(0, .25), (.25, .25), (.5, .5), (1, .5), (1.5, 1), (2.5, .5), (3, 1), (4, .25), (4.25, .25), (4.5, .5), (5, .5), (5.5, 1.5), (7, 1)]],
    'triplet': [[(i / 3, 1 / 3) for i in range(12)] + [(4 + i / 3, 1 / 3) for i in range(6)] + [(6, 2)],
                [(0, 2 / 3), (2 / 3, 2 / 3), (4 / 3, 2 / 3), (2, 2), (4, 2 / 3), (14 / 3, 2 / 3), (16 / 3, 2 / 3), (6, 2)]],
    'syncopated': [[(0, .75), (.75, .75), (1.5, 1), (2.5, .5), (3, 1), (4, .75), (4.75, .75), (5.5, .5), (6, .5), (6.5, 1.5)],
                   [(.5, .5), (1, .25), (1.5, .75), (2.25, .75), (3, 1), (4.5, .5), (5, .25), (5.5, .75), (6.25, 1.75)],
                   [(0, .5), (.75, .5), (1.5, .5), (2.25, .75), (3, .5), (3.5, .5), (4, .5), (4.75, .5), (5.5, .5), (6, 2)]],
    'long': [[(0, 2), (2, 2), (4, 3), (7, 1)], [(0, 3), (3, 1), (4, 4)], [(0, 1), (1, 3), (4, 2), (6, 2)]],
}


def chord_at(prog_tones: list, beat: float, bar_beats: float = 4.0) -> list:
    """Tones of the chord sounding at `beat` (one chord per bar, cycling)."""
    return prog_tones[int(beat // bar_beats) % len(prog_tones)]


def write_motif(rng: random.Random, key: Key, prog_tones: list, cell: list, octave: int, start_beat: float,
                contour: str = 'arch', anchor: int | None = None) -> list:
    """A two-bar melodic motif: chord tones on strong beats, stepwise motion between."""
    notes = []
    lo = 12 * (octave + 1) + key.tonic - 3
    hi = lo + 17
    p = anchor if anchor is not None else key.pitch(rng.choice([0, 2, 4]), octave)
    n = len(cell)
    for i, (s, d) in enumerate(cell):
        beat = start_beat + s
        tones = chord_at(prog_tones, beat)
        strong = (s % 1.0 == 0.0) and (s % 2.0 == 0.0 or d >= 1.0)
        if contour == 'arch':
            bias = 1 if i < n * 0.55 else -1
        elif contour == 'down':
            bias = -1
        elif contour == 'up':
            bias = 1 if i < n - 1 else -1
        else:
            bias = rng.choice([-1, 1])
        if strong or i == 0:
            # nearest chord tone in the bias direction (within range)
            pcs = {t % 12 for t in tones}
            cands = [q for q in range(lo, hi + 1) if q % 12 in pcs]
            cands.sort(key=lambda q: (abs(q - (p + 2 * bias)), q))
            p = cands[0] if cands else p
        else:
            step = rng.choice([1, 1, 2]) * bias
            if rng.random() < 0.2:
                step = 0
            q = p
            moved = 0
            while moved < abs(step):
                q += 1 if step > 0 else -1
                if key.in_scale(q):
                    moved += 1
            p = q
        p = min(max(p, lo), hi)
        p = key.snap(p)
        notes.append(Note(beat, d * 0.92, p, rng.randint(84, 112)))
    # land the phrase on a chord tone
    if notes:
        last = notes[-1]
        tones = chord_at(prog_tones, last.t)
        pcs = {t % 12 for t in tones}
        cands = [q for q in range(lo, hi + 1) if q % 12 in pcs]
        if cands:
            last.pitch = min(cands, key=lambda q: abs(q - last.pitch))
    return notes


def vary(rng: random.Random, key: Key, motif: list, prog_tones: list, shift_beats: float, mode: str) -> list:
    """Answer phrase: same rhythm moved later, pitches re-fit to the new chords."""
    out = []
    for n in motif:
        t = n.t + shift_beats
        tones = chord_at(prog_tones, t)
        p = n.pitch
        if mode == 'octave':
            p += 12
        elif mode == 'echo':
            p = key.snap(p - 2)
        pcs = {x % 12 for x in tones}
        if (n.t % 2.0 == 0.0) and p % 12 not in pcs:
            p = min((q for q in range(p - 4, p + 5) if q % 12 in pcs), key=lambda q: abs(q - p), default=p)
        out.append(Note(t, n.dur, key.snap(p), n.vel))
    if mode == 'drop-last' and out:
        out = out[:-1]
    return out


def arpeggio(voicing: list, start: float, beats: float, step: float, pattern: str, vel=(70, 96),
             rng: random.Random | None = None, gate: float = 0.9) -> list:
    """Spread a chord across time. pattern: up, down, updown, broken, pinky."""
    v = sorted(voicing)
    if pattern == 'down':
        seq = v[::-1]
    elif pattern == 'updown':
        seq = v + v[-2:0:-1]
    elif pattern == 'broken':
        seq = [v[0], v[2 % len(v)], v[1 % len(v)], v[-1]]
    elif pattern == 'pinky':
        seq = [v[0], v[-1], v[1 % len(v)], v[-1]]
    else:
        seq = v
    out = []
    t = 0.0
    i = 0
    rng = rng or random.Random(0)
    while t < beats - 1e-6:
        p = seq[i % len(seq)]
        out.append(Note(start + t, step * gate, p, rng.randint(*vel)))
        t += step
        i += 1
    return out
