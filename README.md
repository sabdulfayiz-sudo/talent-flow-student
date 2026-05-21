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
| `/test/:practiceId` | Live test page. Fullscreen-on-start, one-chance copy, soft integrity warnings (no `preventDefault`), abandon-beacon on tab close / blur / fullscreen-exit, no resume after leaving. |
| `/reports/:sessionId` | Per-session result. |
| `/certificates` | Earned + pending certificates. |
| `/profile` | Candidate profile editor. |
| `/practice` | Untimed practice with category + difficulty filters. Reveals correct answers on demand. |
| `/leaderboard` | Group or global ranking. Other students anonymized to initials. |
| `/achievements` | Six derived badges (bronze/silver/gold) with progress bars + summary stats. |
| `/ai-interview` | AI mock interview. Text chat with GPT acting as interviewer; final score + skill breakdown on finish. |
| `/resume-review` | Drag-and-drop PDF upload; AI-generated strengths / suggestions / overall score. |
| `/help` | FAQ on integrity policy, adaptive difficulty, retakes, timer. |
| `/settings` | Theme (light/dark/system), notification toggles, sound, language (EN / RU / UZ). Persisted to `localStorage`. |

## Test Integrity

The test page wraps the question UI with a watermark and a `useAntiCheat` hook. The current policy is **soft warnings + irrevocable abandon**:

- The pre-test `IntegrityGate` modal forces fullscreen on start and tells the student: "You have one chance. If you leave this screen, the test ends."
- `useAntiCheat` observes `visibilitychange`, `blur`/`focus`, `copy`/`cut`/`paste`, `contextmenu`, `selectstart`, `dragstart`, `beforeunload`, `online`/`offline`, `fullscreenchange`, plus keyboard shortcuts. It does **not** call `preventDefault` — it only logs each event to `POST /testing/sessions/{id}/events`.
- `visibilitychange` / `blur` / fullscreen-exit / `pagehide` fire `POST /testing/sessions/{id}/abandon` via `navigator.sendBeacon` (with a `fetch({ keepalive: true })` fallback). The server marks the session finished. There is no resume CTA in the UI.
- A devtools-open heuristic (`outerWidth - innerWidth` delta, 2.5s) and an external-display detector (`screen.isExtended`, 5s) both log `warn` events. No hard block.

What this does NOT do (because no browser can):

- Block a second device, phone, or OCR. Mitigated by per-student question shuffle (server-side) and watermarking the screen.
- Block voice/audio cheating. Out of scope for a web app.
- Detect remote desktop / screen-share. Out of scope.

## AI Features

Both AI features call the backend (`/candidate/portal/ai-interview/*` and `/candidate/portal/resume-reviews`). The frontend never sees the OpenAI key — it lives in `OPENAI_API_KEY` on the server.

- `/ai-interview` — TanStack-Query-backed chat. `useStartAIInterview` opens a session with a role and optional context; `useSendAIInterviewMessage` posts each candidate turn and renders the interviewer's reply; `useFinishAIInterview` grades the transcript and renders the final score, strengths, improvements, and per-skill breakdown.
- `/resume-review` — drag-and-drop PDF upload calling `useUploadResumeReview`. The latest review is fetched with `useLatestResumeReview` and rendered with score, analysis, strengths, suggestions. When the API key is missing the backend gracefully falls back to a heuristic review.

## Internationalization

Lightweight, zero-dependency i18n built on a React context (`src/i18n/`):

- Three locales: **EN**, **RU**, **UZ** (JSON files in `src/i18n/{en,ru,uz}.json`, ~500 keys each).
- `useI18n()` exposes `locale`, `setLocale`, and `t(key, vars?)` with `dot.path` lookups and `{var}` interpolation.
- Default locale is auto-detected from the browser, persisted to `localStorage` under `tf-lang`, and synced to `<html lang>` for accessibility.
- Switcher in the header (globe icon) and in `/settings`. No `i18next` dependency added — the implementation is ~120 LOC.

## Performance

- Route-level code-splitting via `React.lazy` + `Suspense`. Only the dashboard and sign-in pages eager-load; everything else (reports, certificates, profile, AI interview, resume review, settings, …) is a separate chunk.
- TanStack Query `staleTime` tuned on portal queries so the dashboard doesn't refetch on every nav.
- Sidebar and header menus are `useMemo`'d so they don't rebuild on every render.

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
