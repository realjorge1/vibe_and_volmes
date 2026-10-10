"""Genre composers: catalog beat -> Song (parts, drum hits, mix).

Every beat is 8 bars: bars 1-4 state the idea, bars 5-8 answer it with a
variation, and bar 8 ends on a fill that throws back to bar 1, so the loop
reads as a phrase instead of a two-bar cycle. Choices are seeded by the beat
id: instrument palette, progression, groove, hat rolls, 808 slides."""
import random

from .theory import Key, Note, SCALES, voice, progression, write_motif, vary, arpeggio, RHYTHM_CELLS
from .mixer import Song, Part, Mix

BARS = 8
BEATS = BARS * 4


# --- shared helpers ---------------------------------------------------------------------


def harmony(key: Key, prog: list, chord_bars: int, size: int, center: int, harmonic_v: bool):
    """-> (spans [(start, dur, voicing)], bar_tones [8 x tones], roots [(start, dur, degree, scale)])"""
    spans, roots = [], []
    prev = None
    t = 0
    i = 0
    while t < BEATS:
        deg = prog[i % len(prog)]
        sc = SCALES['harmonic'] if (harmonic_v and key.mode == 'minor' and deg == 4) else None
        tones = key.chord(deg, size, 3, sc)
        v = voice(tones, center, prev)
        prev = v
        dur = chord_bars * 4
        spans.append((t, dur, v))
        roots.append((t, dur, deg, sc))
        t += dur
        i += 1
    bar_tones = []
    for b in range(BARS):
        for (s, d, v) in spans:
            if s <= b * 4 < s + d:
                bar_tones.append(v)
                break
    return spans, bar_tones, roots


def root_at(key: Key, roots, beat: float, octave: int = 1, lo: int = 28, hi: int = 39) -> int:
    for s, d, deg, sc in roots:
        if s <= beat % BEATS < s + d:
            p = key.pitch(deg, octave, sc)
            while p > hi:
                p -= 12
            while p < lo:
                p += 12
            return p
    return key.pitch(0, octave)


def grid(hits, rng, pattern: str, bar: int, voice: str, vel: float = 0.9, swing: float = 0.0,
         human: float = 0.0, pitch: float = 0.0, pan: float = 0.0, step: float = 0.25):
    """Pattern string over 16th steps: x = hit, X = accent, g = ghost."""
    for i, ch in enumerate(pattern):
        if ch not in 'xXg':
            continue
        b = bar * 4 + i * step
        if swing and i % 2 == 1:
            b += swing * step
        if human:
            b += rng.gauss(0, human)
        v = vel * (1.18 if ch == 'X' else 0.45 if ch == 'g' else 1.0) * rng.uniform(0.92, 1.05)
        hits.append((max(0.0, b), voice, min(1.2, v), pitch, pan))


def steps_of(pattern: str) -> list:
    return [i for i, c in enumerate(pattern) if c in 'xX']


def trap_hats(hits, rng, bar: int, density: float, pan: float = 0.12, base: str = '8', roll_pitch: bool = True):
    """Trap hats: an 8th/16th bed with signature rolls (16ths, 32nds, triplets, pitched)."""
    step = 0.5 if base == '8' else 0.25
    t = 0.0
    while t < 4 - 1e-6:
        beat = bar * 4 + t
        r = rng.random()
        if r < density * 0.18 and t + 0.5 <= 4:
            # 32nd roll across an 8th, optionally rising in pitch
            for k in range(4):
                hits.append((beat + k * 0.125, 'hat', 0.55 + 0.1 * k, (k * 1.5 if roll_pitch else 0), pan))
            t += 0.5
            continue
        if r < density * 0.3 and t + 1.0 <= 4:
            # 16th triplets across a beat
            for k in range(6):
                hits.append((beat + k / 6, 'hat', 0.62 + (0.1 if k % 3 == 0 else 0), 0, pan))
            t += 1.0
            continue
        if r < density * 0.45 and t + 0.5 <= 4:
            hits.append((beat, 'hat', 0.85, 0, pan))
            hits.append((beat + 0.25, 'hat', 0.6, 0, pan))
            t += 0.5
            continue
        acc = 0.9 if (t % 1.0 == 0) else 0.68
        hits.append((beat, 'hat', acc * rng.uniform(0.9, 1.05), 0, pan))
        t += step


def bass_from_kicks(key, roots, kick_beats, octave=1, max_len=3.0, end=BEATS, glide_every=0.0, rng=None,
                    lo=28, hi=39):
    """808/bass notes that ride the kick: each kick starts a note on the chord root."""
    notes = []
    ks = sorted(kick_beats)
    for i, b in enumerate(ks):
        nxt = ks[i + 1] if i + 1 < len(ks) else end
        dur = min(max_len, nxt - b)
        notes.append(Note(b, max(0.2, dur - 0.02), root_at(key, roots, b, octave, lo, hi), 108))
    if glide_every and rng:
        out = []
        slide_home = False
        for nt in notes:
            if slide_home:
                # the note after a slide glides back down instead of retriggering
                nt.glide = rng.random() < 0.5
                slide_home = False
            full = nt.dur
            if rng.random() < glide_every and full >= 0.75:
                # slide up an octave (or a fifth) partway through the note
                cut = full * rng.choice([0.5, 0.75])
                nt.dur = cut
                out.append(nt)
                up = 12 if rng.random() < 0.6 else 7
                p2 = nt.pitch + up if nt.pitch + up <= hi + 12 else nt.pitch - (12 - up)
                out.append(Note(nt.t + cut, max(0.15, full - cut), p2, 104, glide=True))
                slide_home = True
            else:
                out.append(nt)
        notes = out
    return notes


def lead_line(rng, key, bar_tones, octave, cell_kind, contour, b_mode):
    """A hook: 2-bar motif, answered over bars 3-4, then bars 5-8 vary it."""
    cell = rng.choice(RHYTHM_CELLS[cell_kind])
    m1 = write_motif(rng, key, bar_tones, cell, octave, 0.0, contour)
    m2 = vary(rng, key, m1, bar_tones, 8.0, 'echo' if rng.random() < 0.5 else 'same')
    a = m1 + m2
    b = vary(rng, key, a, bar_tones, 16.0, b_mode)
    return a, b


