"""
Render people-specs.json on the AI Horde (https://aihorde.net), a volunteer
GPU network running open image models. Anonymous use is free but has the
lowest priority, so a full run takes hours: keep many jobs in flight and let
it work in the background. Safe to stop and restart at any time — finished
images are skipped and in-flight jobs are re-attached from the state file.

  py scripts/photos/people/generate_horde.py [--set big|small|all] [--concurrency 30] [--only KEY,KEY]

--set big (default) renders the photos shown large (plan.py). --set small
renders the crowd selfies and meme faces too: laptop-made ones (.png) get
replaced, but only after every photo nobody has made yet.

Writes scripts/photos/people/.raw/<key>.webp and .raw/log.jsonl (model,
worker and seed for every image, for the credits).
"""
import argparse
import json
import os
import random
import sys
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan import avatar_specs, big_specs, more_specs, small_specs  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '.raw')
STATE = os.path.join(RAW, 'inflight.json')
LOG = os.path.join(RAW, 'log.jsonl')
API = 'https://aihorde.net/api/v2'
def _key() -> str:
    """HORDE_API_KEY, else .raw/horde.key (git-ignored), else anonymous."""
    if os.environ.get('HORDE_API_KEY'):
        return os.environ['HORDE_API_KEY'].strip()
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.raw', 'horde.key'), encoding='utf-8') as f:
            return f.read().strip() or '0000000000'
    except OSError:
        return '0000000000'


HEADERS = {
    'apikey': _key(),
    'Content-Type': 'application/json',
    'Client-Agent': 'vibe-and-volumes-photo-pack:1.1:local',
    'User-Agent': 'vibe-and-volumes-photo-pack/1.0',
}
# Photoreal SDXL models whose licenses allow using the images commercially.
MODELS = ['ZavyChromaXL', 'ICBINP XL', 'Juggernaut XL', 'AlbedoBase XL (SDXL)', 'AlbedoBase XL 3.1']
# Lanes: model families a photo can come from, each with its own in-flight cap.
# The SDXL models are the busiest on the Horde (15-35 min waits at low kudos);
# the SD 1.5 photoreal ones sit nearly idle and do close-up phone
# photos well at 512 px, so the photos shown small go there; FLUX.1-schnell
# (Apache 2.0) helps both.
LANES = {
    'sdxl': MODELS,
    # Civitai lists commercial image use for each (checked 2026-10-03); more models = more workers.
    'sd15': ["ICBINP - I Can't Believe It's Not Photography", 'Realistic Vision', 'Photon', 'AbsoluteReality',
             'HRL', 'RealBiter', 'Neurogen'],
    'flux': ['Flux.1-Schnell fp8 (Compact)'],
}
# FLUX is off: on 2026-10-03 it waited as long as SDXL and looked over-sharpened.
LANE_CAP = {'sdxl': 14, 'sd15': 16, 'flux': 0}
JOB_TIMEOUT = 3 * 3600
MAX_TRIES = 4

_last_call = 0.0


def call(method, path, body=None, timeout=60):
    """One API call, never more than ~1.4 per second overall (the limit is 2)."""
    global _last_call
    wait = 0.7 - (time.time() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.time()
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read() or b'{}')


def log(msg):
    print(time.strftime('%H:%M:%S'), msg, flush=True)


def load_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def save_state(inflight):
    tmp = STATE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(inflight, f)
    os.replace(tmp, STATE)


def shown_large(spec):
    return spec['category'] in ('rival', 'scene') or bool(spec.get('admirer'))


def lanes_for(spec):
    return ['sdxl', 'flux'] if shown_large(spec) else ['sd15', 'flux']


def free_lane(spec, inflight, shared=True):
    """shared=False when only this kind of photo is left: its lane may use every slot."""
    for lane in lanes_for(spec):
        cap = LANE_CAP[lane] if shared or not LANE_CAP[lane] else 10**6
        if sum(1 for j in inflight if j.get('lane', 'sdxl') == lane) < cap:
            return lane
    return None


