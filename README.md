# Vibe & Volumes

A text-first music career life sim for iOS and Android. You play one artist from
open mics to legacy: every tap of **Advance** is one in-game week, every week
brings decisions, and everything you do lands as a line in your career story.
The flow is BitLife's (one clock, one button, a situation on every tap); the
depth is the game's own — a recording Studio, a label/tour/PR industry, a living
world of NPC artists, shifting culture eras and a fake internet that reacts to
you.

Built with Expo (React Native), Expo Router, Zustand and SQLite. The whole sim
runs on the device; the optional backend only proxies AI text and community
charts.

## Run it

```bash
npm install          # .npmrc sets legacy-peer-deps; see the note in that file
npm run android      # dev build (recommended) — or: npm run ios
npx expo start       # Expo Go also works; the Studio falls back to expo-audio
```

The Studio's live DJ effects use `react-native-audio-api`, which only exists in
a dev or release build. In Expo Go the Studio still plays and records through
`expo-audio`, without the effects.

## Test it

```bash
npx tsc --noEmit     # typecheck
npm test             # every systems/**/__tests__/*.test.ts, via node:test + tsx
```

Tests cover the pure engines (charts, career stages, the NPC world, the daily
plan, the premium catalog, social). Put new tests under
`systems/<area>/__tests__/` so `npm test` picks them up.

## Backend (optional)

```bash
npm run backend      # Express on :8787, see backend/README.md
```

The app is fully playable without it: AI text falls back to local templates and
community charts to bundled data.

## Where things live

| Path | What |
| --- | --- |
| `app/(game)/` | The tabs: Deck (the week loop), Studio, Social, Life, Empire |
| `app/*.tsx` | Onboarding and the modals (stats, chronicle, plan, store…) |
| `systems/weekEngine.ts` | `runWeekTransition`: the weekly heartbeat every system hangs off |
| `systems/` | Pure engines, one folder per area (events, charts, world, culture…) |
| `systems/simulation/` | The shared weekly influence bundle and player-action layer |
| `store/` | Zustand stores, one per area, each with `load` / `save` / `reset` |
| `data/` | Content as data: events, archetypes, beats, eras, catalogs |
| `types/` | Shared types |
| `database/` | SQLite save slots (`save_data`) plus the cross-save meta profile |
| `ai/` | Optional AI text layer over the deterministic sim |
| `audio/` | Studio playback, recording, FX and scoring |

## Rules for new features

1. **One clock: the week.** No new real-time clocks.
2. **If it doesn't show up in the story, it doesn't ship.** Every action writes
   a line into the Deck.
3. **Big moments reach the internet** — the social feed and the Chronicle.
4. **Mechanics go through the pipeline** (`systems/simulation/`); UI never
   writes stats directly.
5. **Content is data.** New events, activities or endings are rows in `data/`.
6. **One economy.** Every money source is capped.
7. **Snackable sessions** — median 90–180 s; the Studio is the opt-in exception.
8. **Cosmetic-only store** (`docs/passive-life/monetization-framework.md`).

Regenerate the bundled beats with `node scripts/generate-beats.mjs`.