def fill_last_bar(hits, kind: str, rng):
    """Bar 8 turnaround."""
    base = (BARS - 1) * 4
    if kind == 'snare-roll':
        for k in range(8):
            hits.append((base + 2 + k * 0.25, 'snare2', 0.35 + 0.08 * k, k * 0.5, 0))
    elif kind == 'clap-roll':
        for k in range(4):
            hits.append((base + 3 + k * 0.25, 'clap', 0.4 + 0.15 * k, 0, 0))
    elif kind == 'toms':
        for k, (v, p) in enumerate([('tom_hi', 2), ('tom_hi', 0), ('tom_lo', 2), ('tom_lo', 0)]):
            hits.append((base + 3 + k * 0.25, v, 0.8, p, (-0.3 + 0.2 * k)))
    hits.append((BEATS, 'revcym', 0.55, 0, 0))


def drop_window(hits, start: float, end: float, voices):
    return [h for h in hits if not (start <= h[0] < end and h[1] in voices)]


def mood_family(mood: str, mode: str) -> str:
    if mode == 'minor':
        return {'dark': 'minor-dark', 'aggressive': 'minor-dark', 'hype': 'minor-dark', 'sad': 'minor-melodic',
                'melodic': 'minor-melodic', 'dreamy': 'minor-melodic', 'romantic': 'minor-melodic',
                'triumphant': 'minor-triumphant'}.get(mood, 'minor-melodic')
    return {'romantic': 'major-romantic', 'dreamy': 'major-dreamy', 'sad': 'major-sad', 'melodic': 'major-pop',
            'hype': 'major-pop', 'triumphant': 'major-pop', 'aggressive': 'major-pop'}.get(mood, 'major-pop')


# --- instrument pools (bank, program, name) ------------------------------------------------

SF = {
    'grand': (0, 0), 'bright': (0, 1), 'bellpiano': (12, 0), 'tine': (0, 4), 'tine_ch': (8, 4), 'fm_ep': (0, 5),
    'bell_ep': (12, 4), 'ep_combo': (11, 4), 'celeste': (0, 8), 'glock': (0, 9), 'musicbox': (0, 10),
    'vibes': (11, 11), 'marimba': (0, 12), 'tubular': (0, 14), 'organ': (0, 16), 'nylon': (0, 24),
    'steel': (0, 25), 'jazzgtr': (0, 26), 'clean': (0, 27), 'clean2': (12, 27), 'clean_ch': (8, 27),
    'muted': (0, 28), 'fingerbass': (0, 33), 'pickbass': (0, 34), 'fretless': (0, 35), 'strings_fast': (0, 48),
    'strings_slow': (0, 49), 'strings_velo': (11, 49), 'trem': (0, 44), 'pizz': (0, 45), 'harp': (0, 46),
    'choir': (0, 52), 'oohs': (0, 53), 'synthvox': (0, 54), 'brass': (0, 61), 'synthbrass': (0, 62),
    'altosax': (0, 65), 'flute': (0, 73), 'panflute': (0, 75), 'whistle': (0, 78), 'sqlead': (12, 80),
    'sawlead': (13, 81), 'fantasia': (0, 88), 'warmpad': (0, 89), 'polysynth': (0, 90), 'spacevoice': (0, 91),
    'glass': (0, 92), 'halo': (0, 94), 'sweep': (0, 95), 'solarwind': (11, 89), 'mystery': (11, 96),
    'orchpad': (8, 48), 'fullorch': (12, 48), 'kalimba': (0, 108), 'steeldrum': (0, 114), 'chime': (11, 98),
    'tinkle': (11, 8), 'sawstack': (11, 100), 'nightvision': (13, 88), 'synthstr': (8, 50),
}


def sf_part(name, inst, notes, mix, level=0.25, cc=None):
    bank, prog = SF[inst]
    return Part(name, 'sf', notes=notes, bank=bank, program=prog, mix=mix, level=level, params={'cc': cc} if cc else {})


def strum(voicing, t, dur, vel, gap=0.03, down=True, rng=None):
    v = sorted(voicing) if down else sorted(voicing, reverse=True)
    out = []
    for i, p in enumerate(v):
        out.append(Note(t + i * gap, max(0.1, dur - i * gap), p, max(30, int(vel * (1 - 0.04 * i)))))
    return out


def held(spans, vel=80, gap=0.0):
    out = []
    for s, d, v in spans:
        for i, p in enumerate(sorted(v)):
            out.append(Note(s + i * gap, d - 0.05, p, vel))
    return out


# --- genres ---------------------------------------------------------------------------------------


