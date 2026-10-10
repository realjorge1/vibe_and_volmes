"""
Which photos make up each set.

  big   (~70): shown large — every rival, admirers, one or two of every scene
  small (~146): shown small — crowd selfies (avatars), meme reaction faces
  more  (80):  the next picks of both kinds, for 300 in all
  avatars (80): more everyday faces, only for profile pictures

All render on the AI Horde (generate_horde.py --set big,small,more,avatars). The laptop
generator (generate_local.py) made the first small ones; it was too slow and
looked CGI, so the Horde replaced them and its OpenVINO packages and model were
uninstalled (it won't run without them).
"""


def big_specs(specs: list) -> list:
    rivals = [s for s in specs if s['category'] == 'rival']
    women = [s for s in specs if s['category'] == 'selfie' and s.get('admirer') and s['gender'] == 'woman'][:12]
    men = [s for s in specs if s['category'] == 'selfie' and s.get('admirer') and s['gender'] == 'man'][:12]
    scenes, seen = [], set()
    for s in specs:
        if s['category'] == 'scene' and s['scene'] not in seen:
            scenes.append(s)
            seen.add(s['scene'])
    # A second take of the scenes the feed leans on most.
    extra = ('paparazzi-hoodie', 'couple-selfie', 'concert-scream', 'friends-selfie')
    for s in specs:
        if s['category'] == 'scene' and s['scene'] in extra and s not in scenes and sum(1 for x in scenes if x['scene'] == s['scene']) < 2:
            scenes.append(s)
    return rivals + women + men + scenes


def small_specs(specs: list, selfies: int = 110, reactions: int = 36) -> list:
    picked_reactions = [s for s in specs if s['category'] == 'reaction'][:reactions]
    picked_selfies = [s for s in specs if s['category'] == 'selfie' and not s.get('admirer')][:selfies]
    # Interleave so both kinds fill in from the start.
    out = []
    for i in range(max(len(picked_reactions), len(picked_selfies))):
        out += picked_reactions[i:i + 1] + picked_selfies[i:i + 1]
    return out


def more_specs(specs: list) -> list:
    """The next 80, taking big + small (220) to 300: more takes of the scenes
    (round-robin, so every scene gets variety), admirers, meme faces and crowd."""
    used = {s['key'] for s in big_specs(specs) + small_specs(specs)}
    left = [s for s in specs if s['key'] not in used]
    by_scene = {}
    for s in left:
        if s['category'] == 'scene':
            by_scene.setdefault(s['scene'], []).append(s)
    scenes = []
    while len(scenes) < 30 and any(by_scene.values()):
        for group in by_scene.values():
            if group and len(scenes) < 30:
                scenes.append(group.pop(0))
    admirers = []
    for g in ('woman', 'man'):
        admirers += [s for s in left if s['category'] == 'selfie' and s.get('admirer') and s['gender'] == g][:8]
    reactions = [s for s in left if s['category'] == 'reaction'][:20]
    crowd = [s for s in left if s['category'] == 'selfie' and not s.get('admirer')][:14]
    return scenes + admirers + reactions + crowd


def avatar_specs(specs: list, per_gender: int = 40) -> list:
    """80 more everyday faces, just for profile pictures (built small)."""
    used = {s['key'] for s in big_specs(specs) + small_specs(specs) + more_specs(specs)}
    out = []
    for g in ('woman', 'man'):
        out += [s for s in specs if s['category'] == 'selfie' and not s.get('admirer') and s['gender'] == g
                and s['key'] not in used][:per_gender]
    return out
