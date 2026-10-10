"""
Download the local image model (LCM Dreamshaper v7, int8, OpenVINO; ~1.1 GB)
into scripts/photos/people/.raw/models/lcm-dreamshaper-int8/ (git-ignored).
Resumable; big files come down over parallel ranges; every file is checked
against the size (and, for big files, the sha256) the Hugging Face API reports.

  py scripts/photos/people/fetch_model.py
"""
import hashlib
import json
import math
import os
import threading
import time
import urllib.request

REPO = 'OpenVINO/LCM_Dreamshaper_v7-int8-ov'
HERE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(HERE, '.raw', 'models', 'lcm-dreamshaper-int8')
SKIP = ('safety_checker/', 'vae_encoder/', 'README.md', '.gitattributes')
UA = {'User-Agent': 'vibe-and-volumes-model-fetch/1.0'}


def listing():
    req = urllib.request.Request(f'https://huggingface.co/api/models/{REPO}/tree/main?recursive=true', headers=UA)
    return [f for f in json.loads(urllib.request.urlopen(req, timeout=60).read()) if f.get('type') == 'file' and not f['path'].startswith(SKIP)]


def fetch_range(url, path, start, end):
    while True:
        got = os.path.getsize(path) if os.path.exists(path) else 0
        if start + got > end:
            return
        req = urllib.request.Request(url, headers={**UA, 'Range': f'bytes={start + got}-{end}'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r, open(path, 'ab') as f:
                while True:
                    b = r.read(1 << 16)
                    if not b:
                        break
                    f.write(b)
        except Exception:
            time.sleep(3)


def fetch(f):
    url = f'https://huggingface.co/{REPO}/resolve/main/{f["path"]}'
    out = os.path.join(DEST, f['path'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    size = f['size']
    if os.path.exists(out) and os.path.getsize(out) == size:
        return
    if size < 20_000_000:
        if os.path.exists(out):
            os.remove(out)
        fetch_range(url, out, 0, size - 1)
    else:
        n = 6
        chunk = math.ceil(size / n)
        parts = [(i, i * chunk, min(size - 1, (i + 1) * chunk - 1)) for i in range(n)]
        ths = [threading.Thread(target=fetch_range, args=(url, f'{out}.part{i}', s, e)) for i, s, e in parts]
        for t in ths:
            t.start()
        for t in ths:
            t.join()
        with open(out, 'wb') as w:
            for i, _, _ in parts:
                with open(f'{out}.part{i}', 'rb') as p:
                    w.write(p.read())
                os.remove(f'{out}.part{i}')
    if os.path.getsize(out) != size:
        raise SystemExit(f'size mismatch for {f["path"]}')
    oid = (f.get('lfs') or {}).get('oid')
    if oid:
        h = hashlib.sha256()
        with open(out, 'rb') as r:
            for b in iter(lambda: r.read(1 << 22), b''):
                h.update(b)
        if h.hexdigest() != oid:
            os.remove(out)
            raise SystemExit(f'checksum mismatch for {f["path"]} (deleted; run again)')
    print('ok', f['path'], flush=True)


def main():
    files = listing()
    for f in sorted(files, key=lambda x: x['size']):
        fetch(f)
    print('model ready in', DEST, flush=True)


if __name__ == '__main__':
    main()
