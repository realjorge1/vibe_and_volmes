"""
Turn generated people photos (.raw/<key>.webp|png) into app assets:

  assets/people/<key>.webp        resized, compressed
  data/photos/peoplePack.ts       the manifest the game reads (gender, scene, reaction, rival...)
  assets/people/CREDITS.md        which open model made each image (all faces synthetic)

Safe to run any time: it rebuilds from whatever has been generated so far.

  py scripts/photos/people/build_people_pack.py
"""
import json
import os
import re

from PIL import Image, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
RAW = os.path.join(HERE, '.raw')
OUT = os.path.join(ROOT, 'assets', 'people')
MANIFEST = os.path.join(ROOT, 'data', 'photos', 'peoplePack.ts')
STOCK = os.path.join(ROOT, 'data', 'photos', 'photoPack.ts')

# Map people tags onto the stock pack's tags so the old planners can use them too.
TAG_MAP = {
    'fans': 'fans', 'concert': 'crowd', 'hype': 'crowd', 'love': 'love', 'friends': 'friends', 'party': 'party',
    'nightlife': 'nightlife', 'dance': 'dance', 'drive': 'drive', 'music': 'music', 'fit': 'fit', 'gym': 'fit',
    'fashion': 'fashion', 'street': 'street', 'phone': 'phone', 'reaction': 'phone', 'food': 'food', 'night': 'night',
    'festival': 'festival', 'paparazzi': 'paparazzi', 'player': 'player', 'press': 'press', 'flex': 'flex',
    'stage': 'stage', 'crowd': 'crowd', 'studio': 'studio', 'couple': 'love', 'community': 'crowd', 'charity': 'crowd',
    'drama': 'night',
}
FOCUS = {'selfie': (0.5, 0.36), 'rival': (0.5, 0.33), 'reaction': (0.5, 0.4), 'scene': (0.5, 0.45)}


def stock_tags() -> set:
    src = open(STOCK, encoding='utf-8').read()
    m = re.search(r'export type PhotoTag =([^;]+);', src)
    return set(re.findall(r"'([a-z-]+)'", m.group(1))) if m else set()


def tags_for(spec: dict, valid: set) -> list:
    raw = list(spec.get('tags', []))
    if spec['category'] == 'selfie':
        raw += ['lifestyle', 'fashion'] if spec.get('style') in ('glam', 'baddie', 'drip', 'date-night') else ['lifestyle']
    elif spec['category'] == 'reaction':
        raw += ['reaction']
    elif spec['category'] == 'rival':
        raw += ['stage', 'crowd'] if spec.get('shot') == 'stage' else ['press']
    out = []
    for t in raw:
        m = TAG_MAP.get(t, t)
        if m in valid and m not in out:
            out.append(m)
    return out or ['lifestyle']