def trap(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood, q = spec['mood'], spec['q']
    harmonic_v = mood in ('dark', 'hype') and rng.random() < 0.6
    prog = progression(rng, mood_family(mood, key.mode))
    chord_bars = rng.choice([1, 2]) if mood != 'hype' else 1
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, chord_bars, 4 if mood == 'melodic' else 3, center, harmonic_v)

    leads = {
        'dark': ['grand', 'bellpiano', 'musicbox', 'pizz', 'tubular'],
        'hype': ['chime', 'pizz', 'harp', 'brass', 'bell'],
        'melodic': ['flute', 'kalimba', 'celeste', 'harp', 'vibes', 'nylon'],
        'triumphant': ['bellpiano', 'brass', 'choir', 'grand'],
    }[mood]
    pads = {
        'dark': ['strings_slow', 'choir', 'mystery', 'glass', 'oohs'],
        'hype': ['orchpad', 'strings_velo', 'synthstr'],
        'melodic': ['warmpad', 'halo', 'fantasia', 'solarwind'],
        'triumphant': ['orchpad', 'fullorch', 'strings_slow'],
    }[mood]
    lead_inst = rng.choice(leads)
    pad_inst = rng.choice(pads)

    parts = []
    # lead: either an arpeggiated motif (bells/pluck) or a written hook
    arp_style = lead_inst in ('musicbox', 'celeste', 'harp', 'kalimba', 'chime', 'pizz', 'bell', 'nylon', 'vibes') and rng.random() < 0.65
    if arp_style:
        step = rng.choice([0.5, 0.25, 1 / 3])
        pattern = rng.choice(['up', 'updown', 'broken', 'pinky'])
        lead_notes = []
        for s, d, v in spans:
            hi = [p + 12 for p in v] + [v[0] + 24]
            lead_notes += arpeggio(hi, s, d, step, pattern, (70, 100), rng)
        # bars 5-8: thin the arp on the last bar so the fill can breathe
        lead_notes = [nt for nt in lead_notes if not (28 <= nt.t < 32 and rng.random() < 0.4)]
    else:
        a, b = lead_line(rng, key, bar_tones, 5, rng.choice(['sparse', 'triplet', 'syncopated']), 'arch', rng.choice(['same', 'octave', 'echo']))
        lead_notes = a + b
    if lead_inst == 'bell':
        parts.append(Part('lead', 'synth', notes=lead_notes, synth='bell', params={'ratio': rng.choice([3.5, 2.0, 1.41]), 'index': 2.5},
                          mix=Mix(gain_db=-4, hp=300, reverb=0.28, room='hall', delay=0.18, duck=0.2, width=1.2), level=0.25))
    else:
        parts.append(sf_part('lead', lead_inst, lead_notes, Mix(gain_db=-4, hp=250, reverb=0.25, room='hall', delay=0.14, duck=0.2, width=1.15)))

    pad_notes = held(spans, vel=74)
    parts.append(sf_part('pad', pad_inst, pad_notes, Mix(gain_db=-12, hp=220, lp=7000, reverb=0.35, room='hall', duck=0.45, width=1.4)))

    if q >= 78:
        # bars 5-8 counter line an octave up on a second color
        counter = rng.choice(['musicbox', 'celeste', 'glock', 'flute', 'choir', 'tinkle'])
        if counter != lead_inst:
            a, b = lead_line(rng, key, bar_tones, 6, 'long', 'down', 'same')
            parts.append(sf_part('counter', counter, [nt for nt in b], Mix(gain_db=-11, hp=400, reverb=0.4, room='hall', delay=0.2, pan=rng.choice([-0.35, 0.35]))))

    # drums
    hits = []
    kick_pats = ['x.........x.....', 'x......x..x.....', 'x..x......x.....', 'x.....x...x...x.', 'x......x.x......', 'x.....x.......x.']
    ka, kb = rng.sample(kick_pats, 2)
    kick_beats = []
    for bar in range(BARS):
        kp = ka if bar % 2 == 0 else kb
        if bar >= 4 and rng.random() < 0.5:
            kp = rng.choice(kick_pats)
        for st in steps_of(kp):
            b = bar * 4 + st * 0.25
            if bar == BARS - 1 and b >= BEATS - 2:
                continue  # drop out before the turnaround
            kick_beats.append(b)
            hits.append((b, 'kick', 1.0, 0, 0))
        hits.append((bar * 4 + 2, 'clap', 1.0, 0, 0))
        hits.append((bar * 4 + 2, 'snare', 0.7, 0, 0))
        trap_hats(hits, rng, bar, 0.55 if mood != 'dark' else 0.4, base='8' if rng.random() < 0.6 else '16')
        if rng.random() < 0.35:
            hits.append((bar * 4 + 3.5, 'ohat', 0.5, 0, 0.2))
        if bar >= 4 and rng.random() < 0.5:
            hits.append((bar * 4 + 1.75, 'rim', 0.5, 0, -0.3))
            hits.append((bar * 4 + 3.25, 'snap', 0.45, 0, 0.3))
    hits.append((0, 'crash', 0.45, 0, 0))
    fill_last_bar(hits, rng.choice(['snare-roll', 'clap-roll', 'none']), rng)

    bass = bass_from_kicks(key, roots, kick_beats, glide_every=0.18, rng=rng)
    parts.append(Part('808', 'synth', notes=bass, synth='808', params={'drive': rng.uniform(2.0, 3.2), 'decay_s': rng.uniform(0.9, 1.6)},
                      mix=Mix(gain_db=0, eq=[('peak', 120, 2, 1.0)]), level=0.32))

    return Song(spec['id'], spec['bpm'], BARS, parts, hits, 'trap',
                bus_mix=_drum_mix('trap', rng), kick_beats=kick_beats, delay_beats=0.75,
                master={'lufs': -11.5, 'tilt': 0.5})


def drill(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood = spec['mood']
    prog = progression(rng, 'minor-dark')
    if rng.random() < 0.4:
        prog = [0, 1, 0, 4]  # i - ii(b) feel - i - V, the drill menace
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, rng.choice([1, 2]), 3, center, harmonic_v=True)

    lead_inst = rng.choice(['grand', 'strings_fast', 'tubular', 'choir', 'flute', 'whistle', 'harp', 'bellpiano'])
    pad_inst = rng.choice(['choir', 'strings_slow', 'trem', 'mystery', 'glass'])
    parts = []
    cell = rng.choice(['triplet', 'sparse', 'syncopated'])
    a, b = lead_line(rng, key, bar_tones, 5, cell, rng.choice(['down', 'arch']), rng.choice(['same', 'echo']))
    parts.append(sf_part('lead', lead_inst, a + b, Mix(gain_db=-4, hp=250, reverb=0.25, room='hall', delay=0.12, duck=0.15, width=1.1)))
    parts.append(sf_part('pad', pad_inst, held(spans, vel=72), Mix(gain_db=-12, hp=220, lp=6500, reverb=0.4, room='hall', duck=0.4, width=1.4)))
    if spec['q'] >= 72:
        stab_inst = rng.choice(['strings_fast', 'pizz', 'grand'])
        if stab_inst != lead_inst:
            stabs = []
            for bar in range(4, 8):
                v = bar_tones[bar]
                for off in rng.choice([[0, 1.5], [0.75, 2.75], [0, 0.75, 2.5]]):
                    for p in v:
                        stabs.append(Note(bar * 4 + off, 0.4, p + 12, 88))
            parts.append(sf_part('stabs', stab_inst, stabs, Mix(gain_db=-10, hp=300, reverb=0.25, room='plate', pan=-0.3)))

    hits = []
    snare_pats = [('........x.......', '........x.....x.'), ('........x.......', '......x.......x.'), ('........x..x....', '........x.......')]
    kick_pats = [('x.........x.....', '..x...x.........'), ('x......x...x....', 'x.........x.....'), ('x..x.......x....', '...x......x.....')]
    sp = rng.choice(snare_pats)
    kp = rng.choice(kick_pats)
    hat_pats = ['x.x.x..x.x.x..x.', 'x..x.x..x..x.x..', 'x.x..x.x.x..x.x.', 'xx.x.x.xx.x.x.x.']
    hp1, hp2 = rng.sample(hat_pats, 2)
    kick_beats = []
    for bar in range(BARS):
        k = kp[bar % 2]
        for st in steps_of(k):
            b = bar * 4 + st * 0.25
            if bar == BARS - 1 and b >= BEATS - 1.5:
                continue
            kick_beats.append(b)
            hits.append((b, 'kick', 0.95, 0, 0))
        grid(hits, rng, sp[bar % 2], bar, 'snare', 1.0)
        grid(hits, rng, sp[bar % 2], bar, 'clap', 0.55)
        grid(hits, rng, hp1 if bar % 2 == 0 else hp2, bar, 'hat', 0.8, pan=0.15)
        if rng.random() < 0.5:
            for k2 in range(3):
                hits.append((bar * 4 + 3 + k2 / 3, 'hat', 0.6 + 0.1 * k2, k2 * 2, 0.15))
        if rng.random() < 0.4:
            hits.append((bar * 4 + rng.choice([0.75, 2.75, 3.25]), 'rim', 0.5, 0, -0.25))
    hits.append((0, 'crash', 0.4, 0, 0))
    fill_last_bar(hits, rng.choice(['snare-roll', 'none']), rng)

    bass = bass_from_kicks(key, roots, kick_beats, max_len=2.5, glide_every=0.45, rng=rng)
    parts.append(Part('808', 'synth', notes=bass, synth='808', params={'drive': rng.uniform(2.6, 4.0), 'decay_s': rng.uniform(1.0, 1.8), 'glide_s': 0.11},
                      mix=Mix(gain_db=0, eq=[('peak', 140, 2, 1.0)]), level=0.32))
    return Song(spec['id'], spec['bpm'], BARS, parts, hits, 'drill', bus_mix=_drum_mix('drill', rng),
                kick_beats=kick_beats, delay_beats=0.75, master={'lufs': -11.5, 'tilt': 0.5})


