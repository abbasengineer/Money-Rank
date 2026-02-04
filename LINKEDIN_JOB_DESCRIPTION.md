# MoneyRank - LinkedIn Job Description

**Consumer Finance Decision Platform | 2025–Present**

Built MoneyRank, a consumer finance decision platform that gamifies financial education through daily, scenario-based challenges. The platform helps users evaluate the quality and risk of everyday financial choices across investing, debt management, insurance, housing, and budgeting.

**Core Product & Technical Implementation:**

• **Interactive Decision Engine**: Built a drag-and-drop ranking interface using React, TypeScript, and Framer Motion where users rank 4 financial options per challenge. Implemented a custom distance-based scoring algorithm (Kendall tau variant) that calculates partial credit based on positional accuracy, converting raw scores into tiered grades (Great/Good/Risky) with configurable thresholds.

• **Real-Time Social Comparison System**: Designed and implemented an aggregate statistics engine that maintains percentile rankings, exact-match percentages, and top-pick distributions across all challenges. Built transactional database operations to ensure data consistency when users retry challenges, with automatic recalculation of global aggregates when best attempts change.

• **Gamification & Engagement Systems**: Developed streak tracking with timezone-aware daily reset logic, a comprehensive badge/achievement system with 10+ badge types (completion, streak, score, percentile-based), and a retry wallet system that grants 1 free retry per week. Implemented a "best attempt" tracking system where only optimal performances count toward user statistics and leaderboards.

• **User Analytics & Insights Dashboard**: Built a comprehensive analytics system featuring:
  - Score trend visualization with Recharts (line charts, bar charts, pie charts)
  - Category performance analysis across 8+ financial categories
  - Risk profiling algorithm that calculates overall risk scores and category-specific risk levels
  - Financial Health Score (weighted composite: 40% average score, 30% risk management, 20% consistency, 10% category balance)
  - Personalized insights engine that generates recommendations based on decision patterns
  - Goal tracking with auto-suggested milestones based on user performance

• **Authentication & User Management**: Implemented multi-provider authentication system supporting anonymous users (Wordle-style), email/password with bcrypt hashing, and OAuth integration (Google, Facebook) using Passport.js. Designed session management with Express sessions and PostgreSQL session store, with account linking capabilities for users switching between auth methods.

• **Subscription & Monetization Infrastructure**: Integrated Stripe for subscription management with support for free, premium, and pro tiers. Built webhook handlers for subscription lifecycle events (creation, updates, cancellations), implemented Stripe Customer Portal integration for self-service subscription management, and designed feature gating system for premium analytics and insights.

• **Data Architecture & Performance**: Architected PostgreSQL schema with Drizzle ORM, implementing optimized indexes for user lookups, challenge queries, and aggregate calculations. Built service layer architecture (challengeService, attemptService, scoringService, aggregateService, streakService, badgeService) with clear separation of concerns. Implemented feature flags system for gradual rollouts and A/B testing.

• **Admin & Content Management**: Developed admin dashboard with challenge CRUD operations, user management, analytics overview, and category performance tracking. Built challenge publishing workflow with date-keyed challenges that automatically rotate daily based on configurable timezone.

• **Additional Features**: Implemented forum/community features with posts, comments, and voting; SEO optimization with dynamic meta tags and Open Graph support; responsive design with Tailwind CSS and shadcn/ui component library; and shareable results cards with social media integration.

**Technical Stack**: React 19, TypeScript, Express.js, PostgreSQL (Supabase), Drizzle ORM, Vite, TanStack React Query, Stripe API, Passport.js (OAuth), Framer Motion, Recharts, Tailwind CSS, shadcn/ui

**Key Metrics & Outcomes**:
- Launched with open access and optional user accounts supporting progress tracking
- Built analytics infrastructure that processes user attempts and generates real-time percentile rankings
- Implemented subscription system ready for monetization with Stripe integration
- Designed scalable architecture supporting daily challenge rotation, aggregate statistics, and user growth

This project demonstrates my ability to identify market gaps, translate behavioral finance principles into measurable systems, architect full-stack applications with complex data relationships, and ship production-ready features—from authentication and payments to analytics and gamification—while maintaining code quality and user experience excellence.

