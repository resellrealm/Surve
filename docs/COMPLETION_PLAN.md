# Surve — Completion Plan

Everything required to ship Surve publicly. Items are tagged by priority:
- **P0** = must-have for launch
- **P1** = should-have (add within 2 weeks of launch)
- **P2** = nice-to-have

The task queue at `/root/automation/ceo-agent/surve-queue.json` breaks each P0 item into atomic sub-tasks the CEO agent executes autonomously.

---

## Interaction Model — How Surve Works

**Business pays us → Creator proves work → We pay creator.**

1. **Business** posts a listing describing the collab (pay range, platform, content type, deadline).
2. **Creator** applies. Business reviews applications in-app.
3. Business **accepts** one → creates a **Booking**. Business is charged via Stripe and funds are **held in escrow** (platform wallet). No money has left our account yet.
4. Creator creates the agreed content off-platform (TikTok, Instagram, etc.).
5. Creator **submits proof** in-app: the live URL + optional screenshots/video. Booking status → `proof_submitted`.
6. Business reviews proof.
   - **Approves** → booking marked `completed` → Stripe transfers funds to creator's Stripe Connect account (minus 5% platform fee).
   - **Disputes** → admin reviews. Decision: release, refund, or split.
   - **No response in 72 hours** → auto-approve, funds released to creator.
7. Both sides can leave reviews.

This is why **both sides need full verified profiles and both roles need Stripe setup** (businesses for payment source, creators for Connect payout account).

---

## A. Legal & Policies — P0

Required for App Store / Play Store approval and to limit our legal exposure.

- [ ] **A1** Terms of Service (`app/legal/terms.tsx`) — plain-English draft reviewed by a real lawyer before launch
- [ ] **A2** Privacy Policy (`app/legal/privacy.tsx`) — GDPR + CCPA compliant, covers analytics, third parties (Supabase, Stripe, email provider)
- [ ] **A3** Creator Agreement (`app/legal/creator-terms.tsx`) — payment terms, content ownership, exclusivity rules, tax responsibility
- [ ] **A4** Business Agreement (`app/legal/business-terms.tsx`) — advertising rules, refund eligibility, indemnification
- [ ] **A5** Community Guidelines (`app/legal/community.tsx`) — prohibited content, harassment, fraud
- [ ] **A6** Refund & Dispute Resolution Policy (`app/legal/disputes.tsx`)
- [ ] **A7** Cookie / data policy
- [ ] **A8** DMCA / copyright policy
- [ ] **A9** Age gate at signup (18+; 13+ with parental consent for creators in some regions — check requirements)
- [ ] **A10** "Accept terms" checkbox + timestamp stored in `public.users.accepted_terms_at`

---

## B. Onboarding — P0

Two distinct flows because the data collected differs wildly.

### B.1 Welcome (both roles)
- [ ] **B1** 3-slide welcome carousel (`app/onboarding/welcome.tsx`) — skippable
- [ ] **B2** Role picker: Creator or Business (`app/onboarding/role.tsx`)

### B.2 Creator onboarding (7 steps)
- [ ] **B3** Basic info (name, bio 160 chars, location autocomplete)
- [ ] **B4** Social handles (IG + TikTok usernames) + follower counts
- [ ] **B5** Handle verification — the creator enters a verification code we generate into their IG/TikTok bio, we poll the public profile endpoint to confirm
- [ ] **B6** Categories of interest (multi-select from enum)
- [ ] **B7** Portfolio: upload up to 5 sample videos/images (→ `portfolio` storage bucket)
- [ ] **B8** Payout: Stripe Connect onboarding (redirect to Stripe hosted flow → webhook back)
- [ ] **B9** Review & submit → `users.onboarding_completed_at = now()`

### B.3 Business onboarding (6 steps)
- [ ] **B10** Business info (name, category, address with map pin)
- [ ] **B11** Website + hours + description
- [ ] **B12** Photos upload (cover + up to 6 gallery photos → `listing-images` bucket)
- [ ] **B13** Business verification — upload licence/registration OR manual review queue
- [ ] **B14** Payment source setup (Stripe Setup Intent, save card as default)
- [ ] **B15** Inline tutorial: "Create your first listing" (can skip)

### B.4 After onboarding (both)
- [ ] **B16** Push notification permission prompt
- [ ] **B17** Email verification (Supabase built-in) — block full access until verified
- [ ] **B18** Optional phone number + SMS verify (for trust badge)

---

## C. Profiles — P0

### Creator profile (`app/(creator)/[id].tsx` — already exists, needs polish)
- [ ] **C1** Editable fields: bio, location, categories, social handles, portfolio
- [ ] **C2** Read-only stats: rating, total bookings, verified badges, member since
- [ ] **C3** Public share URL (`surve://creator/<id>` deep link)
- [ ] **C4** Report user button (creates entry in `reports` table)
- [ ] **C5** Block user button