def afrobeats(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood, q = spec['mood'], spec['q']
    prog = progression(rng, mood_family(mood, key.mode))
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, 1, 4, center, False)
    swing = rng.uniform(0.12, 0.22)
    amapiano = rng.random() < 0.4

    parts = []
    # keys: offbeat Rhodes chops or warm held chords
    keys_inst = rng.choice(['tine_ch', 'tine', 'ep_combo', 'grand', 'bell_ep'])
    keys = []
    rhythm = rng.choice([[0.5, 1.5, 2.5, 3.5], [0, 1.5, 3], [0.75, 2.25, 3.5], [0, 2, 2.75]])
    for bar in range(BARS):
        v = bar_tones[bar]
        for off in rhythm:
            keys += strum(v, bar * 4 + off + (swing * 0.25 if (off * 4) % 2 == 1 else 0), 0.45, 84, gap=0.012)
    parts.append(sf_part('keys', keys_inst, keys, Mix(gain_db=-4, hp=200, reverb=0.22, room='plate', duck=0.25, chorus=0.25, width=1.2)))

    # highlife guitar riff
    gtr_inst = rng.choice(['clean2', 'clean_ch', 'nylon', 'clean'])
    gtr = []
    patt = rng.choice([[0, 0.5, 0.75, 1.25, 1.5, 2, 2.5, 2.75, 3.25, 3.5], [0, 0.75, 1.5, 2, 2.75, 3.5], [0.25, 0.75, 1.25, 2.25, 2.75, 3.25, 3.75]])
    for bar in range(BARS):
        v = sorted(bar_tones[bar])
        line = [v[0] + 12, v[1] + 12, v[2] + 12, v[-1] + 12, v[2] + 12, v[1] + 12]
        for i, off in enumerate(patt):
            sw = swing * 0.25 if (round(off * 4) % 2 == 1) else 0
            gtr.append(Note(bar * 4 + off + sw, 0.22, line[i % len(line)], rng.randint(70, 98)))
    parts.append(sf_part('guitar', gtr_inst, gtr, Mix(gain_db=-8, hp=350, reverb=0.18, room='plate', delay=0.18, pan=rng.choice([-0.35, 0.35]), duck=0.15)))

    # lead color: kalimba / marimba / pan flute / sax / steel drum / chops
    lead_inst = rng.choice(['kalimba', 'marimba', 'panflute', 'altosax', 'steeldrum', 'chop', 'whistle'])
    a, b = lead_line(rng, key, bar_tones, 5, rng.choice(['syncopated', 'busy', 'sparse']), 'arch', rng.choice(['same', 'octave', 'echo']))
    lead_notes = (a + b) if q >= 76 else b  # simpler beats leave bars 1-4 open
    for nt in lead_notes:
        if round(nt.t * 4) % 2 == 1:
            nt.t += swing * 0.25
    if lead_inst == 'chop':
        parts.append(Part('lead', 'synth', notes=lead_notes, synth='chop', params={'vowel': rng.choice(['ah', 'oh'])},
                          mix=Mix(gain_db=-7, hp=300, reverb=0.3, room='hall', delay=0.2, duck=0.2), level=0.22))
    else:
        parts.append(sf_part('lead', lead_inst, lead_notes, Mix(gain_db=-6, hp=300, reverb=0.25, room='hall', delay=0.15, duck=0.15)))

    if q >= 80:
        parts.append(sf_part('pad', rng.choice(['warmpad', 'halo', 'strings_slow', 'oohs']), held(spans, vel=70),
                             Mix(gain_db=-13, hp=250, lp=6000, reverb=0.35, room='hall', duck=0.4, width=1.4)))

    # drums
    hits = []
    kick_pats = ['x.....x.x.......', 'x..x....x..x....', 'x.......x..x....', 'x.....x...x.....']
    if amapiano:
        kick_pats = ['x...x...x...x...']
    kp = rng.choice(kick_pats)
    kick_beats = []
    for bar in range(BARS):
        for st in steps_of(kp):
            b = bar * 4 + st * 0.25 + (swing * 0.25 if st % 2 == 1 else 0)
            kick_beats.append(b)
            hits.append((b, 'kick', 0.95, 0, 0))
        grid(hits, rng, '....x.......x...', bar, 'snap' if rng.random() < 0.5 else 'clap', 0.8, human=0.004)
        grid(hits, rng, rng.choice(['x..x..x...x.x...', '...x..x....x..x.', 'x..x..x.........']), bar, 'rim', 0.5, swing=swing, human=0.004, pan=-0.2)
        grid(hits, rng, 'xXxxxXxxxXxxxXxx', bar, 'shaker', 0.55, swing=swing, human=0.003, pan=0.3)
        grid(hits, rng, rng.choice(['..x.x..x..x.x..x', '...x.x...x.x.x..', '..x..x.x..x..x..']), bar, rng.choice(['conga_hi', 'bongo']), 0.6, swing=swing, human=0.004, pan=-0.35)
        grid(hits, rng, rng.choice(['x.......x.......', '......x.......x.']), bar, 'conga_lo', 0.6, swing=swing, pan=0.35)
        if bar % 2 == 1:
            hits.append((bar * 4 + 3.5 + swing * 0.25, 'tamb', 0.35, 0, 0.4))
    fill_last_bar(hits, rng.choice(['toms', 'none']), rng)

    # bass: log drum (amapiano) or plucked bass on the groove
    if amapiano or rng.random() < 0.4:
        lnotes = []
        for bar in range(BARS):
            r = root_at(key, roots, bar * 4, 2, 40, 52)
            for off, iv in rng.choice([[(0.75, 0), (1.5, 7), (2.5, 0), (3.25, 12)], [(0.5, 0), (1.75, 0), (2.75, 7), (3.5, 5)], [(0.75, 0), (2.0, 0), (2.75, 3 if key.mode == 'minor' else 4), (3.5, 7)]]):
                lnotes.append(Note(bar * 4 + off + (swing * 0.25 if round(off * 4) % 2 == 1 else 0), 0.5, r + iv, 100))
        parts.append(Part('bass', 'synth', notes=lnotes, synth='log', params={'tau': rng.uniform(0.18, 0.3)},
                          mix=Mix(gain_db=-1, eq=[('peak', 180, 2, 1.0)]), level=0.3))
    else:
        bnotes = bass_from_kicks(key, roots, kick_beats, octave=2, max_len=1.0, lo=36, hi=47)
        parts.append(sf_part('bass', rng.choice(['fingerbass', 'fretless']), bnotes, Mix(gain_db=-1, hp=35, comp={'threshold_db': -20, 'ratio': 3}), level=0.3))

    return Song(spec['id'], spec['bpm'], BARS, parts, hits, 'afro', bus_mix=_drum_mix('afro', rng),
                kick_beats=kick_beats, delay_beats=0.75, master={'lufs': -12.0, 'tilt': 0.3})


