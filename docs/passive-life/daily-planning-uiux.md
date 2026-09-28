# Daily Planning — UI/UX Specification

> Deliverable 1 of the Passive Life Scheduling & Monetization brief. Describes
> the planning surface that lets players set a routine the simulation executes
> automatically while they're away.

## Goal

Make "what should I do today?" a 10-second, satisfying decision that pays off
the *next* time the player opens the app. Planning is the daily-return hook; it
must be fast, legible, and never punishing.

## Mental model

- The world sim is **weekly**. The plan layer adds a **real-time "day"** on top:
  a repeating list of **activity slots** (`SLOTS_PER_DAY = 4`, one slot ≈ 1.5h of
  wall-clock time — see `constants/passiveConfig.ts`).
- The plan is a **routine**, not a calendar. You set it once; it repeats and
  resolves whenever you've been away (see the away-sim spec).
- Planning **never costs energy**. Energy only gates active, in-session actions
  (recording, quick-drop). This honors the brief's "don't punish absence" rule.

## Surfaces

### Deck hero card (`app/(game)/index.tsx`)
A single tappable "Daily Plan" card showing the current routine as a summary
(`Studio · Be Online · Fitness · Rest`). One tap → the planner. Two adjacent
quick-link cards open the **Store** and **Community**.

### Planner screen (`app/plan-modal.tsx`)
Top-to-bottom:
1. **Header + one-line rationale** — "Set a routine. While you're away, your
   days play out automatically." Reassures that planning is free.
2. **Upcoming strip** — the next 3 scheduled world events
   (`projectScheduledEvents`) + active community events, each with a
   `LIVE` / `in 2d 4h` chip. This is the curiosity bait ("Festival in 3 days —
   schedule Networking").
3. **Slot row** — `SLOTS_PER_DAY` slot chips. The focused slot is outlined in
   accent; each filled slot shows its activity icon + label + a `clear` affordance.
4. **Activity picker** — one card per activity (`data/passive/activities.ts`):
   icon, label, and a plain-language `effectHint` ("Slowly raises writing &
   vocal skill. High chance of studio moments."). Locked activities show
   `Lv N` and are dimmed until the career level unlocks them.
5. **Auto-Plan** — a premium *convenience* (not power): one tap fills a balanced
   routine. Shown with a `✦` and routed to the Store when not owned.

## Interaction model

- **Tap a slot** to focus it; **tap an activity** to assign it and auto-advance
  focus to the next slot. This makes filling all four slots a quick left-to-right
  sweep.
- **Clear** removes an activity (an empty slot resolves as neutral — the world
  still drifts, you just didn't grind).
- All edits persist immediately via `planStore.setSlot` (save key `'plan'`).

## Activity catalog (shipped)

| Activity | Unlocks at | Tends to… |
|---|---|---|
| Studio Work | Lv 1 | writing/vocal skill; high studio-moment chance |
| Songwriting | Lv 1 | writing/creativity |
| Be Online | Lv 1 | passive fans/charisma; most likely to spark drama/buzz |
| Fitness | Lv 1 | energy + discipline/mental health |
| Rest & Recover | Lv 1 | the most energy + mental health, no grind |
| Promotion | Lv 2 | a little money + passive fan growth |
| Networking | Lv 3 | industry respect; warms up relationships |
| Press & Media | Lv 5 | money + reputation/charisma |

Add an activity = append one row to `data/passive/activities.ts`. Effect
profiles are per-slot ranges; the engine clamps the accumulated totals.

## States to handle

- **No routine set** → Deck card reads "No routine set"; recap still narrates the
  world, and prompts "set one in Daily Plan".
- **Locked activity** → dimmed, `Lv N`, non-selectable.
- **Fresh career** → starter routine pre-filled (`Studio · Be Online · Fitness ·
  Rest`) so the first absence already produces a recap.

## Accessibility / tone

Tesla-OS design language: pure-black canvas, one electric-blue accent, flat
hairline surfaces, large legible labels (`components/ui/*`). Copy is candid and
non-nagging — the plan is an opportunity, never a chore or a debt.
