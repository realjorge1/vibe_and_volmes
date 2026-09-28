# Monetization Framework

> Deliverable 4 of the brief. A premium layer that funds the game through
> cosmetics, identity, and convenience — and is *structurally incapable* of
> pay-to-win.

## Philosophy

1. **Never sell power.** No item grants stats, fans, money, yield, extra plan
   slots, or higher beat quality. The simulation's integrity is the product.
2. **Sell identity, expression, and convenience.** Studio themes, beat-pack
   variety, vanity flair, a season pass, and quality-of-life toggles.
3. **Earnable-first.** The premium currency ("Vibes") is earned by playing;
   buying it is optional acceleration, never a gate.
4. **Offline-honest.** There is no real billing in this build. The store seam is
   stubbed and disabled, mirroring the disabled-cloud sync discipline.

## The structural anti-pay-to-win guarantee

`types/premium.ts#CosmeticItem` has **nowhere to put power** — its only fields
are `themeColor`, `beatPackIds`, and `convenience`. A unit test
(`systems/premium/__tests__/catalog.test.ts`) asserts no catalog entry exposes a
banned field (`stat/fans/money/quality/xp/boost/...`) and that premium beats stay
inside the free quality band. Pay-to-win is impossible by construction, not by
policy.

## Currency: "Vibes"

Soft premium currency. Sources (all in-game):
- **Starter grant** (`PREMIUM_STARTER_GRANT = 250`) on first launch.
- **Daily plan resumes** — a small bounded grant per resolved absence
  (`systems/live/liveTick`).
- **Season pass** free + premium lanes.
Real-money packs are defined (`systems/premium/billing.ts#CURRENCY_PACKS`) and
shown as **"Coming soon"** while billing is disabled.

## Catalog (`data/premium/catalog.ts`)

| Category | Examples | What it does |
|---|---|---|
| Studio theme | Sunset, Emerald, Vapor, Gold | Recolors the studio accent only |
| Beat pack | After Hours, Main Stage | Adds cosmetic instrumental variety (free-band quality) |
| Vanity | Blue Spark, Crown, Icon Aura | Profile/deck flair |
| Convenience | Auto-Plan, Recap Flair, Cloud Backup | Quality-of-life toggles |
| Season pass | Premium Track unlock | Unlocks the premium reward lane |

Pricing ramps from ~120 (small vanity/convenience) to ~600 (season pass), tuned
so a regular player can earn meaningful cosmetics over a few sessions while
whales can buy breadth.

## Season pass (`systems/premium/seasonPass.ts`)

A 7-tier track (`CURRENT_SEASON`). XP is earned purely by playing (granted on
resume). Two lanes: a **free** lane (currency + a vanity) and a **premium** lane
(unlocked by the `season-pass-premium` cosmetic) granting themes, packs, and
vanity. Rewards are validated to be cosmetic/currency only (unit-tested). A new
season resets progress (`premiumStore.ensureStarter` rollover) but never revokes
owned cosmetics.

## Persistence (the key architectural decision)

Entitlements are **account-level** — you keep what you "paid for" across careers.
They live in a dedicated `premium_account` SQLite table
(`database/db.ts`, `savePremium`/`loadPremium`), which `clearAllData` (retirement
/ new game) deliberately does **not** touch — exactly like `meta_profile`.
`store/premiumStore.ts` therefore has **no `reset()`** and self-saves on every
mutation.

## Billing seam (`systems/premium/billing.ts`)

`getBillingAdapter()` returns a local no-op (`localBilling`) unless a real store
SDK is wired and `storeBilling.online` is flipped (hard-disabled today). The game
never charges, never blocks on a store, and behaves identically with or without a
backend. Enabling real IAP later is "implement the adapter + flip `online`" —
and even then it only ever sells the soft currency.

## Surfaces

`app/store-modal.tsx` — wallet, a Shop / Season / Get-Vibes segmented control,
category-grouped catalog with owned/equip/affordable states, the season track,
and the "coming soon" currency packs. Studio themes apply live in
`app/(game)/studio.tsx`; owned beat packs merge into the picker
(`app/(create)/beat.tsx`).
