# The social layer

What fills the phone apps (Chirp, VibeGram, TokTalk, VibeNews): posts about
the artist, the regular internet, other artists, and what the artist posts
themselves, including their real photos.

## A feed has three lanes (`lanes.ts`)

| Lane | What | Made by |
|---|---|---|
| you | posts about the player: templates + the drama layer | `feedGenerator.ts`, `feedStream.ts`, `systems/drama` |
| everyday | memes, food, pets, sports, TV, weather, friends from home, the news, ads | `everyday.ts` + `data/social/everyday/` |
| celeb | other artists, their lovers and their haters | `celebFeed.ts` + `data/social/celebLines.ts` |

`feedMix(fans)` sets the shares: about 68/14/18 (everyday/celeb/you) for an
unknown, 35/25/40 for a superstar. The weekly feed keeps the player's posts and
adds lane posts around them (`laneCounts`); the infinite scroll splits each
page (`splitCount`). Lane posts carry `lane`, never ping as "about you"
(`notifications/select.ts`), never get AI rewrites, and their engagement comes
from the poster's own following (`laneEngagement`).

- **Everyday**: regular accounts (`ev-*` pages and people, `ad-*` brands) post
  in each app's format, following the world's year (`worldCalendar.ts`: week N
  of a game year is month N; finals, finales, the heatwave, the phone launch,
  Halloween, the holidays). World trends join the trend board with
  `world: true`, so they never boost the player's posts or streams.
- **Celeb**: the ten named artists (`data/artists/rivalArtists.ts`, with their
  own photos) are each linked to a world-engine artist (`linkNamed`, persisted
  in `socialStore.castLinks`), so the world's romances, breakups, collabs,
  feuds and scandals happen to them under their names. The world's biggest
  artists post as themselves (`npc-w-*` / `npc-m-*` accounts). Comments mix
  lovers and haters; under the player's rival, the player's fans show up (and
  the rival's fans drag the player back). Store glue: `celebContext.ts`.

## The artist's own posts (`postFromPhone.ts`)

One path for VibeGram (posts, carousels of up to 10, stories), Chirp (up to 4
photos) and TokTalk (photo mode): pick photos, caption, location (anything the
player types), share. Each post gives a small fan bump that shrinks with every
post in a day and never goes negative (`realPhotos.postBoost`).

**Real photos** (`deviceGallery.ts`, `realPhotos.ts`, `store/realPhotoStore.ts`):
the create flows show the phone's real Recents when the player shares them
(the permission dialog shows once; after a "no" the game's own roll is used,
with a row to allow access later). A posted photo is copied into the app's
private folder at 1080px and gets a `real…` key that every renderer resolves
through `photoIndex.photoByKey`. Copies no post uses are deleted on load;
retiring deletes them all. They never leave the phone.

## Nothing negative on a real photo, ever (`protect.ts`)

- `isProtected(post)`: the post carries a real photo.
- Its comments come only from `data/social/realPhotoComments.ts`: kind lines
  per photo kind (a dog gets dog lines, a meme meme lines), the caption's and
  location's lines, and, only when the phone couldn't tell what's in it,
  lines that fit any picture. No flirting, no haters, no rivals.
- `guardThread` runs last on every thread `generateThread` builds, replies
  included, and drops anything unvetted, from a hostile side, naming a rival,
  or carrying a negative word, so a future bug can't leak one. `isApproved`
  compares a line's words (`canon`): case, "sooo", "!!" and a kind emoji on the
  end don't matter, any other word does; `{thing}` only stands for the words
  in `THING_WORDS`, `{friend}` for a handle, `{n}` for a number.
- `reusable(post)` keeps protected posts out of embeds and AI rewrites. The
  drama DM arcs never comment on the player's posts; story replies
  (`talk/stories.ts`) do, with vetted lines only.
- Tests: `__tests__/protect.test.ts` runs the worst states (cancelled, peak
  scandal, rivals in the friends list) and fails on a single negative word.


## What a photo shows (`sense/`)

When the player posts, each photo is read on the phone so the comments fit
it: `modules/photo-sense` (Android, Google ML Kit through Play services:
image labels, face boxes, how much text sits on the picture; never the
words, never the picture) plus the file's name, folder and EXIF (a
screenshot, a WhatsApp save, the front camera). `sense/classify.ts` (pure)
turns that and the caption into a `PhotoRead`: selfie, fit, duo, group,
baby, pet, food, ride, travel, home, drip, money, scenery, city, party,
music, active, art, meme, screenshot, milestone, tech, or other, with the
specific `thing` ("dog", "sushi", "watch"). Photos from the game's own roll
are read from their tags. Reads are stored on the post (`media.reads`), so
its comments never change. Builds without the module read the caption and
the file only.

## Comment sections that talk back (`talk/`)

- `myThread.ts`: the comments under the artist's own posts. They fit what the
  post shows (`topic.ts` reads the photo reads and what the caption is
  doing: a question, an announcement, a joke...), arrive over real minutes
  on the same curve as the likes (`commentTimes`; the count fits the fame),
  and people reply to each other under them (`children`, "View 3 replies").
  Away from real photos the drama still follows the artist (haters who
  looked at the post, the scandal, rival fans, shippers), and admirers only
  show up where there's a person to admire.
- `voice.ts`: how people type (lowercase, CAPS, "sooo", "!!", a heart on the end).
- `conversation.ts` + `live.ts`: the artist's own comments and replies are
  kept (`socialStore.myComments`), and people answer them over the next
  minutes: the fan they replied to loses it, a hater doubles down or
  softens, the post's author answers (a brand, another artist, a rival, a
  starstruck stranger), and onlookers notice more the more famous the
  artist is. `notifyAnswers` pings the first answers.
- `stories.ts`: a story gets DM replies ("replied to your story") that fit
  what it shows; the artist can write back once and they answer.

## The real world (`systems/realworld/`)

The everyday lane also talks about what's actually happening in sports,
tech, games, science, space, wellness, luxury and cars (setting "Real-world
news & trends", on by default). `refresh.ts` reads public Google Trends and
Google News RSS for the player's country (from the time zone) every few
hours while the apps are open; `screen.ts` is default-deny: a story comes in
only when it clearly fits a light category and nothing in its headlines or
sources touches politics, religion, crime, deaths, illness, betting, gossip
or pile-ons. `topics.ts` names stories the way people do ("the Dodgers",
"Galaxy S27"), `posts.ts` makes the posts (news pages crediting the source,
people posting and quote-posting, TokTalk videos, VibeNews with the real
headline and a link to the real article), the comment threads and the trend
board entries. Offline, `data/realworld/seasonal.ts` keeps the calendar's
evergreen topics (playoff baseball, a meteor shower, fashion month). Nothing
the game writes about a real story claims more than its headline or says
anything about a real person.