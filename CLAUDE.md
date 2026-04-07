# Surve — Creator-Business Connection Platform

## Project Info
- React Native + Expo + TypeScript
- Frontend-only (mock data) — Supabase backend to be added later
- Design system: Uber-like black/white with blue accent #2c428f
- Routes in src/app/, components in src/components/, lib in src/lib/

## Commands
- Type check: `npx tsc --noEmit`
- Start dev: `npx expo start`
- Install deps: `npm install`

## Key Files
- Theme: src/constants/theme.ts
- Store: src/lib/store.ts (Zustand)
- Types: src/types/index.ts
- Mock Data: src/lib/mockData.ts
- Supabase (placeholder): src/lib/supabase.ts

## Architecture
- Expo Router file-based routing (root: src/app/)
- Zustand for state management (auth, listings, bookings, messages, UI)
- Two user roles: Creator and Business
- Custom bottom tab bar with Reanimated animations
- All components use useTheme hook for light/dark mode

## Design System
- Primary: #2c428f (blue)
- Background: #F4F3F4
- Text: #000000
- Surface: #FFFFFF
- Status colors: pending (yellow), active (blue), completed (green), cancelled (red)
- Spring animations via react-native-reanimated
- Haptic feedback on all interactions

## Conventions
- Components use Animated + Springs for press animations
- All pressable elements include haptic feedback
- Cards have border, shadow, and scale-on-press
- Filter chips use horizontal ScrollView
- Mock data is in src/lib/mockData.ts — replace with Supabase queries later
- Tab bar uses lucide icons with dot indicator
