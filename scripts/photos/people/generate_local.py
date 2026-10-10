"""
Generate the SMALL people photos on this machine (crowd selfies used as
avatars, meme reaction faces) with an open model (LCM Dreamshaper v7, int8,
OpenVINO): no account, no service. Every face is synthetic. The big photos
(rivals, admirers, scenes) come from the AI Horde instead (generate_horde.py).
Resumable: finished images are skipped.

  py scripts/photos/people/fetch_model.py          # once, ~1.1 GB
  py -m pip install openvino-genai pillow
  py scripts/photos/people/generate_local.py [--only KEY,KEY] [--log FILE]

Writes .raw/<key>.png and appends to .raw/log.jsonl.
"""
import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '.raw')
MODEL = os.path.join(RAW, 'models', 'lcm-dreamshaper-int8')
LOG = os.path.join(RAW, 'log.jsonl')
sys.path.insert(0, HERE)
from plan import small_specs  # noqa: E402


def short_prompt(spec: dict) -> str:
    """SD 1.5 reads ~75 tokens: photo cue first, then who and what. This model
    ignores negative prompts, so realism and modesty are asked for up front."""
    p = spec['prompt']
    p = p.replace(', amateur smartphone photo, candid, natural light, realistic skin texture, sharp focus on face, authentic social media photo', '')
    p = p.replace(', photorealistic, sharp focus on face', '').replace(', photorealistic', '')
    return f'RAW photo, {p}, fully clothed, natural skin texture, film grain, shot on a phone camera'


def size_for(spec: dict) -> tuple:
    w, h = spec['size']
    if w > h:
        return 640, 512
    if w == h:
        return 512, 512
    return 512, 640


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--steps', type=int, default=4)
    ap.add_argument('--log', default='', help='append output to this file (windowless runs via pythonw)')
    args = ap.parse_args()
    if args.log:
        f = open(args.log, 'a', encoding='utf-8', buffering=1)
        sys.stdout = f
        sys.stderr = f

    import openvino_genai as ov_genai
    from PIL import Image

    specs = json.load(open(os.path.join(HERE, 'people-specs.json'), encoding='utf-8'))
    todo = [s for s in specs if s['key'] in set(args.only.split(','))] if args.only else small_specs(specs)
    done = lambda k: any(os.path.exists(os.path.join(RAW, f'{k}.{ext}')) for ext in ('png', 'webp', 'jpg'))
    todo = [s for s in todo if not done(s['key'])]
    print(f'{len(todo)} to generate', flush=True)
    if not todo:
        return

    t0 = time.time()
    pipe = ov_genai.Text2ImagePipeline(MODEL, 'CPU')
    print(f'model ready in {time.time() - t0:.0f}s', flush=True)
    for i, spec in enumerate(todo):
        w, h = size_for(spec)
        t0 = time.time()
        tensor = pipe.generate(
            short_prompt(spec),
            width=w,
            height=h,
            num_inference_steps=args.steps,
            guidance_scale=8.0,
            rng_seed=int(spec['seed']) % (2**31 - 1),
        )
        Image.fromarray(tensor.data[0]).save(os.path.join(RAW, f"{spec['key']}.png"), optimize=True)
        with open(LOG, 'a', encoding='utf-8') as f:
            f.write(json.dumps({'key': spec['key'], 'model': 'LCM_Dreamshaper_v7-int8-ov (local)', 'seed': spec['seed'], 'secs': round(time.time() - t0)}) + '\n')
        print(f"{i + 1}/{len(todo)} {spec['key']} {w}x{h} in {time.time() - t0:.0f}s", flush=True)
        if (i + 1) % 25 == 0 or i + 1 == len(todo):
            rebuild()


def rebuild():
    """Put what's finished into the game (assets/people + manifest)."""
    try:
        import build_people_pack
        build_people_pack.main()
        print('people pack rebuilt', flush=True)
    except Exception as e:  # never let packaging stop generation
        print(f'pack rebuild failed: {e}', flush=True)


if __name__ == '__main__':
    main()