def rnb(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood, q = spec['mood'], spec['q']
    prog = progression(rng, mood_family(mood, key.mode))
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, 1, 5 if rng.random() < 0.5 else 4, center, False)
    swing = rng.uniform(0.15, 0.28)
    trapsoul = rng.random() < 0.6

    parts = []
    ep = rng.choice(['tine_ch', 'ep_combo', 'bell_ep', 'fm_ep', 'grand'])
    chords = []
    for bar in range(BARS):
        v = bar_tones[bar]
        chords += strum(v, bar * 4, 2.3, 78, gap=rng.uniform(0.02, 0.05))
        if rng.random() < 0.6:
            chords += strum(v, bar * 4 + rng.choice([2.5, 2.75, 3.0]), 1.1, 64, gap=0.03)
    parts.append(sf_part('keys', ep, chords, Mix(gain_db=-4, hp=150, reverb=0.3, room='hall', chorus=0.3, duck=0.2, width=1.25, tape=0.3)))
    parts.append(sf_part('pad', rng.choice(['warmpad', 'oohs', 'strings_slow', 'halo', 'spacevoice']), held(spans, vel=66),
                         Mix(gain_db=-13, hp=250, lp=5500, reverb=0.4, room='hall', duck=0.35, width=1.5)))
    # guitar or lead licks answering at bar ends
    lick_inst = rng.choice(['clean_ch', 'clean2', 'jazzgtr', 'bell', 'lead'])
    a, b = lead_line(rng, key, bar_tones, 5, rng.choice(['sparse', 'long']), 'down', rng.choice(['same', 'echo', 'drop-last']))
    licks = [nt for nt in a + b if (nt.t % 8) >= 4.5 or q >= 85]
    if lick_inst == 'bell':
        parts.append(Part('lead', 'synth', notes=licks, synth='bell', params={'ratio': 2.0, 'index': 1.6, 'decay_s': 1.4},
                          mix=Mix(gain_db=-8, hp=300, reverb=0.4, room='hall', delay=0.25), level=0.22))
    elif lick_inst == 'lead':
        parts.append(Part('lead', 'synth', notes=[Note(nt.t, nt.dur, nt.pitch, nt.vel, glide=True) for nt in licks], synth='lead',
                          params={'shape': 'square', 'cutoff': 2400, 'vibrato': 0.25},
                          mix=Mix(gain_db=-10, hp=300, reverb=0.4, room='hall', delay=0.3), level=0.2))
    else:
        parts.append(sf_part('lead', lick_inst, licks, Mix(gain_db=-8, hp=250, reverb=0.3, room='hall', delay=0.25, pan=0.3, chorus=0.2)))

    hits = []
    kick_pats = ['x......x..x.....', 'x.........x..x..', 'x..x......x.....', 'x......x.x......']
    ka, kb = rng.sample(kick_pats, 2)
    kick_beats = []
    for bar in range(BARS):
        kp = ka if bar % 2 == 0 else kb
        for st in steps_of(kp):
            b = bar * 4 + st * 0.25 + (swing * 0.25 if st % 2 == 1 else 0)
            kick_beats.append(b)
            hits.append((b, 'kick', 0.95, 0, 0))
        if trapsoul:
            hits.append((bar * 4 + 2, 'snare', 1.0, 0, 0))
            hits.append((bar * 4 + 2, 'clap', 0.6, 0, 0))
            trap_hats(hits, rng, bar, 0.35, base='16', roll_pitch=False)
        else:
            grid(hits, rng, '....x.......x...', bar, 'snare', 1.0, human=0.004)
            grid(hits, rng, '....x.......x...', bar, 'snap', 0.6, human=0.004)
            grid(hits, rng, 'x.xgx.xgx.xgx.xg', bar, 'hat', 0.65, swing=swing, human=0.003, pan=0.15)
        if rng.random() < 0.4:
            hits.append((bar * 4 + rng.choice([1.75, 3.75]), 'rim', 0.4, 0, -0.3))
    fill_last_bar(hits, 'none', rng)

    if trapsoul or rng.random() < 0.5:
        bass = bass_from_kicks(key, roots, kick_beats, glide_every=0.2, rng=rng)
        parts.append(Part('808', 'synth', notes=bass, synth='808', params={'drive': 1.6, 'decay_s': 1.6, 'punch': 0.3},
                          mix=Mix(gain_db=-1), level=0.3))
    else:
        bnotes = []
        for bar in range(BARS):
            r = root_at(key, roots, bar * 4, 2, 33, 45)
            bnotes.append(Note(bar * 4, 1.8, r, 100))
            bnotes.append(Note(bar * 4 + 2.5 + swing * 0.25, 0.9, r + (7 if rng.random() < 0.5 else 12), 90))
            bnotes.append(Note(bar * 4 + 3.5, 0.45, key.snap(r + 10) if rng.random() < 0.5 else r, 84))
        parts.append(sf_part('bass', rng.choice(['fretless', 'fingerbass']), bnotes, Mix(gain_db=-1, hp=30, comp={'threshold_db': -20, 'ratio': 3}), level=0.3))

    return Song(spec['id'], spec['bpm'], BARS, parts, hits, 'rnb', bus_mix=_drum_mix('rnb', rng),
                kick_beats=kick_beats, delay_beats=0.75 if spec['bpm'] > 80 else 0.5, master={'lufs': -12.5, 'tilt': 0.0, 'tape': 0.2})