### Business profile (`app/(business)/[id].tsx` — new)
- [ ] **C6** Photos gallery with swipe
- [ ] **C7** Hours of operation
- [ ] **C8** Address with map (expo-maps or embedded)
- [ ] **C9** Active listings section
- [ ] **C10** Reviews section (from creators who completed bookings)

### Verification badges (both)
- [ ] **C11** Email verified ✓
- [ ] **C12** Phone verified ✓
- [ ] **C13** Business-registered ✓ (manual admin approval)
- [ ] **C14** Social handle verified ✓ (creators only)
- [ ] **C15** Stripe account connected ✓

---

## D. Listings — P0 (most already exist)

- [ ] **D1** Create listing wizard — already exists at `(listing)/create.tsx`, polish copy + validation
- [ ] **D2** Edit listing screen
- [ ] **D3** Duplicate listing action
- [ ] **D4** Pause / close listing action
- [ ] **D5** Listing analytics screen (views, applies, conversion rate)
- [ ] **D6** Image upload wired to `listing-images` storage bucket

---

## E. Applications — P0

- [ ] **E1** Creator applies (message + optional video pitch) — stores in `applications`
- [ ] **E2** Business reviews applications: list view, filter by status, sort by creator rating/followers
- [ ] **E3** Accept → creates Booking + Stripe PaymentIntent (escrow)
- [ ] **E4** Reject with optional reason → notifies creator
- [ ] **E5** Withdraw application (creator side)

---

## F. Booking Lifecycle + Proof — P0 (critical new feature)

The heart of the payment system.

- [ ] **F1** Extend `bookings` table:
  - Add columns: `escrow_intent_id`, `proof_url`, `proof_submitted_at`, `proof_approved_at`, `auto_approve_at`
  - Extend status enum: `pending, accepted, in_progress, proof_submitted, completed, disputed, cancelled, refunded`
- [ ] **F2** Booking detail screen CTAs vary by state:
  - Business viewing `pending/accepted`: **Pay Now** → Stripe checkout → status `in_progress`
  - Creator viewing `in_progress`: **Submit Proof** button
  - Business viewing `proof_submitted`: **Approve** / **Dispute** buttons + 72h countdown
  - Both viewing `completed`: **Leave Review** CTA
- [ ] **F3** Submit Proof screen (`app/(booking)/proof.tsx`) — URL input + 1-3 image uploads, optional note
- [ ] **F4** Dispute screen (`app/(booking)/dispute.tsx`) — reason picker + description, creates entry in `disputes` table
- [ ] **F5** Auto-approve scheduled job — edge function `auto-approve-bookings` runs hourly, flips `proof_submitted` → `completed` when `now() > auto_approve_at`
- [ ] **F6** Payout trigger on `completed` — edge function creates Stripe Transfer to creator's Connect account minus 5% platform fee, writes to `transactions`

---

## G. Payments (Stripe) — P0

- [ ] **G1** Install `@stripe/stripe-react-native`
- [ ] **G2** Add Stripe publishable key to `.env`, initialize `<StripeProvider>` in root layout
- [ ] **G3** Business payment: PaymentSheet in `checkout.tsx` — creates PaymentIntent server-side (edge function), confirms client-side
- [ ] **G4** Escrow: we use Stripe's automatic capture model with `capture_method: 'manual'`; funds authorized on booking, captured on approval. Alt: Connect + platform holds balance. Pick one based on processing cost.
- [ ] **G5** Creator Connect onboarding — Stripe hosted Connect account link. Store `stripe_account_id` on `creators` row.
- [ ] **G6** Platform fee: 5% — configurable per env (`PLATFORM_FEE_BPS=500`)
- [ ] **G7** Edge function `stripe-webhook` handles: `payment_intent.succeeded`, `payment_intent.canceled`, `account.updated`, `charge.refunded`, `transfer.paid`
- [ ] **G8** Edge function `create-payment-intent` — called by app to get a client_secret
- [ ] **G9** Edge function `create-connect-link` — returns onboarding URL for creator
- [ ] **G10** Edge function `release-escrow` — called when booking approved, captures PaymentIntent + creates Transfer
- [ ] **G11** Receipts: email via Resend/SendGrid on every transaction
- [ ] **G12** Transaction history screen already exists — wire to `transactions` table

---

## H. Messaging — P1 (MVP works now)

- [ ] **H1** Realtime subscription already wired via `subscribeToConversationMessages`
- [ ] **H2** Typing indicators (optional P2)
- [ ] **H3** Image attachments in chat (use `portfolio` bucket)
- [ ] **H4** Read receipts via `message_reads` table (already created)
- [ ] **H5** Push notifications on new message
- [ ] **H6** Block / report conversation

---

## I. Notifications — P0

- [ ] **I1** Notifications tab shows feed from `notifications` table (backend ready)
- [ ] **I2** Push notifications — Expo Push Notifications setup, store `expo_push_token` on user row
- [ ] **I3** Send push: edge function called from each notification-creating trigger
- [ ] **I4** Email notifications via Resend — templates for: booking created, payment received, proof submitted, review received
- [ ] **I5** Preferences screen with granular toggles (`users.notification_prefs jsonb`)
- [ ] **I6** Badge count on tab bar (already wired via `getUnreadMessageCount` + `getUnreadNotificationCount`)

