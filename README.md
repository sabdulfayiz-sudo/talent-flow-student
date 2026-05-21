# TalentFlow Student

Student-facing single-page app for the TalentFlow assessment platform. Hooks into the [HR Assistant API](https://github.com/asaprockky/hrassistant) for authentication, assessments, adaptive testing, and integrity events.

## Stack

- **React 19** + **TypeScript** with **Vite**
- **Ant Design 6** + **Tailwind CSS 4**
- **Redux Toolkit** for auth state, **TanStack Query** for server state
- **React Router** for routing

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # tsc -b && vite build
```

The frontend talks to the API at the URL in `VITE_API_BASE_URL` (defaults to `http://127.0.0.1:8000`). To point at production, set:

```bash
echo 'VITE_API_BASE_URL=https://api.talentflow.uz' > .env.local
```

## Project Structure

```
src/
  App.tsx                          # Router + auth guards
  components/
    assessments/                   # Assessment cards
    common/animatedNumber.tsx      # Animated counter for stat cards
    layout/                        # Sidebar, header, app shell
    test/integrityGate.tsx         # Pre-test policy modal
    test/watermark.tsx             # Diagonal watermark overlay
  features/auth/                   # authSlice + login flow
  hooks/
    useAntiCheat.ts                # Browser integrity hook
    useCandidatePortal.ts          # All /candidate/portal queries
  lib/api.ts                       # Authenticated fetch wrapper
  pages/
    dashboard.tsx                  # Home (stats, weak-area CTA, streak)
    my-assessments.tsx
    test.tsx                       # Live test page (with anti-cheat)
    reports/                       # Per-session report
    practice.tsx                   # Untimed practice lab
    leaderboard.tsx                # Group/global ranking
    achievements.tsx               # Derived badges
    certificates.tsx
    profile.tsx
    help.tsx                       # FAQ + integrity policy
    settings.tsx                   # Theme, language, notifications
  types/
    integrity.ts                   # IntegrityEventType + severity hints
    portal.ts                      # API DTOs
```

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Dashboard. Greeting + 4 animated stat cards, active assessments, recent activity, resume insights, skill analytics with traffic-light bars, weakest-category CTA into Practice, and a streak/momentum card. |
| `/my-assessments` | All assignments with status filters. |
| `/test/:practiceId` | Live test page with integrity gate, watermark, server timer, integrity score badge, and auto-submit on strike threshold. |
| `/reports/:sessionId` | Per-session result. |
| `/certificates` | Earned + pending certificates. |
| `/profile` | Candidate profile editor. |
| `/practice` | Untimed practice with category + difficulty filters. Reveals correct answers on demand. |
| `/leaderboard` | Group or global ranking. Other students anonymized to initials. |
| `/achievements` | Six derived badges (bronze/silver/gold) with progress bars + summary stats. |
| `/help` | FAQ on integrity policy, adaptive difficulty, retakes, timer, integrity score. |
| `/settings` | Theme (light/dark/system), notification toggles, sound, language. Persisted to `localStorage`. |

## Anti-Cheat

The test page wraps the question UI with a watermark and a `useAntiCheat` hook that:

- listens to `visibilitychange`, `blur`/`focus`, `copy`/`cut`/`paste`, `contextmenu`, `selectstart`, `dragstart`, `beforeunload`, `online`/`offline`, `fullscreenchange`;
- blocks `Ctrl/Cmd` + `C/V/X/P/S/U`, `F12`, `Ctrl+Shift+I/J/C`, `PrintScreen`;
- runs a devtools-open heuristic via `outerWidth-innerWidth` delta on a 2.5s interval;
- detects external displays via `window.screen.isExtended` on a 5s interval;
- batches events to `POST /testing/sessions/{id}/events` with severity `info`/`warn`/`critical`;
- shows a local penalty score so the UI can warn before the backend flag, and auto-submits when the backend returns `finished: true` after the second strike.

What this does NOT do (because no browser can):

- Block a second device, phone, or OCR. Mitigated by per-student question shuffle (server-side) and watermarking the screen.
- Block voice/audio cheating. Out of scope for a web app.
- Detect remote desktop / screen-share. Out of scope.

The pre-test `IntegrityGate` modal makes those limits explicit to the student so they know what's monitored before they start.

## Adaptive Difficulty

Server-side. Every answered question updates a per-student `UserSkill.skill_estimate` (logistic-Elo step, K=0.12). `GET /next-question` picks the unanswered question whose `difficulty_level` is closest to that estimate, so two students working on the same practice see different orderings and different difficulty progressions.

The `/help` page explains this in plain English so students understand why their next question may feel harder or easier.

## Theme

The header has a light/dark toggle that writes `tf-theme` to `localStorage` and toggles the `tf-dark` class on `<html>`. Tailwind 4 picks this up via the `darkMode` class strategy.

## Linting And Build

```bash
npm run lint     # ESLint with react-hooks rule set + react-compiler
npm run build    # tsc strict + vite build
```

Both must pass before opening a PR. The React Compiler is enabled, so manual `useMemo`/`useCallback` deps must match the inferred dependencies — if it complains, simplify deps rather than disabling the rule.