def pop(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood, q = spec['mood'], spec['q']
    prog = progression(rng, mood_family(mood, key.mode))
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, 1, 4 if mood == 'melodic' else 3, center, False)
    dance = mood == 'hype' or (mood == 'triumphant' and rng.random() < 0.6)

    parts = []
    parts.append(Part('pad', 'synth', chords=[(s, d, v) for s, d, v in spans], synth='pad',
                      params={'cutoff': rng.uniform(1800, 3200), 'voices': 5, 'detune': 0.18},
                      mix=Mix(gain_db=-9, reverb=0.3, room='hall', duck=0.6, width=1.5), level=0.25))
    keys_choice = rng.choice(['bright', 'grand', 'pluck', 'sawstack'])
    if keys_choice == 'pluck':
        pl = []
        for s, d, v in spans:
            pl += arpeggio([p + 12 for p in v], s, d, 0.5 if rng.random() < 0.5 else 0.25, rng.choice(['up', 'updown', 'broken']), (80, 105), rng)
        parts.append(Part('keys', 'synth', notes=pl, synth='pluck', params={'bright': rng.uniform(3500, 6500)},
                          mix=Mix(gain_db=-6, hp=250, reverb=0.25, room='plate', delay=0.25, duck=0.35, width=1.3), level=0.25))
    else:
        rh = rng.choice([[0, 1.5, 3], [0, 0.75, 1.5, 2.5, 3.25], [0, 2], [0.5, 1.5, 2.5, 3.5]])
        kn = []
        for bar in range(BARS):
            for off in rh:
                kn += strum(bar_tones[bar], bar * 4 + off, 0.7, 88, gap=0.008)
        parts.append(sf_part('keys', keys_choice, kn, Mix(gain_db=-6, hp=200, reverb=0.2, room='plate', duck=0.3, width=1.2)))
    hook_inst = rng.choice(['chop', 'bell', 'chime', 'pluck', 'sqlead'])
    a, b = lead_line(rng, key, bar_tones, 5, rng.choice(['syncopated', 'busy', 'sparse']), 'arch', rng.choice(['same', 'octave']))
    hook = b if q < 85 else a + b
    if hook_inst == 'chop':
        parts.append(Part('hook', 'synth', notes=hook, synth='chop', params={'vowel': rng.choice(['ah', 'oh', 'ee'])},
                          mix=Mix(gain_db=-6, hp=300, reverb=0.3, room='hall', delay=0.25, duck=0.2), level=0.22))
    elif hook_inst == 'bell':
        parts.append(Part('hook', 'synth', notes=hook, synth='bell', params={'ratio': 3.5, 'index': 2.2},
                          mix=Mix(gain_db=-6, hp=300, reverb=0.3, room='hall', delay=0.2), level=0.22))
    elif hook_inst == 'pluck':
        parts.append(Part('hook', 'synth', notes=[Note(nt.t, nt.dur, nt.pitch + 12, nt.vel) for nt in hook], synth='pluck',
                          params={'bright': 6000, 'voices': 2}, mix=Mix(gain_db=-6, hp=350, reverb=0.25, room='plate', delay=0.25), level=0.22))
    else:
        parts.append(sf_part('hook', hook_inst, hook, Mix(gain_db=-7, hp=300, reverb=0.3, room='hall', delay=0.2)))

    hits = []
    kick_beats = []
    for bar in range(BARS):
        if dance:
            kp = 'x...x...x...x...'
            grid(hits, rng, '....x.......x...', bar, 'clap', 1.0)
            grid(hits, rng, '..x...x...x...x.', bar, 'ohat', 0.55, pan=0.15)
            grid(hits, rng, 'x.x.x.x.x.x.x.x.', bar, 'hat', 0.5, pan=-0.15)
        else:
            kp = rng.choice(['x......xx.......', 'x.....x...x.....', 'x......x..x.....'])
            grid(hits, rng, '....x.......x...', bar, 'clap', 1.0)
            grid(hits, rng, '....x.......x...', bar, 'snare', 0.7)
            grid(hits, rng, 'x.x.x.x.x.x.x.xx', bar, 'hat', 0.6, pan=0.15)
        for st in steps_of(kp):
            b = bar * 4 + st * 0.25
            if bar == BARS - 1 and b >= BEATS - 1:
                continue
            kick_beats.append(b)
            hits.append((b, 'kick', 1.0, 0, 0))
        grid(hits, rng, 'xxxxxxxxxxxxxxxx', bar, 'shaker', 0.3, pan=0.35)
    hits.append((0, 'crash', 0.5, 0, 0))
    hits.append((BEATS, 'riser', 0.45, 0, 0))
    fill_last_bar(hits, 'snare-roll', rng)

    bn = []
    for bar in range(BARS):
        r = root_at(key, roots, bar * 4, 2, 33, 45)
        if dance:
            for k in range(4):
                bn.append(Note(bar * 4 + k + 0.5, 0.42, r if k % 2 == 0 else r + 12, 100))
        else:
            for off, d in rng.choice([[(0, 1.4), (1.5, 0.4), (2, 1.9)], [(0, 0.9), (1, 0.9), (2.5, 1.4)], [(0, 3.8)]]):
                bn.append(Note(bar * 4 + off, d, r, 100))
    parts.append(Part('bass', 'synth', notes=bn, synth='sub', params={'warmth': 0.35}, mix=Mix(gain_db=-1, duck=0.5, drive=1.2), level=0.3))

    return Song(spec['id'], spec['bpm'], BARS, parts, hits, 'pop', bus_mix=_drum_mix('pop', rng),
                kick_beats=kick_beats, delay_beats=0.75, master={'lufs': -11.0, 'tilt': 1.0})