---

## J. Search & Discovery — P1

- [ ] **J1** Full-text search on `listings.title` + `description` using Postgres `tsvector`
- [ ] **J2** Creator search by followers range, engagement rate, category, verified status
- [ ] **J3** Filter bar already exists — wire to real queries
- [ ] **J4** Saved searches (`saved_searches` table)
- [ ] **J5** "Recommended for you" section based on user's categories

---

## K. Settings — P0

Mostly exists at `(profile)/*`, needs completion.

- [ ] **K1** Account: change email, change password, 2FA (TOTP via Supabase)
- [ ] **K2** Notification preferences (granular)
- [ ] **K3** Privacy: who can message me, profile visibility
- [ ] **K4** Blocked users list
- [ ] **K5** Language picker (English only at launch; i18n framework scaffolded)
- [ ] **K6** Theme: light / dark / system
- [ ] **K7** Data export (GDPR) — edge function generates JSON bundle, emails link
- [ ] **K8** Delete account — soft delete then purge after 30 days
- [ ] **K9** About / version / licenses

---

## L. Reviews & Ratings — P1

- [ ] **L1** Post-booking review prompt (triggered on status → completed)
- [ ] **L2** Review form: 5-star + comment (140 chars)
- [ ] **L3** Review moderation (profanity filter, report button)
- [ ] **L4** Business can respond publicly to reviews

---

## M. Admin Tools — P1

Web dashboard (Next.js app in `/root/projects/surve-admin`) — NOT inside the mobile app.

- [ ] **M1** Auth via Supabase (admin role)
- [ ] **M2** User search / suspend / ban
- [ ] **M3** Dispute inbox with accept/refund/split actions
- [ ] **M4** Reports queue (reported users, listings, messages)
- [ ] **M5** Financial reporting (daily GMV, platform fees, refunds)

---

## N. Analytics — P2 at launch, P1 within a month

- [ ] **N1** PostHog React Native SDK
- [ ] **N2** Event taxonomy document (naming, required props)
- [ ] **N3** Core funnels instrumented: signup → onboarding_complete → first_listing_viewed → first_apply → first_booking → first_payment
- [ ] **N4** Retention cohorts dashboard

---

## O. Infrastructure — P0

- [ ] **O1** Edge functions: all listed in F + G + I above
- [ ] **O2** Scheduled trigger for auto-approve (pg_cron or Supabase scheduled functions)
- [ ] **O3** Transactional email provider: Resend (cheap, good DX)
- [ ] **O4** Sentry for error tracking (react-native + edge functions)
- [ ] **O5** Rate limit on sensitive endpoints (auth, payment) — via edge function middleware
- [ ] **O6** Input validation: use Zod in edge functions, react-hook-form + Zod on client
- [ ] **O7** Image moderation on upload (NSFW detection via Rekognition or similar)
- [ ] **O8** Backup strategy: Supabase daily backups (built in, verify retention)

---

## P. Build & Release — P0

- [ ] **P1** `app.json`: bundle ID `com.surve.app`, version, orientation, permissions
- [ ] **P2** App icon (1024x1024 source, all generated sizes)
- [ ] **P3** Splash screen (light + dark)
- [ ] **P4** `eas.json` with dev / preview / production profiles
- [ ] **P5** EAS Build: first iOS + Android builds green
- [ ] **P6** TestFlight + Play Internal track set up
- [ ] **P7** App Store Connect listing: name, subtitle, description, keywords, categories, age rating
- [ ] **P8** 5 screenshots per device size (iPhone 6.9", 6.7", iPad; Android standard + tablet)
- [ ] **P9** Privacy labels (App Store) and data safety form (Play)
- [ ] **P10** Support URL, marketing URL, promo text

---

## Q. Quality — P0

- [ ] **Q1** ErrorBoundary component wrapping root layout
- [ ] **Q2** Loading skeletons on every list view (already have `Skeleton` component)
- [ ] **Q3** Empty states with CTAs on every list
- [ ] **Q4** Offline banner + request retry queue
- [ ] **Q5** Accessibility audit: `accessibilityRole`, `accessibilityLabel` on every pressable; dynamic type support
- [ ] **Q6** Dark mode parity check on every screen
- [ ] **Q7** Copy review for tone / typos

---

## Dependency graph

```
Infra (O) ─┐
Legal (A) ─┼── Onboarding (B) ── Profiles (C) ── Listings (D) ── Applications (E) ── Booking+Proof (F) ── Payments (G)
Notifications (I) ─ Messaging (H) ─ Search (J) ─ Settings (K) ─ Reviews (L)
                                                                │
                                                    Admin (M) ──┴── Analytics (N) ── Build/Release (P) ── Quality (Q)
```

Suggested build order: O → A → B → C → F (schema) → G (Stripe) → E → I → K → D/H/J → L → M/N → P → Q.
