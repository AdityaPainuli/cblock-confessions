# C Block Confessions

Anonymous confession wall for C block, Galgotias University.
Next.js 16 + Supabase + react-three-fiber + Framer Motion.

## How it works

1. **Campus stage.** A 3D Galgotias campus renders in WebGL, modelled from the
   university's own photography: cream sandstone blocks with ribbon glazing and
   red sandstone stair towers, barrel-vault roofs, the colonnaded main building
   with its pyramid roof, the axial water channel lined with red pylons, and the
   trabeated sandstone entrance gate.
2. **Swipe up** (or scroll, arrow-up, or the button) and the camera flies to the
   C Block entrance.
3. **The wall.** Confessions arrive as a swipeable card deck. Right swipe hearts
   it, left swipe skips.
4. **Confess.** Two steps: say which block you study in (and your course, if we
   have mapped that block yet), then write. No account needed.
5. **/admin.** Password-gated moderation plus the submission log.

## Blocks

Every block can **send** a confession. Only blocks marked `receiving` can
**hold** one, and right now that is C Block alone; A and B show *coming soon*
and D shows *under construction*, on the campus model and in the UI alike.

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

## Data collected

`confessions` holds the public text plus the wall it was posted to.
`confession_meta` holds the submission origin: the author's block and course,
IP, user agent, parsed device/OS/browser, screen and viewport, timezone,
language, CPU/RAM, GPU string, a derived device fingerprint, and IP-derived
city/region/country/coordinates. That table has **zero** RLS policies, so the
public anon key cannot read it; only the server-side service-role key can.

This is personal data under India's DPDP Act 2023. Publish a privacy notice
before the site goes public.
