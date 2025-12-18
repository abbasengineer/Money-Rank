# MoneyRank

## Overview

MoneyRank is a daily money decision game where users rank 4 financial options and receive immediate social comparison feedback ("Only X% matched your ranking"). The app is designed as a production-ready MVP with gamification elements including streaks, scores, and percentile rankings.

The core gameplay loop:
1. Users see a daily financial scenario with 4 options
2. Users drag-and-drop to rank options from best to worst
3. Submit to receive a score, grade, and see how they compare to others
4. Track streaks and progress over time

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme variables for MoneyRank branding (emerald green primary)
- **Animations**: Framer Motion for drag-and-drop ranking interface

Key pages:
- `/` - Today's challenge (Home)
- `/challenge/:dateKey` - Specific challenge by date
- `/results/:dateKey` - Results after submitting
- `/archive` - Past challenges list
- `/profile` - User stats and streaks
- `/admin` - Admin dashboard (password protected)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Pattern**: RESTful JSON API endpoints under `/api/*`
- **Build System**: esbuild for server bundling, Vite for client

Key services:
- `challengeService` - Fetches today's/yesterday's challenges, access control
- `attemptService` - Handles submission logic, scoring
- `scoringService` - Calculates ranking scores using distance algorithm
- `aggregateService` - Maintains aggregate statistics for percentile calculations
- `streakService` - Tracks user streaks based on daily completion
- `dateService` - Handles timezone-aware date calculations (defaults to America/New_York)
- `featureFlagService` - Simple feature flag system for paywall/archive access

### Data Storage
- **PostgreSQL** database accessed via Drizzle ORM
- **Schema** defined in `shared/schema.ts` with the following tables:
  - `users` - Anonymous users identified by cookie
  - `dailyChallenges` - One challenge per day, keyed by date
  - `challengeOptions` - 4 options per challenge with tier labels and ordering
  - `attempts` - User submissions with rankings and scores
  - `aggregates` - Per-challenge statistics for social comparison
  - `streaks` - User streak tracking
  - `retryWallets` - Weekly retry tokens (future feature)
  - `featureFlags` - Simple key/value feature flags

### Authentication
- **Anonymous users**: Identified via `mr_uid` HTTP-only cookie
- **Admin access**: Password-protected via `ADMIN_PASSWORD` env variable with session-based auth and rate limiting

### Scoring Algorithm
- Compares user's ranking to ideal ordering using position distance
- Score = 100 - (distance * 12.5), where max distance is 8
- Grades: Great (90+), Good (60+), Risky (below 60)

## External Dependencies

### Required Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `ADMIN_PASSWORD` - Password for admin dashboard access

### Optional Environment Variables  
- `RESET_TZ` - Timezone for daily reset (default: America/New_York)
- `MIN_SAMPLE_SIZE_DEFAULT` - Minimum responses before showing percentages (default: 10)
- `AI_PROVIDER_API_KEY` - For AI-assisted challenge generation in admin

### Third-Party Services
- **PostgreSQL** - Primary database (provisioned via Replit or external like Supabase)
- **No external auth providers** - Uses anonymous cookie-based identification

### Key NPM Dependencies
- `drizzle-orm` + `pg` - Database access
- `express` + `express-session` - Web server
- `date-fns` + `date-fns-tz` - Date/timezone handling
- `framer-motion` - Drag-and-drop animations
- `@tanstack/react-query` - Data fetching and caching
- `zod` - Runtime validation