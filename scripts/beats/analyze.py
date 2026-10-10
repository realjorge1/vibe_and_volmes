"""Per-stem level report for a beat: how loud each part sits in the final mix."""
import os, sys, random
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from beatlib import dsp
from beatlib.genres import COMPOSERS
from beatlib import mixer
from make_beats import CATALOG, seed_of

def report(bid):
    b = next(c for c in CATALOG if c[0] == bid)
    spec = dict(zip(['id', 'genre', 'bpm', 'key', 'mood', 'q'], b))
    song = COMPOSERS[spec['genre']](spec, random.Random(seed_of(bid)))
    stems = {}
    # capture the pre-master loop to know the master gain
    orig = mixer.master
    pre = {}
    def spy(x, cfg):
        pre['x'] = x
        return orig(x, cfg)
    mixer.master = spy
    out = mixer.mix_song(song, seed_of(bid), stems)
    mixer.master = orig
    gain = dsp.to_db(np.sqrt(np.mean(out ** 2))) - dsp.to_db(np.sqrt(np.mean(pre['x'] ** 2)))
    print(f'{bid}: master gain {gain:+.1f} dB, final {dsp.lufs(out):.1f} LUFS, crest {dsp.to_db(np.max(np.abs(out)) / np.sqrt(np.mean(out**2))):.1f} dB')
    n = song.n
    for name, y in sorted(stems.items(), key=lambda kv: -np.mean(kv[1][:n] ** 2)):
        y = mixer.fold(y, n)
        r = dsp.to_db(np.sqrt(np.mean(y ** 2)) + 1e-9) + gain
        lo = dsp.to_db(np.sqrt(np.mean(dsp.lp(y, 150) ** 2)) + 1e-9) + gain
        hi = dsp.to_db(np.sqrt(np.mean(dsp.hp(y, 3000) ** 2)) + 1e-9) + gain
        print(f'   {name:14s} rms {r:6.1f} dBFS   <150Hz {lo:6.1f}   >3k {hi:6.1f}')

for bid in sys.argv[1:]:
    report(bid)
