# marketing-assets

Not part of the app. This branch holds Instagram Reels for @rukozara.app and the code that posts them.

- `reels/` - rendered videos. The `ig-publisher` Edge Function fetches them from raw.githubusercontent.com and uploads them to Instagram.
- `autoposter/make_reel.py` - renders a Reel from a JSON scene spec (`week1.json`).
- `autoposter/ig-publisher.ts` - the deployed Supabase Edge Function (source of truth is Supabase; this is a copy).

Queue: `public.ig_queue` in Supabase (private, service role only). Pause everything: `update public.ig_settings set enabled = false;`

## Format (from 28 Nov 2026): "Gullak reacts"
Daily Reels use the Gullak mascot: `python3 autoposter/gullak_reel.py spec.json out.mp4` (needs `mascots.py` next to it).
Spec examples with captions: `autoposter/gullak_week1.json`. The older text-only renderer (`make_reel.py`, `week1.json`) is kept for reference.
