"""Find more CC0 StockSnap photos (via the Openverse API) for the stock pack.

Runs the searches below, skips photos already in photo-picks.json, downloads a
small thumbnail of each candidate and writes numbered contact sheets so they
can be reviewed by eye. Picks then go into photo-picks.json (with tags) and
build-photo-pack.py does the rest.

    py scripts/photos/find-candidates.py [--out DIR]

Writes DIR/candidates.json (number -> id, title, query, tag) and DIR/sheet-NN.jpg.
Openverse allows anonymous use at ~20 requests a minute, so this paces itself.
Never pick photos with identifiable faces: the people in this game are synthetic.
"""
import argparse
import json
import os
import time
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

# tag -> searches. Tags are the stock pack's PhotoTag values (plus new ones the build adds).
SEARCHES = {
    'car': ['car', 'sports car', 'luxury car', 'car interior', 'classic car', 'cars night', 'convertible', 'steering wheel'],
    'pets': ['dog', 'puppy', 'cat', 'kitten', 'pet', 'french bulldog'],
    'home': ['house', 'mansion', 'living room', 'interior design', 'apartment', 'kitchen', 'bedroom', 'swimming pool', 'villa'],
    'city': ['skyscraper', 'architecture', 'building', 'skyline', 'downtown'],
    'food': ['food', 'burger', 'pizza', 'breakfast', 'dessert', 'restaurant', 'sushi', 'cocktail'],
    'beach': ['beach', 'ocean', 'palm trees', 'island', 'tropical'],
    'sky': ['sunset', 'sunrise', 'clouds', 'mountains'],
    'travel': ['travel', 'airport', 'hotel', 'road trip'],
    'watch': ['watch', 'wristwatch'],
    'jewelry': ['jewelry', 'necklace', 'ring', 'diamond'],
    'sneakers': ['sneakers', 'shoes', 'clothes'],
    'yacht': ['yacht', 'boat', 'marina'],
    'fit': ['gym', 'dumbbell', 'workout'],
    'money': ['money', 'cash', 'credit card'],
    'night': ['neon', 'night lights', 'city night'],
}


def get(url, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Referer': 'https://stocksnap.io/'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def search(q, page=1):
    qs = urllib.parse.urlencode({'q': q, 'source': 'stocksnap', 'license': 'cc0', 'page_size': 20, 'page': page})
    for attempt in range(3):
        try:
            return json.loads(get(f'https://api.openverse.org/v1/images/?{qs}'))
        except Exception as e:
            print('search', q, 'retry', attempt, e, flush=True)
            time.sleep(10)
    return {'results': []}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, '.photo-cache', 'candidates'))
    ap.add_argument('--pages', type=int, default=2)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    have = {p['id'] for p in json.load(open(os.path.join(HERE, 'photo-picks.json'), encoding='utf-8'))}

    found_path = os.path.join(args.out, 'candidates.json')
    found = json.load(open(found_path, encoding='utf-8')) if os.path.exists(found_path) else []
    seen = have | {c['id'] for c in found}
    done_queries = {c['query'] for c in found}
    for tag, queries in SEARCHES.items():
        for q in queries:
            if q in done_queries:
                continue
            for page in range(1, args.pages + 1):
                res = search(q, page)
                time.sleep(3.2)  # ~19 requests a minute
                for r in res.get('results', []):
                    pid = r['foreign_landing_url'].rstrip('/').rsplit('-', 1)[-1]
                    if pid in seen:
                        continue
                    seen.add(pid)
                    found.append({'n': len(found), 'id': pid, 'title': r.get('title') or '', 'creator': r.get('creator') or '',
                                  'landing': r['foreign_landing_url'], 'tag': tag, 'query': q,
                                  'w': r.get('width'), 'h': r.get('height')})
                if page >= (res.get('page_count') or 1):
                    break
            print(f'{tag}/{q}: {len(found)} candidates', flush=True)
            json.dump(found, open(found_path, 'w', encoding='utf-8'), indent=1)

    # Thumbnails (small, for review only) and numbered sheets of 40.
    for c in found:
        path = os.path.join(args.out, f"{c['id']}.jpg")
        if os.path.exists(path) and os.path.getsize(path) > 2000:
            continue
        try:
            open(path, 'wb').write(get(f"https://cdn.stocksnap.io/img-thumbs/280h/{c['id']}.jpg"))
        except Exception as e:
            print('thumb', c['id'], e, flush=True)
    cell_w, cell_h, cols = 240, 200, 8
    for s in range(0, len(found), 40):
        chunk = found[s:s + 40]
        sheet = Image.new('RGB', (cols * cell_w, ((len(chunk) + cols - 1) // cols) * cell_h), 'black')
        d = ImageDraw.Draw(sheet)
        for i, c in enumerate(chunk):
            x, y = (i % cols) * cell_w, (i // cols) * cell_h
            try:
                im = Image.open(os.path.join(args.out, f"{c['id']}.jpg")).convert('RGB')
                im.thumbnail((cell_w - 6, cell_h - 6))
                sheet.paste(im, (x + 3, y + 3))
            except Exception:
                pass
            d.rectangle([x + 3, y + 3, x + 58, y + 22], fill='black')
            d.text((x + 6, y + 6), f"{c['n']} {c['tag'][:4]}", fill='yellow')
        sheet.save(os.path.join(args.out, f'sheet-{s // 40:02d}.jpg'), quality=82)
    print(f'{len(found)} candidates, {(len(found) + 39) // 40} sheets in {args.out}', flush=True)


if __name__ == '__main__':
    main()
