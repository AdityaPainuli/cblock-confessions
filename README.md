# C Block Confessions

Anonymous confession wall for C block, Galgotias University.
Next.js 16 + Supabase + react-three-fiber + Framer Motion.

## How it works

1. **Landing.** The university leads, not one block: *Galgotias University
   Confessions* over the campus.
2. **Campus stage.** A 3D Galgotias campus renders in WebGL, modelled from the
   university's own photography: cream sandstone blocks with ribbon glazing and
   red sandstone stair towers, barrel-vault roofs, the colonnaded main building
   with its pyramid roof, the axial water channel lined with red pylons, and the
   trabeated sandstone entrance gate.
3. **Swipe up** (or scroll, arrow-up, or the button) and the camera flies up
   and back into a near-plan view of the whole campus.
4. **Pick a block.** Four cards. C Block is open; A, B and D are under
   construction and cannot be selected. Choosing one flies the camera down to
   that building's entrance, and the panel waits for it to land.
5. **The wall.** Confessions arrive as a swipeable card deck. Right swipe
   hearts it, left swipe skips, the flag reports it. Sort by latest or top,
   filter by tag, and the next page loads before you reach the end.
6. **Confess.** Two steps: say which block you study in (and your course, if we
   have mapped that block yet), then write. No account needed.
7. **/admin.** Password-gated moderation plus the submission log.

## Camera flights

Moves between stages are flown, not cut. Each one starts from wherever the
camera actually is, eases in and out, and arcs upward through the middle so it
sweeps over the campus rather than clipping through a building. The UI holds
back until the flight lands (`FLIGHT_MS` in `src/lib/flight.ts`, shared by the
scene and the components that wait on it), and a caption names the destination
while the camera is still on its way.

Every block already has its own entrance view, so opening A, B or D later needs
no camera work.

## Performance

Everything is budgeted around a mid-range Android on campus wifi, because that
is what this actually gets read on.

`src/lib/useDeviceTier.ts` measures the device once per load and picks a tier:

| Tier | Who gets it | What renders |
|---|---|---|
| `high` | desktop GPU | full scene, shadows, all props |
| `medium` | capable phones | WebGL, no shadows, instanced props, dpr capped at 1.3 |
| `low` | weak devices, Data Saver, 2g, reduced-motion | SVG campus, **no three.js at all** |

The consequences of that:

- **three.js is a lazy chunk, 246 KB gzipped, and is never in the initial
  load.** Low-tier devices never request it.
- **The canvas stops rendering when it is not being looked at** — once the
  reader is in the feed, or the tab is hidden. The scene is almost fully veiled
  behind the feed anyway, and a phone should not burn battery drawing it.
- **Repeated props are instanced.** Palms, shrubs and pylons were dozens of draw
  calls a frame; they are now three.
- Lower tiers thin the props out rather than deleting them, so the campus keeps
  its shape on a phone.

Mobile handling: `dvh` units, `env(safe-area-inset-*)` padding for the notch and
home indicator, 16px inputs so iOS does not zoom on focus, touch targets at 40px
and up, `touch-action: pan-y` on the card so a swipe is never a page scroll, and
no horizontal page overflow at any width.

## Blocks

Every block can **send** a confession. Only blocks marked `receiving` can
**hold** one, and right now that is C Block alone. A, B and D read *under
construction* everywhere: greyed out in the chooser, and wrapped in scaffolding
with a crane on the campus model itself. C Block is the only finished building
on the site, which is the point.

The registry lives in one file, `src/lib/blocks.ts`. To open another wall, flip
`receiving` to `true` and fill in that block's courses:

```ts
{ id: "A", label: "A Block", receiving: false, note: "Coming soon", courses: [] },
```

C Block currently covers B.Tech, M.Tech, BCA and MCA. Course lists for the other
blocks are still being mapped, and until they are filled in the course step is
skipped for those blocks.

The author's block and course go to `confession_meta` (admin-only), never onto
the public card, so a confession cannot be narrowed down by where its author
studies.

Low-end phones and `prefers-reduced-motion` visitors get a flat SVG campus
instead of WebGL, decided once on mount.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the Supabase keys
```

Create a Supabase project, open **SQL Editor**, paste `supabase/schema.sql`,
run it. Then:

```bash
npm run dev
```

Admin panel: <http://localhost:3000/admin>

## Using a real campus model

Drop a `campus.glb` into `public/models/`. The scene detects it on load and
renders it instead of the procedural campus. Nothing else to change.

## Deploy

Push to GitHub, import into Vercel, paste the same four environment variables.
On Vercel the edge geo headers are used for location, so no external lookup is
needed.

## Hearts and reports

One heart and one report per device per confession. The device key is the same
fingerprint hash the meta table stores: it identifies a browser profile, not a
person, and is used only to stop one reader voting repeatedly. The browser also
remembers its own votes in `localStorage` so the UI is honest before the round
trip, but the server is the one that decides.

At **3 reports** a confession flips to `pending` and leaves the wall until a
moderator looks at it. That threshold is `REPORT_THRESHOLD` in `src/lib/data.ts`
and the `cast_vote` function in the schema.

Posting is rate limited on the address **and** the device together, so spoofing
`X-Forwarded-For` does not hand the caller a fresh quota.

## Data collected

`confessions` holds the public text plus the wall it was posted to.
`confession_meta` holds the submission origin: the author's block and course,
IP, user agent, parsed device/OS/browser, screen and viewport, timezone,
language, CPU/RAM, GPU string, a derived device fingerprint, and IP-derived
city/region/country/coordinates. That table has **zero** RLS policies, so the
public anon key cannot read it; only the server-side service-role key can.

This is personal data under India's DPDP Act 2023. Publish a privacy notice
before the site goes public.
