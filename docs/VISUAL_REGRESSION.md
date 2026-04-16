# Visual Regression Checklist (S138)

Audit of `src/constants/theme.ts` light + dark tokens, focused on contrast/visibility risks
that should be re-checked after any theme edit. No theme changes are made here — Agent A
owns `theme.ts`.

<!--
Methodology: read each token pair, compare against WCAG AA body (>=4.5:1) and large (>=3:1)
targets. The theme already carries inline contrast annotations from S115; this doc is a
focused set of *re-run on change* checks with concrete screens/components to spot-check.

Legend:
  [LOW]    annotated >=4.5:1 — safe, re-verify if tokens change.
  [MEDIUM] annotated 3:1–4.5:1 — large-text only; verify usage isn't body copy.
  [HIGH]   any case the annotation doesn't cover (placeholder, disabled, status pill text).
-->

## Contrast risks to check

- [LOW] `textSecondary` on `background` — light 5.80:1, dark 7.80:1. Safe.
- [LOW] `textSecondary` on `surface` — light 6.42:1, dark 6.86:1. Safe.
- [MEDIUM] `textTertiary` on `background` — light 3.99:1 (large pass). Used in
  `EmptyState.body`, `SavedSearchCard.summary`, `txnMeta` in earnings. These are body copy;
  if `textTertiary` changes, re-verify or promote to `textSecondary`.
- [MEDIUM] `textTertiary` on `surface` — light 4.42:1 AA pass (thin margin). Re-verify on
  any token tweak.
- [HIGH] **Placeholder text** — `Input.tsx` uses `colors.textTertiary` as
  `placeholderTextColor`. On dark `#8A8F9C` over `surface #1A1A1A` ≈ 4.3:1 large. If a
  placeholder is long (>1 line in a multiline field) and wraps to two lines of small copy,
  it reads as body → AA body may fail on light (`#737885` on `#FFFFFF` ≈ 4.42:1 borderline).
  Recommend spot-checking search + support multiline inputs.
- [MEDIUM] `pending` `#D97706` on `pendingLight` `#FFFBEB` — 3.07:1 large pass only.
  `Badge` status pills must keep font size >=14 semibold or promote to larger.
- [MEDIUM] `completed` `#059669` on `completedLight` `#ECFDF5` — 3.58:1 large pass.
- [MEDIUM] `warning` `#D97706` on `surface` — 3.19:1 large pass. Any warning icon paired
  with body copy on surface must not use `warning` as the text color.
- [LOW] `primary` on `activeLight` — light 8.08:1 AA pass. Safe.
- [HIGH] **Skeleton on background** — `skeleton` `#E5E5E5` light vs `#F4F3F4` bg is
  ~1.05:1. Skeletons are decorative so this is fine, but verify the shimmer highlight is
  still perceivable. Dark `#2A2A2A` on `#0A0A0A` ≈ 1.6:1 — re-verify if background tone
  shifts.
- [HIGH] **Disabled button text** — no explicit `onDisabled` / `textDisabled` token. If a
  screen sets a Pressable opacity it may push effective contrast below AA. Consider adding
  `textDisabled` if Agent A revises theme.
- [HIGH] **`rating` `#F59E0B` used as text** — annotation warns star fill only. Grep for
  any review screens rendering a numeric rating in `colors.rating` — that would fail AA on
  both themes.
- [MEDIUM] **Overlay modal text** — `overlay` alpha on image cards can leave white text on
  a bright image region. Confirm text uses a solid scrim / gradient, not the 0.4/0.6
  overlay alone.
- [LOW] `onPrimary` on `primary` — 9.20:1 light, ~5.9:1 dark. Safe.
- [HIGH] **Dark mode primary shift** — light `primary: #2c428f` vs dark `primary: #4A6CF7`.
  Any hardcoded `#2c428f` in a screen will look wrong in dark mode. Grep results should be
  zero — re-run if theme.ts changes.

## Theme gaps noticed (informational — for CEO follow-up)

- No `textDisabled` / `onDisabled` tokens. Button loading/disabled state falls back to
  manual opacity which is inconsistent.
- No `link` token. Links today reuse `primary`; works but separates link styling from
  brand color if marketing/legal later wants them visually distinct.
- No explicit `focus` / `focusRing` token. Accessibility focus outlines currently rely on
  the platform default which can clash with `primaryLight`.
- Status colors (`pending`, `completed`, `cancelled`) are declared but there's no
  `status.info` pair for neutral info banners — screens currently reuse `primary` or
  `warning` inconsistently.

## Screens/components to regression-check on any theme edit

1. `EmptyState.tsx` — title, body, CTA text, illustration ring/dot alphas.
2. `ErrorState.tsx` (new) — uses `cancelled`, `cancelledLight`, `onPrimary`.
3. `Input.tsx` — placeholder color (`textTertiary`).
4. `Badge` status pills (pending/active/completed/cancelled).
5. `TabBar.tsx` — selected vs unselected tint.
6. `Skeleton.tsx` — shimmer visibility on both backgrounds.
7. `(payment)/success.tsx` — hero primary gradient legibility.
8. `(profile)/earnings.tsx` — hero white-on-primary stats.
9. Toasts — confirm error/success toast backgrounds retain text contrast.
10. Chat bubbles — incoming vs outgoing text on surface/primary.