def payload(spec, seed, lane='sdxl'):
    w, h = spec['size']
    scene = spec['category'] == 'scene'
    prompt = f"{spec['prompt']} ### {spec['negative']}"
    params = {'sampler_name': 'k_dpmpp_2m', 'karras': True, 'cfg_scale': 5, 'steps': 30}
    if lane == 'sd15':
        # SD 1.5 is native at 512: same shape, smaller canvas (these are shown small).
        w, h = (512, 512) if w == h else (512, 640) if h > w else (640, 512)
        prompt = 'RAW photo, ' + prompt
        params.update(cfg_scale=6, steps=28)
    elif lane == 'flux':
        # Schnell is distilled: 4 steps and no CFG, so a negative prompt does nothing.
        prompt = spec['prompt']
        params = {'sampler_name': 'k_euler', 'cfg_scale': 1, 'steps': 4}
        if not shown_large(spec):
            w, h = (768, 768) if w == h else (640, 832)
    params.update({
        'width': w,
        'height': h,
        'n': 1,
        'seed': str(seed),
        # Small faces in group shots get a face restore; close-ups don't need one.
        'post_processing': ['CodeFormers'] if scene else [],
    })
    return {
        'prompt': prompt,
        'params': params,
        'nsfw': False,
        'censor_nsfw': True,
        'models': LANES[lane],
        'r2': True,
        'shared': False,
        'slow_workers': True,
        'trusted_workers': False,
    }


def submit(spec, tries, lane='sdxl'):
    seed = spec['seed'] if tries == 0 else random.randrange(1, 2**31 - 1)
    try:
        res = call('POST', '/generate/async', payload(spec, seed, lane))
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')[:200]
        log(f"submit {spec['key']} HTTP {e.code} {body}")
        return None, e.code
    except Exception as e:  # network hiccup
        log(f"submit {spec['key']} error {e}")
        return None, 0
    return {'id': res['id'], 'key': spec['key'], 'lane': lane, 'seed': seed, 'tries': tries, 'since': time.time(), 'next': time.time() + 30}, 200


