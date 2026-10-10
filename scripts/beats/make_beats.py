"""
Beat engine v3 — renders every catalog beat as an 8-bar, seamlessly looping,
mixed and mastered instrumental (AAC .m4a), and rewrites data/beats/beatAssets.ts.

  py scripts/beats/fetch_tools.py          # once: FluidSynth, the SoundFont, ffmpeg
  py scripts/beats/make_beats.py           # all beats
  py scripts/beats/make_beats.py trap-paranoia afro-sunlight --review   # some, plus spectrograms

Sampled instruments: GeneralUser GS v2 by S. Christian Collins (free for any
music production, commercial included). Drums, 808s and synths are
synthesized in beatlib. Seeded by beat id: re-running gives the same audio.
"""
import argparse
import hashlib
import os
import random
import subprocess
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from beatlib import dsp  # noqa: E402
from beatlib.genres import COMPOSERS  # noqa: E402
from beatlib.mixer import mix_song  # noqa: E402

FFMPEG = os.path.join(HERE, '.tools', 'ffmpeg', 'ffmpeg.exe')
FOLDER = {'trap': 'trap', 'drill': 'drill', 'afrobeats': 'afrobeats', 'r&b': 'rnb', 'pop': 'pop', 'indie': 'indie', 'hyperpop': 'hyperpop'}

# Mirrors data/beats/beatCatalog.ts (id, genre, bpm, key, mood, quality).
CATALOG = [
    ('trap-midnight-bloom', 'trap', 140, 'F# min', 'dark', 82),
    ('trap-foreign-engine', 'trap', 146, 'C min', 'hype', 74),
    ('trap-glass-tears', 'trap', 132, 'A min', 'melodic', 79),
    ('trap-velvet-smoke', 'trap', 136, 'D# min', 'melodic', 80),
    ('trap-paranoia', 'trap', 138, 'B min', 'dark', 77),
    ('trap-victory-lap', 'trap', 144, 'G# min', 'triumphant', 84),
    ('drill-cold-corner', 'drill', 144, 'G min', 'aggressive', 76),
    ('drill-sliding', 'drill', 142, 'D min', 'dark', 71),
    ('drill-no-hook', 'drill', 145, 'E min', 'hype', 68),
    ('drill-trenches', 'drill', 143, 'A min', 'aggressive', 75),
    ('drill-midnight-run', 'drill', 141, 'F min', 'dark', 72),
    ('drill-opps-down', 'drill', 146, 'C# min', 'hype', 70),
    ('afro-lagos-nights', 'afrobeats', 108, 'B maj', 'romantic', 85),
    ('afro-sunlight', 'afrobeats', 112, 'F maj', 'triumphant', 77),
    ('afro-slow-wind', 'afrobeats', 102, 'A maj', 'melodic', 73),
    ('afro-island-time', 'afrobeats', 105, 'E maj', 'romantic', 82),
    ('afro-gold-coast', 'afrobeats', 110, 'D maj', 'triumphant', 86),
    ('afro-palm-wine', 'afrobeats', 100, 'G maj', 'melodic', 75),
    ('rnb-2am-text', 'r&b', 88, 'E maj', 'romantic', 88),
    ('rnb-afterglow', 'r&b', 76, 'Db maj', 'dreamy', 80),
    ('rnb-bruised', 'r&b', 82, 'C min', 'sad', 75),
    ('rnb-silk-sheets', 'r&b', 84, 'A maj', 'romantic', 87),
    ('rnb-3am-confession', 'r&b', 72, 'F# maj', 'dreamy', 81),
    ('rnb-overrated', 'r&b', 90, 'E min', 'sad', 76),
    ('pop-neon-rush', 'pop', 124, 'A maj', 'hype', 90),
    ('pop-paper-hearts', 'pop', 100, 'G maj', 'melodic', 83),
    ('pop-comeback', 'pop', 118, 'D maj', 'triumphant', 86),
    ('pop-supernova', 'pop', 128, 'B maj', 'hype', 90),
    ('pop-daydream', 'pop', 104, 'C maj', 'melodic', 83),
    ('pop-glow-up', 'pop', 120, 'F maj', 'triumphant', 87),
    ('indie-old-film', 'indie', 96, 'C maj', 'dreamy', 72),
    ('indie-static', 'indie', 90, 'A min', 'sad', 69),
    ('indie-rooftops', 'indie', 112, 'E maj', 'triumphant', 76),
    ('indie-polaroid', 'indie', 98, 'G maj', 'dreamy', 73),
    ('indie-grey-skies', 'indie', 88, 'D min', 'sad', 70),
    ('indie-first-light', 'indie', 110, 'A maj', 'triumphant', 77),
    ('hyper-sugar-crash', 'hyperpop', 160, 'F# maj', 'hype', 81),
    ('hyper-melt', 'hyperpop', 150, 'B maj', 'dreamy', 78),
    ('hyper-screwface', 'hyperpop', 168, 'D min', 'aggressive', 74),
    ('hyper-glitter-bomb', 'hyperpop', 162, 'C# maj', 'hype', 82),
    ('hyper-feels', 'hyperpop', 148, 'E maj', 'dreamy', 79),
    ('hyper-rage-quit', 'hyperpop', 170, 'F min', 'aggressive', 75),
]


def seed_of(beat_id: str) -> int:
    return int(hashlib.sha1(beat_id.encode()).hexdigest()[:8], 16)


def encode_m4a(x: np.ndarray, path: str, kbps: int = 192):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    pcm = np.clip(x, -1, 1).astype('<f4').tobytes()
    cmd = [FFMPEG, '-y', '-hide_banner', '-loglevel', 'error', '-f', 'f32le', '-ar', str(dsp.SR), '-ac', '2', '-i', 'pipe:0',
           '-c:a', 'aac', '-b:a', f'{kbps}k', '-movflags', '+faststart', path]
    subprocess.run(cmd, input=pcm, check=True)


