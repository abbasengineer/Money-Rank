# MoneyRank — project context for Claude Code

MoneyRank is a daily financial decision game (rank four options per scenario) with community stats, profiles, badges, forum, tools, admin, and a multi-step **risk / financial literacy assessment** with PDF report and email.

## Stack

- **API:** Express (`server/index.ts`, `server/routes.ts`), TypeScript, ESM (`"type": "module"`).
- **Client:** React + Vite (`client/`), wouter routes, TanStack Query, Radix/shadcn UI.
- **DB:** PostgreSQL via Drizzle (`shared/schema.ts`, `server/db.ts`, `server/storage.ts`).
- **Shared:** `shared/` for schema and small shared utilities (e.g. `incomeBracketSalary.ts`).

Copy `.env.example` → `.env`. Never commit `.env`. Required vars include `SESSION_SECRET`, `DATABASE_URL` (or `SUPABASE_DATABASE_URL`), and auth/admin settings as documented in `.env.example`.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run dev` | API (development) |
| `npm run dev:client` | Vite client (port 5000) |
| `npm run check` | TypeScript check |
| `npm run db:push` | Drizzle schema push |
| `npm run seed` | Seed challenges from `server/seed.ts` |
| `npm run seed:recycled` | Insert recycled future daily challenges (`scripts/seedRecycledBatches.ts`) |

Seeds load `.env` from the project root before importing DB modules.

## Repository layout (high signal)

| Area | Location |
|------|----------|
| Daily challenge UI | `client/src/components/challenge/`, `client/src/pages/home.tsx` |
| Assessment UI | `client/src/pages/assessment.tsx`, `client/src/components/assessment/` |
| API client types | `client/src/lib/api.ts`, `client/src/lib/types.ts` |
| Admin | `client/src/pages/admin.tsx` |
| Challenge seed data | `server/seed.ts` (`export const seedChallenges`) |
| Assessment-only seed scenarios | `server/assessmentChallengesSeed.ts` |
| Assessment categories order | `server/config/assessmentCategories.ts` |
| Scoring / grades | `server/services/scoringService.ts` |
| Risk profile | `server/services/riskProfileService.ts` |
| Assessment create + load challenges | `server/services/assessmentService.ts` |
| Report copy + PDF + email | `server/services/assessmentReport*.ts`, `server/services/emailService.ts` |
| Recycled calendar seed | `scripts/seedRecycledBatches.ts` |

## Daily challenges

- Each day has a `dateKey` (`yyyy-MM-dd`), scenario text, assumptions, category, difficulty, and four ranked options (`tierLabel`, `orderingIndex`).
- Canonical content for development lives in **`server/seed.ts`** (`seedChallenges`). The first entry uses “today” for `dateKey`; many entries use fixed historical `dateKey`s.
- User attempts are tied to **`dateKey`** so re-seeded challenges still match history (see comments in `server/routes.ts` around leaderboard/attempts).

## Recycled challenge batches (extending the calendar)

**Purpose:** Pre-fill future dates by copying existing challenge content onto new `dateKey`s without rewriting scenarios.

**Script:** `scripts/seedRecycledBatches.ts`  
**Run:** `npm run seed:recycled` (or `npx tsx scripts/seedRecycledBatches.ts`). Optional `SEED_ENV_FILE` to load a non-default env file.

**Covered ranges (as of script header):**

- Batch 1–7: `2026-05-08` … `2026-07-16` (70 days)
- Batch 8: `2026-07-17` … `2026-08-31` (46 days)
- Batch 9: `2026-09-01` … `2026-10-31` (61 days)
- Batch 10: `2026-11-01` … `2026-12-31` (61 days)

**How to add a new batch:**

1. Append rows to `RECYCLED_MAPPINGS`: `{ newDateKey, sourceDateKey }` or `{ newDateKey, sourceTitle }`.
   - `sourceDateKey`: copy from a fixed seed day in `seedChallenges`.
   - `sourceTitle`: copy by title (needed for rolling-date entries like “Subscription Audit” or “Windfall: $10,000 Bonus”).
2. Update the comment block at the top of the file with the new date range and batch number.
3. Source pool is `seedChallenges` **plus** `ASSESSMENT_SCENARIO_CHALLENGES` (imported in `main()`).
4. `patchChallengeFor2026()` adjusts cloned content when needed (e.g. Roth IRA limit text `$6,500` → `$7,500`).
5. Run against the target DB. **Idempotency:** if `dateKey` already exists in `daily_challenges`, that row is **skipped** (not updated).
6. New rows are created via `storage.createChallenge` with `source: 'manual'`.

**Verification:** Confirm rows in DB or admin UI; spot-check API for a sample `dateKey`.

## Financial literacy / risk assessment

**Routes** (`server/routes.ts`, prefix `/api/assessment`):

- `GET /api/assessment/challenges` — one challenge per category (newest `dateKey` per category, order from `ASSESSMENT_CATEGORY_ORDER`).
- `POST /api/assessment` — demographics + ranked answers; persists `risk_assessments` / `risk_assessment_answers`.
- `GET /api/assessment/:id`, `GET /api/assessment/:id/report.pdf`, `POST /api/assessment/:id/email`, `POST /api/assessment/:id/link` (link to logged-in user).

**Schema:** `riskAssessments`, `riskAssessmentAnswers` in `shared/schema.ts`.

**Client:** `/assessment` route in `client/src/App.tsx`.

Demographics validation (income bracket vs salary, housing/vehicle payments) lives in `assessmentService.ts` Zod schemas.

## Admin

- Password from `ADMIN_PASSWORD`; admin routes and UI in `server/routes.ts` / `client/src/pages/admin.tsx`.
- Challenges can be grouped by month in the admin accordion.

## Coding conventions

- Prefer **small, focused diffs**; match naming and patterns in neighboring files.
- Do not over-abstract one-off helpers.
- Only create git commits when the user explicitly asks.
- Do not commit secrets or `.env`.

## Working on this repo in Claude Code

When continuing work (e.g. “add recycled batch 11” or “extend assessment report”):

1. Read the relevant section above and open the listed files.
2. For recycled dates, edit `RECYCLED_MAPPINGS` and run `npm run seed:recycled`.
3. For assessment behavior, trace `assessmentService` → `riskProfileService` / report services → routes and `client/src/pages/assessment.tsx`.

If `main` is behind local WIP, check `git status` — assessment and recycled scripts may exist only on unmerged branches or uncommitted changes.