def rebuild():
    """Put what's finished into the game (assets/people + manifest)."""
    try:
        import build_people_pack
        build_people_pack.main()
        log('people pack rebuilt')
    except Exception as e:  # never let packaging stop generation
        log(f'pack rebuild failed: {e}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--concurrency', type=int, default=30)
    ap.add_argument('--only', default='')
    ap.add_argument('--set', default='big', help='comma list of big, small, more, avatars (plan.py), or all')
    ap.add_argument('--log', default='', help='append output to this file (windowless runs)')
    ap.add_argument('--keep-awake', action='store_true', help='stop the PC idle-sleeping while this runs (off by default)')
    args = ap.parse_args()
    if args.log:
        f = open(args.log, 'a', encoding='utf-8', buffering=1)
        sys.stdout = f
        sys.stderr = f

    os.makedirs(RAW, exist_ok=True)
    specs = load_json(os.path.join(HERE, 'people-specs.json'), [])
    if args.only:
        keep = set(args.only.split(','))
        specs = [s for s in specs if s['key'] in keep]
    by_key = {s['key']: s for s in specs}
    done = lambda k: os.path.exists(os.path.join(RAW, f'{k}.webp'))

    inflight = [j for j in load_json(STATE, []) if j['key'] in by_key and not done(j['key'])]
    # The rivals, admirers and meme faces carry new features; everyday selfies can come last.
    order = {'rival': 0, 'reaction': 1, 'scene': 2, 'selfie': 3}
    ranked = sorted(specs, key=lambda s: (order.get(s['category'], 9) - (0.5 if s.get('admirer') else 0), s['key']))
    if not args.only:
        # Which photos (see plan.py). Missing ones first, then the laptop-made (.png) ones get replaced.
        sets = {'big': big_specs, 'small': small_specs, 'more': more_specs, 'avatars': avatar_specs}
        wanted = list(sets) if args.set == 'all' else args.set.split(',')
        keep = {s['key'] for name in wanted for s in sets[name](specs)}
        ranked = [s for s in ranked if s['key'] in keep]
        ranked.sort(key=lambda s: os.path.exists(os.path.join(RAW, f"{s['key']}.png")))
        by_key = {s['key']: s for s in ranked}
        specs = ranked
    queue = [s['key'] for s in ranked if not done(s['key']) and s['key'] not in {j['key'] for j in inflight}]
    log(f'{len(specs) - len(queue) - len(inflight)} done, {len(inflight)} in flight, {len(queue)} to go')
    if not queue and not inflight:
        return  # nothing to do (e.g. a logon-triggered resume after the run finished)
    if args.keep_awake and sys.platform == 'win32':
        # Opt-in (off by default): hold off idle sleep while running, since in-flight jobs
        # expire on the Horde during sleep. Windows drops this when the process exits.
        import ctypes
        ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001)  # ES_CONTINUOUS | ES_SYSTEM_REQUIRED
    backoff_until = 0.0

    while queue or inflight:
        now = time.time()
        # Top up the in-flight set: the next photo that has a lane with room.
        while queue and len(inflight) < args.concurrency and now >= backoff_until:
            shared = len({lanes_for(by_key[k])[0] for k in queue}) > 1
            pick = next(((i, k, lane) for i, k in enumerate(queue) for lane in [free_lane(by_key[k], inflight, shared)] if lane), None)
            if not pick:
                break
            i, key, lane = pick
            job, code = submit(by_key[key], 0, lane)
            if job:
                queue.pop(i)
                inflight.append(job)
                save_state(inflight)
            else:
                # 429 = slow down; 403 = the Horde is asking for kudos right now (busy); try later.
                backoff_until = time.time() + (30 if code == 429 else 300 if code == 403 else 60)
                break
            now = time.time()

        # Check the jobs that are due.
        for job in list(inflight):
            if time.time() < job['next']:
                continue
            spec = by_key[job['key']]
            try:
                chk = call('GET', f"/generate/check/{job['id']}")
            except urllib.error.HTTPError as e:
                job['misses'] = job.get('misses', 0) + 1
                if e.code == 404 and job['misses'] >= 3:  # really gone (expired on the Horde): start over
                    log(f"{job['key']} expired on the Horde after {round((time.time() - job['since']) / 60)} min; resubmitting")
                    inflight.remove(job)
                    queue.insert(0, job['key'])
                    save_state(inflight)
                else:
                    log(f"{job['key']} check HTTP {e.code} (miss {job['misses']})")
                    job['next'] = time.time() + 90
                continue
            except Exception:
                job['next'] = time.time() + 90
                continue

            if chk.get('faulted') or (time.time() - job['since'] > JOB_TIMEOUT and not chk.get('done')):
                try:
                    call('DELETE', f"/generate/status/{job['id']}")
                except Exception:
                    pass
                inflight.remove(job)
                if job['tries'] + 1 < MAX_TRIES:
                    nj, _ = submit(spec, job['tries'] + 1, job.get('lane', 'sdxl'))
                    if nj:
                        inflight.append(nj)
                    else:
                        queue.append(job['key'])
                log(f"{job['key']} faulted/timed out, retrying")
                save_state(inflight)
                continue

            job['misses'] = 0
            if not chk.get('done'):
                # Poll around the Horde's own estimate (10 s for the quick lanes, 2 min far back).
                pos = chk.get('queue_position') or 0
                job['pos'] = pos
                job['next'] = time.time() + min(120, max(10, chk.get('wait_time') or 45))
                continue

            try:
                st = call('GET', f"/generate/status/{job['id']}", timeout=90)
                gen = (st.get('generations') or [None])[0]
            except Exception as e:
                log(f"{job['key']} status error {e}")
                job['next'] = time.time() + 30
                continue
            inflight.remove(job)
            if not gen or gen.get('censored'):
                log(f"{job['key']} censored or empty, retrying with a new seed")
                if job['tries'] + 1 < MAX_TRIES:
                    nj, _ = submit(spec, job['tries'] + 1, job.get('lane', 'sdxl'))
                    if nj:
                        inflight.append(nj)
                    else:
                        queue.append(job['key'])
                save_state(inflight)
                continue
            try:
                req = urllib.request.Request(gen['img'], headers={'User-Agent': HEADERS['User-Agent']})
                with urllib.request.urlopen(req, timeout=120) as resp:
                    data = resp.read()
                with open(os.path.join(RAW, f"{job['key']}.webp"), 'wb') as f:
                    f.write(data)
            except Exception as e:
                log(f"{job['key']} download failed {e}; resubmitting")
                queue.insert(0, job['key'])
                save_state(inflight)
                continue
            with open(LOG, 'a', encoding='utf-8') as f:
                f.write(json.dumps({
                    'key': job['key'], 'model': gen.get('model'), 'worker': gen.get('worker_name'),
                    'seed': gen.get('seed', job['seed']), 'secs': round(time.time() - job['since']),
                }) + '\n')
            save_state(inflight)
            total_done = sum(1 for s in specs if done(s['key']))
            log(f"{job['key']} done in {round(time.time() - job['since'])}s via {gen.get('model')} ({total_done}/{len(specs)})")
            if total_done % 25 == 0:
                rebuild()

        if time.time() - globals().get('_last_status', 0) > 600:
            globals()['_last_status'] = time.time()
            poss = sorted(j.get('pos', -1) for j in inflight)
            log(f"status: {sum(1 for s in specs if done(s['key']))} done, {len(inflight)} in flight (queue positions {poss[:3]}..{poss[-3:]}), {len(queue)} waiting")
        time.sleep(2)

    log('all done')
    rebuild()


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