def spectrogram_png(x: np.ndarray, path: str, title: str):
    from PIL import Image, ImageDraw
    m = dsp.mono(x)
    nfft, hop = 2048, 512
    win = np.hanning(nfft)
    frames = [np.abs(np.fft.rfft(m[i:i + nfft] * win)) for i in range(0, len(m) - nfft, hop)]
    S = 20 * np.log10(np.array(frames).T + 1e-9)
    S -= S.max()
    # log-frequency rows from 30 Hz to 16 kHz
    freqs = np.fft.rfftfreq(nfft, 1 / dsp.SR)
    rows = np.geomspace(30, 16000, 220)
    idx = np.searchsorted(freqs, rows)
    img = S[idx]
    img = np.clip((img + 80) / 80, 0, 1)[::-1]
    w = min(1200, img.shape[1])
    cols = np.linspace(0, img.shape[1] - 1, w).astype(int)
    img = (img[:, cols] * 255).astype(np.uint8)
    f = img.astype(float) / 255
    rgb = np.stack([np.clip(f * 1.6, 0, 1), np.clip(f * 1.6 - 0.5, 0, 1), np.clip(0.35 + f - f * f * 1.3, 0, 1)], axis=2)
    rgb = (rgb * 255).astype(np.uint8)
    im = Image.fromarray(rgb).resize((w, 260))
    # waveform strip
    wave = np.zeros((90, w, 3), np.uint8)
    seg = len(m) // w
    for c in range(w):
        a = np.abs(m[c * seg:(c + 1) * seg]).max() if seg else 0
        h = int(a * 44)
        wave[45 - h:45 + h, c] = (120, 220, 255)
    canvas = Image.new('RGB', (w, 260 + 90 + 24), (10, 10, 16))
    canvas.paste(im, (0, 24))
    canvas.paste(Image.fromarray(wave), (0, 284))
    ImageDraw.Draw(canvas).text((6, 5), title, fill=(240, 240, 240))
    canvas.save(path)


def write_assets_ts(done_ids):
    lines = [
        '/**',
        ' * Bundled instrumentals, keyed by beat id.',
        ' *',
        ' * Metro fails the whole bundle on a `require()` of a missing file, so the',
        ' * catalog NEVER requires audio directly — it looks the asset up here by beat',
        ' * id. A beat with no entry is still fully selectable in the simulation; it',
        ' * just plays silently until you add a file.',
        ' *',
        ' * These 8-bar loops are rendered by `scripts/beats/make_beats.py` (beat engine',
        ' * v3): sampled instruments from the GeneralUser GS SoundFont plus synthesized',
        ' * drums, 808s and synths, mixed and mastered, AAC in .m4a. Each file loops',
        ' * seamlessly (reverb and delay tails are folded back onto the start).',
        ' * Re-run the script to regenerate; it rewrites this file.',
        ' */',
        'export const BEAT_ASSETS: Record<string, number> = {',
    ]
    for bid, genre, *_ in CATALOG:
        if bid in done_ids:
            lines.append(f"  '{bid}': require('../../assets/beats/{FOLDER[genre]}/{bid}.m4a'),")
    lines += ['};', '', '/** The bundled asset for a beat, or null when none is registered. */',
              'export function resolveBeatAsset(id: string): number | null {', '  return BEAT_ASSETS[id] ?? null;', '}', '']
    with open(os.path.join(ROOT, 'data', 'beats', 'beatAssets.ts'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ids', nargs='*')
    ap.add_argument('--review', action='store_true', help='also write spectrogram PNGs to scripts/beats/.review/')
    ap.add_argument('--wav', action='store_true', help='also write the master as WAV next to the review images')
    ap.add_argument('--no-assets-ts', action='store_true')
    args = ap.parse_args()

    todo = [b for b in CATALOG if not args.ids or b[0] in args.ids]
    review_dir = os.path.join(HERE, '.review')
    if args.review or args.wav:
        os.makedirs(review_dir, exist_ok=True)
    total_bytes = 0
    for bid, genre, bpm, key, mood, q in todo:
        t0 = time.time()
        spec = {'id': bid, 'genre': genre, 'bpm': bpm, 'key': key, 'mood': mood, 'q': q}
        rng = random.Random(seed_of(bid))
        song = COMPOSERS[genre](spec, rng)
        x = mix_song(song, seed_of(bid))
        out = os.path.join(ROOT, 'assets', 'beats', FOLDER[genre], f'{bid}.m4a')
        encode_m4a(x, out)
        size = os.path.getsize(out)
        total_bytes += size
        L = dsp.lufs(x)
        tp = dsp.true_peak_db(x)
        seam = float(np.max(np.abs(x[0] - x[-1])))
        print(f'{bid:22s} {len(x) / dsp.SR:5.1f}s  {L:6.1f} LUFS  TP {tp:5.1f} dB  seam {seam:.3f}  {size / 1024:6.0f} KB  '
              f'parts={",".join(p.name for p in song.parts)}  ({time.time() - t0:.0f}s)', flush=True)
        if args.review:
            spectrogram_png(x, os.path.join(review_dir, f'{bid}.png'), f'{bid}  {genre} {bpm}bpm {key} {mood}  {L:.1f} LUFS')
        if args.wav:
            import soundfile as sf
            sf.write(os.path.join(review_dir, f'{bid}.wav'), x, dsp.SR, subtype='PCM_16')
    print(f'total {total_bytes / 1e6:.1f} MB for {len(todo)} beats')
    if not args.no_assets_ts and not args.ids:
        write_assets_ts({b[0] for b in CATALOG})


if __name__ == '__main__':
    main()
