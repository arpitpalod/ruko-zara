# Ruko Zara ✋ — "Kharidne se pehle, janta se poocho"

India's version of China's *Wallet, Please Wait*. Post a purchase you're about to make, explain why, and let strangers vote **Le le 👍 / Rehne de 👎** within 24 hours. Track how much you saved.

**Stack:** Expo (React Native, TypeScript, expo-router) → one codebase for Android + iOS. Supabase (Postgres + auth) for the backend.

## No laptop? Phone-only path

| Step | Who | Where |
|---|---|---|
| Backend: Supabase project + schema | Claude, via the Supabase connector | — |
| Code → public GitHub repo | Claude, once GitHub is connected to Claude | — |
| **Android:** APK download link | GitHub Actions (`.github/workflows/android-apk.yml`), on every push | `github.com/<you>/ruko-zara/releases/latest` |
| **iPhone:** TestFlight | You: Apple Developer ($99/yr), then open `launch.expo.dev/?github=<repo url>` → Sign in with Apple → Launch | TestFlight app |

The Android build reads the repo variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The iOS build reads the same values from `eas.json`. The anon key is meant to be public; the security rules in `schema.sql` protect the data.

## Run it in 2 minutes on a computer (demo mode, no backend)

```bash
npm install
npx expo start        # scan the QR with the Expo Go app on your phone
```

If there's no `.env`, the app runs on built-in demo data.

## Connect the real backend (~15 min)

1. Create a project at supabase.com. Pick the **Mumbai (ap-south-1)** region.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. Go to **Authentication → Sign In / Providers** and enable **Allow anonymous sign-ins**.
4. `cp .env.example .env`, then fill in the Project URL and anon key from **Project Settings → API**.
5. Run `npx expo start` again. Users now share one public feed.

## Ship to the stores

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android     # needs a Google Play developer account ($25 one-time)
npx eas-cli@latest build -p ios         # needs an Apple Developer account ($99/yr); no Mac needed
npx eas-cli@latest submit -p android    # / -p ios
```

Change `ios.bundleIdentifier` and `android.package` in `app.json` before your first build. They can't be changed after you publish.

## What's built

| Screen | What it does |
|---|---|
| **Chaupal** (feed) | Public requests, live vote bar, one-tap voting, pull to refresh |
| **Nayi Arzi** | Item, ₹ price, category, *why* (10+ characters required), cheaper alternative |
| **Arzi detail** | Full request, comments ("janta ki raay"), report + block buttons, auto-refresh every 5s |
| **Meri Arzi** | Your requests, mark "Nahi kharida / Kharid liya", total ₹ saved |

**What the backend enforces** (tested): you can't vote on your own request; one vote per person, which you can change until the request closes; you can't vote for someone else; owners can only change the outcome, not the price or text; 5 requests per user per day; anything reported 3 times is auto-hidden; blocking someone hides their requests and comments from you; each new user gets an anonymous handle like "Kanjoos Kabootar 42".

## Not built yet (suggested order)

1. **Push notifications** when votes and comments arrive (expo-notifications)
2. **Share to WhatsApp** ("Vote on my arzi")
3. **Phone OTP login** to upgrade anonymous accounts, which slows down fake-vote farms
4. **Moderation dashboard** + grievance officer contact (an IT Rules 2021 requirement for user-content platforms)
5. Photo of the item, Hindi/English toggle

## Project map

```
src/app/(tabs)/index.tsx   feed          src/lib/supabaseApi.ts  real backend
src/app/(tabs)/new.tsx     new request   src/lib/mockApi.ts      demo data
src/app/(tabs)/mine.tsx    my requests   src/lib/format.ts       ₹ formatting, timers
src/app/request/[id].tsx   detail        supabase/schema.sql     tables + security rules
```
