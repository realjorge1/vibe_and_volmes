# Living World — NPC Life Engine

A **deterministic** simulation of a music-industry world. Celebrities, labels,
journalists, influencers, producers and fan communities live their lives —
releasing music, collaborating, feuding, dating, breaking up, signing deals,
touring, melting down, retiring — **independently of the player**.

The whole engine is **pure**: given a `WorldState` it returns a new
`WorldState`. It never touches wall-clock time or `Math.random`, so the same
seed always produces the same history. (Note: this is intentionally *separate*
from `utils/random.ts`, which uses `Math.random` for cosmetic, non-replayable
UI rolls.)

---

## Files

| File | Responsibility |
|------|----------------|
| `types/world.ts` | All interfaces/schemas: `Npc`, reputation, relationships, goals, finances, health, social, `WorldEvent`, `WorldState`. |
| `systems/world/rng.ts` | Deterministic PRNG (`Rng`, mulberry32) + `hash32` / `hashString` seed mixing. |
| `data/world/names.ts` | Deterministic, role-appropriate name/handle generation. |
| `systems/world/generateNpc.ts` | `generateNpc` + `generateWorld` (the example generation utilities). |
| `systems/world/reputation.ts` | Reputation drift, career-stage derivation, `opportunityScore`, fame curve. |
| `systems/world/relationships.ts` | Six-axis relationship math, status derivation, decay. |
| `data/world/npcEvents.ts` | The **weighted, state-conditioned event catalog** (data-driven). |
| `systems/world/worldEngine.ts` | The **weekly tick** (`simulateWeek` / `simulateWeeks`), cloning, summaries. |
| `store/worldStore.ts` | Thin Zustand shell over the pure engine (init / advance / save / load). |
| `systems/world/__tests__/worldEngine.test.ts` | Determinism, invariant, emergence & performance tests. |

---

## Quick start

```ts
import { generateWorld, simulateWeek, summarizeWorld } from '@/systems/world';

let world = generateWorld(12345);          // deterministic from the seed
for (let i = 0; i < 52; i++) {
  const { world: next, events } = simulateWeek(world);
  world = next;
  // `events` are this week's stories, biggest first — feed them to the
  // social feed / news ticker.
}
console.log(summarizeWorld(world));
```

Or via the store, alongside the existing weekly transition:

```ts
useWorldStore.getState().initWorld(12345);
// ...each in-game week, next to runPhase3Week():
const stories = useWorldStore.getState().advanceWeek();
```

---

## The data model

Every actor is one homogeneous `Npc` so the loop can iterate a flat array.
Role-specific fields live in `roleData`.

- **Identity / career**: `role`, `stage`, `genre`, `bornWeek`, `active`, `tags`.
- **Personality** (8 stable traits, 0-100): `ambition, ego, loyalty, volatility,
  openness, workEthic, warmth, pettiness`. These never change; they *bias* every
  decision.
- **Reputation** (5 independent axes, 0-100): `talent, authenticity,
  professionalism, marketability, influence`. Opportunities, fan reactions and
  media coverage each read these differently.
- **Relationships** (sparse map → six independent feelings): `friendship, trust,
  respect, attraction` (-100..100) and `resentment, rivalry` (0..100). Status
  (`friend`, `rival`, `dating`, `enemy`, …) is *derived* from the numbers,
  except sticky life-event statuses (dating/ex/mentor/collaborator).
- **Goals / Finances / Health / Social**: drive and gate behavior and provide
  the pressures that make scandals, burnout and comebacks emerge.

Relationships are stored **sparsely** (each NPC only keeps edges to people it
actually knows), so memory is `O(actors × avg-degree)` rather than
`O(actors²)` — this is what makes thousands of NPCs affordable.

---

## The simulation loop

`simulateWeek(prev)` clones the world, advances `week` by 1, then for **each
active NPC** (in stable `npcIds` order):

```
weekSeed = hash32(seed, week)
for npcIndex, npc in npcs:
    rng = new Rng(hash32(weekSeed, npcIndex))     # per-NPC deterministic stream

    1. livePassively(npc, rng, week)              # the slow tide
         - momentum mean-reverts toward 0
         - controversy heat cools
         - health: touring/output burn vs. rest/treatment recovery
         - finances settle (income tracks reach, minus burn)
         - reputation drifts toward a personality-driven equilibrium
         - neglected relationships decay toward neutral
         - finished goals retire; everyone keeps chasing something

    2. runEvents(ctx)                             # the active life
         - gather role events whose condition() passes & cooldown elapsed
         - up to MAX_EVENTS_PER_NPC weighted rolls, plus a large
           "nothing happens" weight so the world doesn't over-fire
         - each chosen event's apply() mutates the world & emit()s a story

    3. npc.stage = careerStageFor(npc)            # re-derive from new numbers
```

Finally the week's events are sorted by magnitude and prepended to a bounded
rolling log (`world.events`, capped at 300), and the new world + the week's
events are returned.

### Why events are *emergent*, not random

Each catalog entry is data plus three pure functions:

- `condition(ctx)` — is this even possible right now? (e.g. a **diss-track**
  requires an existing edge with `rivalry > 40`).
- `weight(ctx)` — how likely, given **current state**? A petty, big-ego artist
  sitting on a hot rivalry has a far higher diss-track weight than a warm,
  collaborative one. Burnt-out NPCs trend toward `mental-crisis`; declining ones
  toward `comeback` or `retirement`.
- `apply(ctx)` — mutate the world (stats, relationships, finances, health,
  goals) and emit one or more `WorldEvent`s.

So a feud isn't rolled from nowhere: it grows out of personality + history +
momentum, then feeds back into reputation, mental health and future eligibility.

---

## Determinism guarantees

- `generateWorld(seed, config)` is a pure function of its arguments.
- `simulateWeek` / `simulateWeeks` are pure; the input world is never mutated
  (enforced by a purity test).
- Per-NPC randomness is `hash(seed, week, npcIndex)`, so NPC processing is
  **order-stable** and safe to batch or shard.
- A pinned 52-week checksum test locks the engine's behavior; an intentional
  change re-captures it from the test log.

Run the suite:

```bash
npm test            # all engine tests
npm run test:world  # just the world engine
```

---

## Performance

- One homogeneous array, sparse relationships, no per-NPC closures in the hot
  path, integer-hash seeding (no allocation-heavy RNG reseeding).
- Target-finding samples a handful of random NPCs instead of scanning the whole
  population.
- Measured: **~3,400 NPCs simulated in ~110 ms per week** on a dev laptop
  (see the `perf` test). The dominant cost is the weekly deep clone that keeps
  the function pure; if you ever need more headroom, the clone is the first
  thing to optimize (e.g. structural sharing of unchanged NPCs).

---

## Extending the world

- **New kind of story?** Add a `NpcEventDef` to `NPC_EVENTS` in
  `data/world/npcEvents.ts`. No engine changes needed — it's auto-indexed by
  role and picked up by the next tick.
- **New actor type?** Add it to `NpcRole`, give it a branch in `generateNpc`
  and `data/world/names.ts`, and add events that list the role.
- **Tune the vibe?** The knobs live at the top of `worldEngine.ts`
  (`MAX_EVENTS_PER_NPC`, the "nothing happens" weights, the log cap) and inside
  each event's `weight()`.
