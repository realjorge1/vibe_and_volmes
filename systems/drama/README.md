# The drama layer

What the internet says about the artist, who slides into their DMs, the rival
war, and the scandals, embarrassing moments, good deeds and best nights that
follow them through the whole game.

## Pieces

| File | What it does |
|---|---|
| `types/drama.ts` | Moment, Take, DM thread/arc, BeefWar |
| `moments.ts` (pure) | Moment lifecycle: heat cools weekly by kind; the loud ones are "historic" |
| `discourse.ts` (pure) | What people talk about this week (topics: vibe, track, each live moment, the beef, romance, looks) and the mix of takes per topic. Fame grows haters with fans; reputation tilts the balance; unknown artists hear from critics first |
| `crowd.ts` (pure) | Seeded strangers whose name, handle and gender agree (`c-w-` / `c-m-` ids get a matching face) |
| `feedPosts.ts`, `feed.ts` | Composed takes → real feed posts (account, app, media, engagement via `computeEngagement`, so the fame relevance damping still applies) |
| `rivalWar.ts` (pure) | Public-opinion score per rival, escalation phases, what each rival move does |
| `dmEngine.ts` (pure) | Weekly inbox (busier with fame, romance capped to one opener per 2 weeks), follow-ups when ignored, resolving quick replies (stat-tilted rolls) |
| `publish.ts` | Store glue: build the discourse input; `spawnMoment` = headline + trend + reactions + VibeNews article + Chronicle entry |
| `dramaTick.ts` | Weekly heartbeat (in `weekEngine` step 5e, after the rivalry engine, before events and the feed) |

Content is data: `data/drama/` (takes, comments, crowd names, DM arcs),
`data/events/{moment,romance,war}Events.ts`, `data/life/dramaActivities.ts`.

## How the rest of the game feeds it

- Any event choice or activity outcome can carry `moment` (a MomentSpec) and
  `warSwing` (public opinion in the hottest rivalry); `consequenceApplicator`
  spawns/applies them.
- Event text can use `{rival}` (bound to the hottest rivalry; the event is
  only eligible when there is one).
- DM replies go through `playerReplyDm` (systems/simulation/playerActions):
  same consequence pipeline, plus structural effects (dating adds a partner
  to People with their face; flirting while taken sets `flirting-in-dms`,
  which the leak event watches).

## Where it shows

Phone apps (feed posts, memes, polls, comments, DMs in VibeGram/Chirp/TokTalk,
VibeNews articles), phone notifications (DMs), the Deck (week notes and
reply results), Life (Beef and Give back activities, faces in People),
Empire (the war tug-of-war and "the talk"), and the Chronicle.

Tests: `__tests__/drama.test.ts` (pure engines) and
`__tests__/drama.integration.test.ts` (through the real stores).
