# C Block Confessions

Anonymous confession wall for C block, Galgotias University.
Next.js 16 + Supabase + react-three-fiber + Framer Motion.

## How it works

1. **Campus stage.** A 3D Galgotias campus renders in WebGL: main colonnaded
   building, A/B blocks, and a glowing C Block down the walkway.
2. **Swipe up** (or scroll, arrow-up, or the button) and the camera flies to the
   C Block entrance.
3. **The wall.** Confessions arrive as a swipeable card deck. Right swipe hearts
   it, left swipe skips.
4. **Confess.** Anyone can post without an account.
5. **/admin.** Password-gated moderation plus the submission log.

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

`confessions` holds the public text. `confession_meta` holds the submission
origin: IP, user agent, parsed device/OS/browser, screen and viewport, timezone,
language, CPU/RAM, GPU string, a derived device fingerprint, and IP-derived
city/region/country/coordinates. That table has **zero** RLS policies, so the
public anon key cannot read it; only the server-side service-role key can.

This is personal data under India's DPDP Act 2023. Publish a privacy notice
before the site goes public.