GM = {'kick': 36, 'snare': 38, 'xstick': 37, 'hat': 42, 'phat': 44, 'ohat': 46, 'ride': 51, 'crash': 49,
      'tom_hi': 50, 'tom_mid': 47, 'tom_lo': 45, 'tamb': 54, 'shaker': 70}


def indie(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood, q = spec['mood'], spec['q']
    prog = progression(rng, mood_family(mood, key.mode))
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, 1, 3 if rng.random() < 0.6 else 4, center, False)
    beat_s = 60 / spec['bpm']

    parts = []
    # arpeggiated clean electric + strummed acoustic
    arp_inst = rng.choice(['clean', 'clean_ch', 'clean2', 'jazzgtr'])
    arp = []
    pat = rng.choice(['up', 'broken', 'pinky', 'updown'])
    for s, d, v in spans:
        arp += arpeggio([v[0] - 12 + 12] + [p + 12 for p in v], s, d, 0.5, pat, (68, 96), rng, gate=1.6)
    parts.append(sf_part('guitar', arp_inst, arp, Mix(gain_db=-5, hp=180, reverb=0.3, room='hall', delay=0.25, pan=-0.3, chorus=0.25)))
    if mood != 'dreamy' or q >= 75:
        strums = []
        sp = rng.choice([[(0, 'd'), (1, 'd'), (1.5, 'u'), (2.5, 'u'), (3, 'd'), (3.5, 'u')], [(0, 'd'), (2, 'd'), (2.5, 'u'), (3.5, 'u')], [(0, 'd'), (1.5, 'd'), (2.5, 'u'), (3, 'd')]])
        for bar in range(BARS):
            v = [p + 12 for p in sorted(bar_tones[bar])] + [bar_tones[bar][0] + 24]
            for off, dirn in sp:
                strums += strum(v, bar * 4 + off, 0.5 if dirn == 'u' else 0.9, 82 if dirn == 'd' else 66, gap=0.015, down=(dirn == 'd'))
        parts.append(sf_part('acoustic', rng.choice(['steel', 'nylon']), strums, Mix(gain_db=-8, hp=220, reverb=0.2, room='room', pan=0.35)))
    keys_inst = rng.choice(['tine', 'organ', 'warmpad', 'strings_slow'])
    parts.append(sf_part('keys', keys_inst, held(spans, vel=70), Mix(gain_db=-12, hp=180, lp=6000, reverb=0.35, room='hall', width=1.3, tape=0.4)))
    if q >= 72:
        a, b = lead_line(rng, key, bar_tones, 6, rng.choice(['long', 'sparse']), 'down', 'same')
        parts.append(sf_part('lead', rng.choice(['glock', 'celeste', 'vibes', 'flute']), b, Mix(gain_db=-10, hp=400, reverb=0.4, room='hall', delay=0.3, pan=0.2)))

    # live drum kit from the SoundFont
    kit_prog = 40 if mood == 'dreamy' else rng.choice([8, 0, 16])
    dn = []

    def hit(beat, name, vel):
        dn.append(Note(max(0.0, beat + rng.gauss(0, 0.006 / beat_s)), 0.25, GM[name], int(max(20, min(127, vel * rng.uniform(0.9, 1.08))))))

    kick_beats = []
    for bar in range(BARS):
        kp = rng.choice(['x.......x.x.....', 'x.....x.x.......', 'x.......x.......', 'x..x....x.x.....'])
        for st in steps_of(kp):
            b = bar * 4 + st * 0.25
            if bar == BARS - 1 and b >= BEATS - 1:
                continue
            hit(b, 'kick', 104)
            kick_beats.append(b)
        sn = 'xstick' if mood == 'dreamy' and bar < 4 else 'snare'
        hit(bar * 4 + 1, sn, 100)
        hit(bar * 4 + 3, sn, 104)
        cym = 'ride' if (mood == 'dreamy' or bar >= 4 and rng.random() < 0.5) else 'hat'
        for k in range(8):
            hit(bar * 4 + k * 0.5, cym, 84 if k % 2 == 0 else 62)
        if rng.random() < 0.3:
            hit(bar * 4 + 3.5, 'ohat', 70)
        if bar % 2 == 1:
            hit(bar * 4 + 2.5, 'tamb', 60)
    hit(0, 'crash', 96)
    for k, nm in enumerate(['tom_hi', 'tom_hi', 'tom_mid', 'tom_lo']):
        hit(BEATS - 1 + k * 0.25, nm, 92 + k * 6)
    parts.append(Part('kit', 'sf', notes=dn, drums=True, program=kit_prog,
                      mix=Mix(gain_db=-1, comp={'threshold_db': -16, 'ratio': 3, 'attack': 0.008, 'release': 0.1}, reverb=0.18, room='room', tape=0.3),
                      level=0.32))

    bnotes = []
    for bar in range(BARS):
        r = root_at(key, roots, bar * 4, 2, 33, 45)
        for off, d, iv in rng.choice([[(0, 1.4, 0), (1.5, 0.4, 0), (2, 1.4, 7), (3.5, 0.4, 12)], [(0, 0.9, 0), (1, 0.9, 0), (2, 0.9, 0), (3, 0.9, 7)], [(0, 1.9, 0), (2, 1.4, 0), (3.5, 0.45, 5)]]):
            bnotes.append(Note(bar * 4 + off, d, r + iv, 96))
    parts.append(sf_part('bass', rng.choice(['fingerbass', 'pickbass']), bnotes, Mix(gain_db=-2, hp=35, comp={'threshold_db': -20, 'ratio': 3}, tape=0.3), level=0.3))

    return Song(spec['id'], spec['bpm'], BARS, parts, [], 'indie', bus_mix={},
                kick_beats=kick_beats, delay_beats=0.75, rooms={'room': 0.8, 'plate': 1.5, 'hall': 2.6},
                master={'lufs': -13.0, 'tilt': -0.5, 'tape': 0.6})


