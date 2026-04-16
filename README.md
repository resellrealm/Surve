# Surve — Creator × Hospitality Booking Platform

> **Book creators. Get content. Grow your brand.**

Surve is the marketplace that connects **TikTok, Instagram, and YouTube creators** with **hotels, restaurants, bars, resorts, and hospitality venues** for authentic content collaborations. Venues post paid listing opportunities, creators apply, and Surve handles payments, messaging, proof-of-delivery, and escrow — so both sides can focus on what they do best.

---

## App Store & Play Store

### Short Description (30 chars)

Book creators for your venue.

### Full Description

Surve is the all-in-one platform where hospitality brands discover and book content creators — and where creators find paid opportunities at the world's best venues.

**For Hotels, Restaurants & Venues:**
- Post content collaboration listings in minutes
- Browse vetted creator profiles with engagement metrics, niche tags, and portfolios
- Manage bookings, review proof-of-delivery, and release payment — all in one place
- Escrow-protected payments so you only pay for delivered content
- Real-time messaging with creators

**For Creators:**
- Discover paid hospitality gigs — hotels, rooftop bars, resorts, fine dining, and more
- Apply with one tap; get booked and paid through the app
- Submit proof of content, track earnings, and cash out via Stripe Connect
- Build your hospitality portfolio and get repeat bookings

**How It Works:**
1. **Venues** create a listing describing the content they need
2. **Creators** browse, filter, and apply to listings that match their niche
3. **Venue accepts** — payment is held in escrow
4. **Creator delivers** — uploads proof of published content
5. **Venue approves** — funds released (or auto-released after 72 hours)

**Key Features:**
- Secure escrow payments powered by Stripe
- In-app real-time messaging with typing indicators and read receipts
- Smart search with full-text filtering by location, category, budget, and niche
- Push notifications for bookings, messages, and payment updates
- Dispute resolution and refund workflow built in
- Two-factor authentication and biometric security (Face ID / fingerprint)
- Light and dark mode with premium spring animations
- Fully accessible — supports dynamic type, reduce motion, and screen readers

**Categories:** Travel, Food & Drink, Lifestyle, Social Media, Business, Influencer Marketing

### ASO Keywords

`creator booking, influencer marketing, hotel content creator, restaurant influencer, hospitality marketing, UGC platform, creator marketplace, venue booking app, TikTok creator jobs, Instagram influencer gigs, content collaboration, paid creator opportunities, hotel influencer, bar content creator, resort marketing, creator economy, hospitality influencer, social media booking, venue content, creator payments`

### Screenshots

| # | Screen | Description |
|---|--------|-------------|
| 1 | Home Feed | Browse trending hospitality listings near you |
| 2 | Search & Filters | Filter by location, category, budget, and creator niche |
| 3 | Listing Detail | See venue details, deliverables, and compensation |
| 4 | Creator Profile | Portfolio, engagement stats, reviews, and booking history |
| 5 | Booking Flow | Apply, get accepted, and track your booking status |
| 6 | Chat | Real-time messaging with read receipts and typing indicators |
| 7 | Checkout & Payments | Secure escrow checkout powered by Stripe |
| 8 | Earnings Dashboard | Track payouts, transactions, and lifetime earnings |

<!-- Replace with actual URLs after screenshots are uploaded to ASO tool / App Store Connect -->
<!-- Screenshot CDN URLs: TBD — upload 6.7", 6.5", and 5.5" sets to App Store Connect and Play Console -->

---

## Links