def main():
    specs = {s['key']: s for s in json.load(open(os.path.join(HERE, 'people-specs.json'), encoding='utf-8'))}
    # Last record per key and source: laptop runs are tagged '(local)'.
    log = {}
    if os.path.exists(os.path.join(RAW, 'log.jsonl')):
        for line in open(os.path.join(RAW, 'log.jsonl'), encoding='utf-8'):
            try:
                rec = json.loads(line)
                log[(rec['key'], '(local)' in str(rec.get('model')))] = rec
            except ValueError:
                pass
    # One source per key: a Horde .webp beats a laptop .png made earlier.
    best = {}
    for fn in os.listdir(RAW):
        key, ext = os.path.splitext(fn)
        rank = {'.webp': 0, '.jpg': 1, '.png': 2}.get(ext)
        if rank is not None and key in specs and (key not in best or rank < best[key][0]):
            best[key] = (rank, fn)
    valid = stock_tags()
    os.makedirs(OUT, exist_ok=True)
    rows, credits = [], []
    local_count = 0
    for key in sorted(best):
        fn = best[key][1]
        local = fn.endswith('.png')
        local_count += local
        spec = specs[key]
        im = Image.open(os.path.join(RAW, fn)).convert('RGB')
        big = spec['category'] in ('rival', 'scene') or spec.get('admirer')
        # Sized for where it shows: feed photos fill a phone width; everyday faces are
        # only profile pictures (20-84 dp, so 400 px is sharp at 3x); memes sit between.
        avatar = spec['category'] == 'selfie' and not spec.get('admirer')
        longest = 960 if big else 400 if avatar else 640
        scale = min(1.0, longest / max(im.size))
        if scale < 1:
            im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
        dst = os.path.join(OUT, f'{key}.webp')
        im.save(dst, 'WEBP', quality=76, method=6)
        mean = ImageStat.Stat(im.resize((32, 32))).mean
        tint = '#%02X%02X%02X' % tuple(int(c) for c in mean[:3])
        dark = (0.2126 * mean[0] + 0.7152 * mean[1] + 0.0722 * mean[2]) / 255 < 0.45
        fx, fy = FOCUS.get(spec['category'], (0.5, 0.45))
        row = {
            'key': key,
            'w': im.width,
            'h': im.height,
            'tags': tags_for(spec, valid),
            'focus': [fx, fy],
            'tint': tint,
            'dark': dark,
            'category': spec['category'],
        }
        for f in ('gender', 'scene', 'reaction', 'rival', 'shot'):
            if spec.get(f):
                row[f] = spec[f]
        if spec.get('admirer'):
            row['admirer'] = True
        if spec.get('faceless'):
            row['faceless'] = True
        rows.append(row)
        rec = log.get((key, local), {})
        credits.append(f"| {key} | {rec.get('model', 'open SDXL model via AI Horde')} | {rec.get('seed', spec.get('seed'))} |")

    lines = [
        '/* eslint-disable */',
        '// GENERATED by scripts/photos/people/build_people_pack.py. Do not edit by hand.',
        '// Every face here is synthetic (generated by an open image model from a text',
        '// description), never a photo of a real person. Credits: assets/people/CREDITS.md.',
        "import type { StockPhoto } from './photoPack';",
        '',
        "export type PeopleCategory = 'selfie' | 'scene' | 'reaction' | 'rival';",
        '',
        'export interface PeoplePhoto extends StockPhoto {',
        '  category: PeopleCategory;',
        "  gender?: 'woman' | 'man';",
        "  /** 'selfie': a glam/date-night look, used for admirers. */",
        '  admirer?: boolean;',
        "  /** 'scene': what the scene shows (concert-scream, couple-selfie, paparazzi-hoodie...). */",
        '  scene?: string;',
        "  /** 'reaction': the face it pulls (shocked, side-eye, crying-laughing...). */",
        '  reaction?: string;',
        "  /** 'rival': whose photo it is and which shot. */",
        '  rival?: string;',
        "  shot?: 'portrait' | 'stage';",
        '  /** Shows nobody identifiable (backs, silhouettes): usable for the artist. */',
        '  faceless?: boolean;',
        '}',
        '',
        f'/** {len(rows)} synthetic people photos. */',
        'export const PEOPLE: readonly PeoplePhoto[] = [',
    ]
    for r in rows:
        extra = ''.join(
            f", {k}: {json.dumps(r[k])}" if not isinstance(r[k], bool) else f", {k}: true"
            for k in ('gender', 'admirer', 'scene', 'reaction', 'rival', 'shot', 'faceless') if k in r
        )
        tags = ', '.join(f"'{t}'" for t in r['tags'])
        lines.append(
            f"  {{ key: '{r['key']}', src: require('../../assets/people/{r['key']}.webp'), w: {r['w']}, h: {r['h']}, "
            f"tags: [{tags}], focus: [{r['focus'][0]}, {r['focus'][1]}], tint: '{r['tint']}', dark: {'true' if r['dark'] else 'false'}, "
            f"category: '{r['category']}'{extra} }},"
        )
    lines += ['];', '']
    with open(MANIFEST, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines))

    with open(os.path.join(OUT, 'CREDITS.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('# People photos\n\n')
        f.write('Every person in these images is **synthetic**: generated from a text description by an open image\n')
        f.write('model. None is a photo of a real person, and none was copied from the internet.\n\n')
        f.write('- Open SDXL photoreal models (ZavyChromaXL, ICBINP XL, Juggernaut XL, AlbedoBase XL) run on the\n')
        f.write('  AI Horde volunteer network.\n')
        if local_count:
            f.write(f'- {local_count} small photos (crowd avatars, meme faces): LCM Dreamshaper v7 (int8, OpenVINO), run locally.\n')
        f.write('\n')
        f.write('Regenerate with `scripts/photos/people/` (prompts.py -> generate_*.py -> build_people_pack.py).\n\n')
        f.write('| key | model | seed |\n|---|---|---|\n')
        f.write('\n'.join(credits) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.webp'))
    print(f'{len(rows)} photos -> assets/people ({total / 1e6:.1f} MB), manifest written')


def _locked(fn):
    """Both generators rebuild as they go; never let two builds write at once."""
    import time

    def wrapper():
        lock = os.path.join(RAW, 'build.lock')
        for _ in range(120):
            try:
                fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                break
            except FileExistsError:
                if time.time() - os.path.getmtime(lock) > 600:
                    os.remove(lock)  # stale lock from a crashed build
                time.sleep(1)
        else:
            raise RuntimeError('build lock busy')
        try:
            return fn()
        finally:
            os.close(fd)
            os.remove(lock)

    return wrapper


main = _locked(main)

if __name__ == '__main__':
    main()