def hyperpop(spec, rng: random.Random) -> Song:
    key = Key.parse(spec['key'])
    mood, q = spec['mood'], spec['q']
    prog = progression(rng, mood_family(mood, key.mode))
    center = 12 * 5 + key.tonic
    spans, bar_tones, roots = harmony(key, prog, 1, 4, center, False)

    parts = []
    rhythm = rng.choice([[0, 0.75, 1.5, 2.5, 3.25], [0, 1.5, 3], [0, 0.5, 1.5, 2, 3, 3.5]])
    stabs = []
    for bar in range(BARS):
        for off in rhythm:
            stabs.append((bar * 4 + off, 0.4, [p + 12 for p in bar_tones[bar]]))
    parts.append(Part('stabs', 'synth', chords=stabs, synth='stab', params={'cutoff': rng.uniform(4000, 7000)},
                      mix=Mix(gain_db=-6, hp=200, reverb=0.25, room='plate', duck=0.65, width=1.6, drive=1.4), level=0.25))
    parts.append(Part('pad', 'synth', chords=list(spans), synth='pad', params={'cutoff': 4000, 'voices': 7, 'detune': 0.22},
                      mix=Mix(gain_db=-11, hp=250, reverb=0.35, room='hall', duck=0.7, width=1.7), level=0.25))
    arp = []
    for s, d, v in spans:
        arp += arpeggio([p + 24 for p in v], s, d, 0.25, rng.choice(['up', 'updown', 'pinky']), (80, 110), rng)
    parts.append(Part('sparkle', 'synth', notes=arp, synth='bell', params={'ratio': rng.choice([3.5, 2.0]), 'index': 2.0, 'decay_s': 0.5, 'bits': rng.choice([0, 6, 7])},
                      mix=Mix(gain_db=-9, hp=600, reverb=0.25, room='plate', delay=0.2, width=1.4), level=0.22))
    lead_kind = rng.choice(['chop', 'sqlead', 'lead'])
    a, b = lead_line(rng, key, bar_tones, 5, rng.choice(['busy', 'syncopated', 'triplet']), 'arch', 'octave')
    hook = a + b
    if lead_kind == 'chop':
        parts.append(Part('hook', 'synth', notes=[Note(nt.t, nt.dur, nt.pitch + 12, nt.vel) for nt in hook], synth='chop', params={'vowel': 'ee'},
                          mix=Mix(gain_db=-6, hp=400, reverb=0.3, room='hall', delay=0.25, drive=1.6), level=0.22))
    elif lead_kind == 'lead':
        parts.append(Part('hook', 'synth', notes=[Note(nt.t, nt.dur, nt.pitch, nt.vel, glide=True) for nt in hook], synth='lead',
                          params={'shape': 'saw', 'cutoff': 5000, 'vibrato': 0.3, 'voices': 3},
                          mix=Mix(gain_db=-8, hp=300, reverb=0.3, room='hall', delay=0.2, drive=1.8), level=0.22))
    else:
        parts.append(sf_part('hook', 'sqlead', hook, Mix(gain_db=-8, hp=300, reverb=0.3, room='hall', delay=0.25, crush_bits=8)))

    hits = []
    kick_beats = []
    half = mood == 'aggressive' or rng.random() < 0.4
    for bar in range(BARS):
        kp = rng.choice(['x.....x...x.....', 'x......x..x...x.', 'x.x.......x.....']) if half else 'x...x...x...x...'
        for st in steps_of(kp):
            b = bar * 4 + st * 0.25
            if bar == BARS - 1 and b >= BEATS - 1:
                continue
            kick_beats.append(b)
            hits.append((b, 'kick', 1.0, 0, 0))
        snare_pat = '........x.......' if half else '....x.......x...'
        grid(hits, rng, snare_pat, bar, 'snare', 1.0)
        grid(hits, rng, snare_pat, bar, 'clap', 0.9)
        trap_hats(hits, rng, bar, 0.75, base='16')
        if rng.random() < 0.4:
            # glitch stutter: a burst of 32nd claps
            t0 = bar * 4 + rng.choice([1.5, 3.0, 3.5])
            for k in range(4):
                hits.append((t0 + k * 0.125, 'clap', 0.5 + 0.1 * k, k, rng.uniform(-0.5, 0.5)))
    hits.append((0, 'crash', 0.5, 0, 0))
    hits.append((BEATS, 'riser', 0.4, 0, 0))
    fill_last_bar(hits, 'snare-roll', rng)

    bass = bass_from_kicks(key, roots, kick_beats, glide_every=0.3, rng=rng)
    parts.append(Part('808', 'synth', notes=bass, synth='808', params={'drive': rng.uniform(4.0, 6.0), 'decay_s': 1.0},
                      mix=Mix(gain_db=-1, eq=[('peak', 900, 3, 1.0)]), level=0.32))

    return Song(spec['id'], spec['bpm'], BARS, parts, hits, 'hyper', bus_mix=_drum_mix('hyper', rng),
                kick_beats=kick_beats, delay_beats=0.75, master={'lufs': -10.5, 'tilt': 1.5})


def _drum_mix(style: str, rng: random.Random) -> dict:
    """Per-bus mix for the synthesized kit."""
    space = {'trap': 0.14, 'drill': 0.12, 'afro': 0.12, 'rnb': 0.25, 'pop': 0.18, 'hyper': 0.12}.get(style, 0.15)
    return {
        'kick': Mix(gain_db=0.0, comp={'threshold_db': -12, 'ratio': 2.5, 'attack': 0.006, 'release': 0.08}),
        'snare': Mix(gain_db=-1.0 if style in ('trap', 'drill', 'hyper') else -2.0, hp=120, reverb=space, room='plate',
                     comp={'threshold_db': -14, 'ratio': 3, 'attack': 0.004, 'release': 0.1}),
        'hats': Mix(gain_db=-11 if style != 'afro' else -12, hp=400, width=1.3, reverb=0.06, room='room'),
        'perc': Mix(gain_db=-11, hp=150, reverb=0.18, room='plate', delay=0.12 if style in ('afro', 'rnb') else 0.0, width=1.2),
        'fx': Mix(gain_db=-19, hp=200, reverb=0.3, room='hall', width=1.5),
    }


COMPOSERS = {'trap': trap, 'drill': drill, 'afrobeats': afrobeats, 'r&b': rnb, 'pop': pop, 'indie': indie, 'hyperpop': hyperpop}