| Resource | URL |
|----------|-----|
| Website | [https://surve.app](https://surve.app) |
| Privacy Policy | [https://surve.app/legal/privacy](https://surve.app/legal/privacy) |
| Terms of Service | [https://surve.app/legal/terms](https://surve.app/legal/terms) |
| Support | [support@surve.app](mailto:support@surve.app) |
| Contact | [hello@surve.app](mailto:hello@surve.app) |

---

## Tech Stack

- **Frontend:** Expo (React Native) + TypeScript
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions + Realtime)
- **Payments:** Stripe (PaymentSheet + Connect)
- **Supabase project:** `qwlhqmynmrmmeakhhgny`
- **Design system:** `#2c428f` (blue) · white · black
- **Font:** Plus Jakarta Sans (via `@expo-google-fonts`)

---

## Quick start

```bash
# 1. Install
npm install --legacy-peer-deps

# 2. Configure env
cp .env.example .env
#    Fill in the keys — Supabase URL + anon key are required to even start the
#    app. Stripe keys only needed if you want the payment flows to fire.

# 3. Run
npx expo start
```

Type-check everything:

```bash
npx tsc --noEmit
```

Regenerate app icons from the master `assets/icon-nobg.png`:

```bash
python3 scripts/build-icons.py
```

---

## Architecture

```
src/
  app/                 Expo Router file-based routes
    (tabs)/            Bottom-tab root (home, search, bookings, messages, profile)
    auth/              Sign in / sign up / verify / forgot / 2FA challenge
    onboarding/        Welcome → role → creator/* or business/* multi-step
    (listing)/         Listing detail + create
    (creator)/         Creator public profile
    (booking)/         Booking detail, proof, dispute, refund
    (chat)/            1:1 conversation detail
    (payment)/         Checkout, saved methods, add card, success
    (profile)/         Edit, account, delete, preferences, support, about,
                       two-factor, verify-phone, saved-searches, change-password
    (review)/          Leave a review after a booking
    legal/             Terms, privacy, community, disputes, creator/business
  components/          Shared UI (ScreenHeader, Button, Avatar, EmptyState…)
  constants/theme.ts   Colours, Typography, Spacing, Shadows, Springs, Fonts
  hooks/               useTheme, useHaptics
  lib/
    api.ts             All Supabase queries + helpers (one file, easy to grep)
    store.ts           Zustand (auth, listings, bookings, messages, UI)
    supabase.ts        Client init
    sentry.ts          Crash reporting (no-op unless DSN set)
    biometric.ts       Face ID / Touch ID gate
    moderation.ts      DM profanity + off-platform-contact flag
    mockData.ts        Fallback dataset for empty-DB screenshots
  types/               Canonical domain types
supabase/
  functions/           Deno edge functions (deployed independently via MCP/CLI)
scripts/
  build-icons.py       Generates icon.png, adaptive-icon.png, splash-icon.png, favicon.png
```

### State + data flow

- **Auth:** `_layout.tsx` restores the session on mount and subscribes to `onAuthStateChange`. User profile is looked up in `public.users` and pushed into Zustand.
- **Lists (listings, bookings, messages):** `store.ts` holds the canonical data; tabs read from it. Pulling to refresh calls `fetchX()` again.
- **Realtime:** Chat screen subscribes to `messages` inserts and `message_reads` updates; typing is a broadcast-only channel so it never hits the DB.
- **Optimistic updates:** Messages are inserted locally with `msg-local-*` ids, then deduped against the server echo that arrives via realtime.
- **Mocks:** When the DB returns zero rows and `EXPO_PUBLIC_USE_MOCK_FALLBACK=true`, `lib/api.ts` substitutes `mockData.ts` so screens always populate (useful for screenshots).

### Payments

- **Escrow workflow:** 8 booking statuses (pending → accepted → in_progress → proof_submitted → completed / disputed / cancelled / refunded). Funds held by Stripe until proof approved or auto-released 72h after submission.
- **Edge functions** (Deno, `supabase/functions/`): `create-payment-intent`, `stripe-webhook`, `release-escrow`, `create-connect-link`, `auto-approve-bookings`, `send-push-notification`, `delete-account`, `process-refund`.
- **Cron jobs** (pg_cron): `expire_listings_hourly`, `remind_booking_deadlines_2h`, plus whatever `auto-approve-bookings` is scheduled for.

### Security

- **RLS:** every public table has row-level security on — users only see their own rows or rows they're a party to.
- **2FA:** TOTP via Supabase Auth MFA, required challenge on login when enabled.
- **Biometric gate:** Face ID / fingerprint prompt before account deletion or refund.
- **Moderation:** client-side first-line check in `lib/moderation.ts` (profanity + off-platform contact swap) with escalation to the `reports` table.

---

## Deploying edge functions

```bash
# Via Supabase CLI:
supabase functions deploy process-refund --project-ref qwlhqmynmrmmeakhhgny

# Secrets (set once, stored in the project):
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically in every edge function.

---

## App Store / Play Store submission

Before the first iOS submission:

1. **Email templates** — Auth → Email Templates in Supabase dashboard: edit "Confirm signup" and "Reset password" to use `{{ .Token }}` (8-digit code) rather than a link. The in-app OTP flow relies on this.
2. **Stripe keys** — paste live keys in `.env` and `supabase secrets set` them.
3. **Privacy manifest** — `ios/PrivacyInfo.xcprivacy` is already in place.
4. **Encryption** — `ios.config.usesNonExemptEncryption=false` is set in `app.json` (we use only Apple/HTTPS stock encryption).
5. **Account deletion** — surfaced in Profile → Account & Privacy → Delete account (Apple requirement).
6. **Sign in with Apple** — required if you add any third-party sign-in (Google, Facebook). Not needed yet.
7. **Screenshots** — 6.7", 6.5", 5.5" iPhone screenshots required. Use the demo creator login to pre-fill the app.
8. **Build + submit:**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

Before the first Android submission:

1. **Play Console → App content → Data safety** — match the categories in `PrivacyInfo.xcprivacy`.
2. **Target API level** — Expo SDK tracks this; bump Expo version before each submission window.
3. **Build:**
   ```bash
   eas build --platform android --profile production
   ```

---

## EAS Submit — Required Credentials

`eas.json` is pre-configured with submission profiles (`production` and `preview`) but contains **placeholder values** that must be replaced before running `eas submit`. Without these, submission will fail.

### iOS (App Store Connect)

Two placeholders in `eas.json` → `submit.production.ios` (and `submit.preview.ios`) must be replaced:

| Placeholder | What it is | Where to find it |
| ----------- | ---------- | ----------------- |
| `APPLE_APP_STORE_CONNECT_APP_ID` | Numeric App Store Connect app ID | App Store Connect → App Information → General → Apple ID |
| `APPLE_TEAM_ID` | Apple Developer team ID | [developer.apple.com/account](https://developer.apple.com/account) → Membership Details |

Update `eas.json` with the real values:

```jsonc
"ios": {
  "appleId": "astropodzx@gmail.com",
  "ascAppId": "1234567890",       // ← replace placeholder
  "appleTeamId": "ABCDE12345"     // ← replace placeholder
}
```

You will also be prompted for your Apple ID password (or an app-specific password) on first submission.

### Android (Google Play Console)

A Google Play service account JSON key is required. `eas.json` references it at `./google-service-account.json`.

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a service account with the **Service Account User** role.
2. Generate a JSON key for that service account.
3. In [Google Play Console](https://play.google.com/console) → **Settings → API access**, grant the service account access with **Release manager** permissions.
4. Save the key as `google-service-account.json` in the project root.

> **Do not commit `google-service-account.json`.** It is already in `.gitignore`.

### Running `eas submit`

```bash
# Submit the latest production build to both stores
eas submit --profile production --platform all

# iOS only
eas submit --profile production --platform ios

# Android only
eas submit --profile production --platform android

# Preview builds (TestFlight / internal track)
eas submit --profile preview --platform all
```

---

## Common ops

| Task | Command / Location |
| ---- | ------------------ |
| Start dev | `npx expo start` |
| Typecheck | `npx tsc --noEmit` |
| Run CEO agent queue (Surve completion) | `/root/automation/ceo-agent/` |
| Check advisors | Supabase dashboard → Database → Advisors (or via MCP `get_advisors`) |
| Apply migration | `supabase migration new <name>` + `supabase db push` (or via MCP) |
| Rebuild icons | `python3 scripts/build-icons.py` |

---

## Contributing conventions

- **Theme tokens only.** No hardcoded colours, spacings, fonts. Pull from `constants/theme.ts`.
- **Every `Pressable` gets haptic feedback.** Use `useHaptics()`.
- **Use `expo-image` for remote images.** Never `Image` from `react-native` for a URL.
- **Every stacked route uses `<ScreenHeader />`.** Don't roll your own back buttons.
- **Add to `api.ts`, not ad-hoc.** One file for Supabase queries; one place to audit.
- **Keep `tsc --noEmit` green.** Required gate before anything merges.

---

## License

Proprietary. Surve, Inc. all rights reserved.
