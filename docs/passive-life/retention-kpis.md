# Retention KPI Recommendations

> Deliverable 5 of the brief. The metrics that tell us whether the passive
> scheduling loop and the monetization layer are working — and the guardrails
> that keep them healthy.

## North-star

**D7 retention** for this feature set. The whole loop (plan → leave → return to
a recap → re-plan) exists to make day-2 through day-7 returns automatic. If D7
moves, the loop works.

## Core retention funnel

| Metric | Definition | Target (directional) |
|---|---|---|
| D1 retention | % returning the next calendar day | 45–55% |
| D7 retention | % returning within 7 days | 22–30% |
| D30 retention | % returning within 30 days | 10–15% |
| Sessions / DAU | avg sessions per active day | ≥ 2.5 |
| Session length | median active seconds | 90–180s (snackable by design) |

The loop optimizes for **frequency over duration** — short, frequent,
curiosity-driven returns, not long grinds.

## Feature-specific leading indicators

These predict retention earlier than D7 and are the ones to instrument first:

- **Plan-set rate** — % of players who set/edit a plan in their first session.
  Target ≥ 70%. (Low → the Deck hook or planner clarity is failing.)
- **Recap-open completion** — % of "while you were away" recaps viewed to the
  "Catch Up" tap. Target ≥ 90%. (The recap is the payoff; it must always feel
  worth it.)
- **Return-with-recap rate** — % of returns that crossed `AWAY_REPORT_MIN_MS`
  and showed a recap. A proxy for "the absence felt rewarded."
- **Curiosity-trigger rate** — recaps containing ≥1 unexpected event / storyline
  beat. Target 35–55% of qualifying recaps. (Too low = boring; too high = noise.)
- **Storyline completion** — % of seeded storylines that reach their final step.
  Healthy if most complete within 3–5 returns.
- **Scheduled/community-event participation** — % of live windows where the
  player had the matching activity scheduled. Signals the calendar is read.

## Monetization KPIs (cosmetic-only)

| Metric | Definition | Notes |
|---|---|---|
| Cosmetic adoption | % of MAU who equip ≥1 owned cosmetic | Engagement, not spend |
| Earned-currency velocity | avg Vibes earned / active day | Keep the earnable path generous |
| Season pass engagement | % climbing ≥1 tier / season | Free-lane claims included |
| (Future) Conversion | % ever purchasing Vibes | Only meaningful once billing is enabled |
| (Future) ARPDAU | revenue / DAU | Track once live |

**Guardrail:** monetization must not move any *gameplay* metric. Compare progression
speed, fan growth, and money between spenders and non-spenders — they should be
statistically indistinguishable. If spenders progress faster, the anti-pay-to-win
guarantee has been violated and must be fixed before anything else.

## Health / anti-dark-pattern guardrails

- **No absence punishment.** Track that returning after a long gap never shows a
  *net negative* recap caused by the plan layer (fan drift can dip from low
  reputation, but the plan itself only adds). Watch sentiment on long-gap returns.
- **Cap integrity.** Alert if any resume's applied earnings/XP exceed the
  `passiveConfig` caps (would indicate a clamp regression).
- **Notification restraint.** Re-engagement pushes should be curiosity-led
  ("Your Co-Sign storyline advanced") not guilt-led ("You're falling behind").

## Instrumentation notes

Everything funnels through existing seams: XP/notify (`systems/live/notify.ts`),
the recap payload (`AwayReport`), and the stores. Add lightweight analytics
events at: plan edit, recap shown, recap dismissed, curiosity fired, cosmetic
purchased/equipped, season tier claimed. Keep them anonymous and offline-bufferable,
consistent with the community layer's no-PII stance.
