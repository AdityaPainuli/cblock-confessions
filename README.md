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
6. **Confess.** First time, say which block you study in and your course. That
   is remembered, so afterwards you go straight to writing, with a
   *You: B Block · MCA* chip you can tap to change it. No account needed.
7. **/admin.** Password-gated moderation, the submission log, and the site
   announcement banner.

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

## Who can do what

| | Anyone | Block wifi only |
|---|---|---|
| Read the wall | yes | |
| Post a confession | yes | |
| Heart / report | yes | |
| Read a reply thread | yes | |
| **Write a reply** | | **yes** |

Confessing is the point of the site, so the landing leads with it: a **Confess
something** button, with *or read the wall* underneath. Once a confession lands,
the confirmation offers to read everyone else's — writing first, reading second.

Replying is the one thing held back. A browser cannot read the wifi SSID, so
"are you on the block wifi" is answered by where the request comes from: that
network leaves through its own public addresses. Put those in
`COMMENT_IP_RANGES` (comma-separated CIDRs, IPv4 and IPv6) and only they can
reply. Leave it empty and anyone can.

To find the range: open `/admin` on that wifi. The network panel shows the
address the site sees.

What this buys, and what it does not:

- wifi passes, **mobile data does not** — that is the carrier's network;
- a VPN off the network fails, one back onto it passes;
- if the block shares an egress with the rest of campus, this is campus-wide in
  practice, because that is all an address can prove.

The address matcher is pure and covered by `npm test` — 27 cases including
non-byte-aligned prefixes, IPv4-mapped IPv6, family crossing and malformed
input.

## Announcements

The admin panel can put a banner on the site for an event, a deadline or
downtime. One is live at a time and publishing a new one retires the last.

- **info** is dismissible, and a reader who closes it still sees the next one.
- **alert** cannot be dismissed.
- An optional link is accepted only as `http(s)`, so a banner can never carry a
  `javascript:` or `data:` URL.

The banner sits in normal flow above the header rather than floating over it,
so nothing is ever covered. `GET /api/announcement` is public; writing needs the
admin session.

## Hearts and reports

One heart and one report per device per confession. The device key is the same
fingerprint hash the meta table stores: it identifies a browser profile, not a
person, and is used only to stop one reader voting repeatedly. The browser also
remembers its own votes in `localStorage` so the UI is honest before the round
trip, but the server is the one that decides.

At **3 reports** a confession flips to `pending` and leaves the wall until a
moderator looks at it. That threshold is `REPORT_THRESHOLD` in `src/lib/data.ts`
and the `cast_vote` function in the schema.

Writes are rate limited on the address **and** the device together, so spoofing
`X-Forwarded-For` does not hand the caller a fresh quota. A campus shares very
few public addresses, so the address limits are deliberately loose and the
device limits do the real work — one browser gets its own budget no matter who
else is on the wifi. Quotas live in `QUOTAS` in `src/lib/ratelimit.ts`:

| | per device | per address | window |
|---|---|---|---|
| post | 5 | 40 | 10 min |
| comment | 12 | 120 | 5 min |
| heart | 60 | 600 | 1 min |
| report | 10 | 120 | 1 min |

## Data collected

`confessions` holds the public text plus the wall it was posted to.
`confession_meta` holds the submission origin: the author's block and course,
IP, user agent, parsed device/OS/browser, screen and viewport, timezone,
language, CPU/RAM, GPU string, a derived device fingerprint, and IP-derived
city/region/country/coordinates.

It also holds **device GPS**, but only when the poster accepted the browser's
location prompt. That prompt is shown by the browser itself and cannot be
suppressed or bypassed — a refusal, or ignoring it, posts the confession
unchanged with no coordinates stored. Expect most people to refuse. The admin
panel marks which rows have it and links straight to a map; the rest fall back
to the IP estimate, which is city-level at best. That table has **zero** RLS policies, so the
public anon key cannot read it; only the server-side service-role key can.

This is personal data under India's DPDP Act 2023. The notice lives at
`/privacy` and is linked from the compose sheet and the wall.
