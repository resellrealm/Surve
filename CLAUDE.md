# Surve — Creator × Hospitality Booking Platform

Connect TikTok / Instagram creators with hotels, restaurants, bars and resorts.

## Project Info
- React Native + Expo + TypeScript
- Supabase backend (project: `qwlhqmynmrmmeakhhgny`)
- Design system: white / blue / black — primary `#2c428f`
- Routes in `src/app/`, components in `src/components/`, lib in `src/lib/`

## Commands
- Type check: `npx tsc --noEmit`
- Start dev: `npx expo start`
- Install deps: `npm install`

## Key Files
- Theme: `src/constants/theme.ts`
- Store: `src/lib/store.ts` (Zustand — all slices)
- Types: `src/types/index.ts`
- Supabase client: `src/lib/supabase.ts`
- API layer (Supabase queries + mock fallbacks): `src/lib/api.ts`
- Mock data: `src/lib/mockData.ts` (users, creators, businesses, listings, bookings, conversations, reviews, payment methods, transactions, notifications)

## Route Map

```
src/app/
  index.tsx              — root redirect
  _layout.tsx            — session restore + store hydration
  auth/
    index.tsx            — auth gate
    login.tsx            — sign in + "Explore as demo creator"
    signup.tsx           — sign up
    onboarding.tsx       — role selection
  (tabs)/                — 5 tab bottom nav
    index.tsx            — home (listings feed / creators for business)
    search.tsx           — search + filters
    bookings.tsx         — active/pending/completed
    messages.tsx         — chat list
    profile.tsx          — user profile + settings
  (listing)/
    [id].tsx             — listing detail + apply
    create.tsx           — business creates listing
  (creator)/
    [id].tsx             — creator public profile
  (booking)/
    [id].tsx             — booking detail + Pay / Message / Complete CTA
  (chat)/
    [id].tsx             — 1:1 conversation
  (payment)/             — modal stack
    checkout.tsx         — booking summary + method picker + Pay
    methods.tsx          — saved payment methods
    add-method.tsx       — credit card form
    success.tsx          — success receipt
  (profile)/             — slide-from-right stack
    earnings.tsx         — hero + payouts + transaction list
    notifications.tsx    — activity feed
    preferences.tsx      — theme + notification toggles
    account.tsx          — email / password / 2FA / delete
```

## Architecture
- Expo Router file-based routing (root: `src/app/`)
- Zustand for state (auth, listings, bookings, messages, UI)
- Two user roles: Creator and Business
- Custom bottom tab bar with Reanimated animations
- All components use `useTheme()` hook for light/dark mode
- `api.ts` queries Supabase and falls back to `mockData` when the DB returns empty — so screens always populate (toggle with `USE_MOCK_FALLBACK`)
- `store.loginAsDemo(role)` hydrates the app with demo content without needing auth — used by the login screen's demo button

## Design System
- Primary: `#2c428f` (blue)
- Background: `#F4F3F4` (off-white)
- Surface: `#FFFFFF` (white)
- Text: `#000000` (black)
- Status colors: pending (amber), active (blue), completed (green), cancelled (red)
- Spring animations via `react-native-reanimated`
- Haptic feedback via `useHaptics()` hook on every interaction

## Payments (Stripe)
- UI is complete: checkout, saved methods, add card, success receipt, earnings, transactions.
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` live in `.env`.
- Payment confirmation is mocked today (TODO markers in `(payment)/checkout.tsx` and `add-method.tsx`) — swap for `@stripe/stripe-react-native` `PaymentSheet.confirm()` + `SetupIntent` when keys are provided.
- Platform fee is 5% (`PLATFORM_FEE_RATE` in checkout).

## Conventions
- Components use `Animated` + springs for press animations
- Every pressable includes haptic feedback
- Cards have subtle border, `Shadows.sm`, scale-on-press
- Filter chips use horizontal ScrollView
- Mock data in `src/lib/mockData.ts` is the source of truth for screenshots
