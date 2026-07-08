# TraceWell 🏥

> AI-Powered Healthcare Documentation & Communication Platform  
> ATW306 Capstone Project

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (via Supabase or Neon) |
| ORM | Prisma |
| Auth | NextAuth.js (JWT, RBAC) |
| AI | OpenAI API (summarisation), Speech-to-Text API |
| Hosting | Vercel (free tier) |
| Version Control | GitHub |

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_ORG/tracewell.git
cd tracewell
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env.local
# Fill in your DATABASE_URL, NEXTAUTH_SECRET, and API keys
```

### 4. Set up the database
```bash
npx prisma generate
npx prisma db push       # pushes schema to your Supabase/Neon DB
npx prisma db seed       # optional: seed demo data
```

### 5. Run the dev server
```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login & register pages
│   ├── (dashboard)/      # Role-based dashboards
│   │   ├── patient/
│   │   ├── nurse/
│   │   ├── doctor/
│   │   ├── family/
│   │   └── manager/
│   └── api/              # Next.js API routes
│       ├── auth/
│       ├── patients/
│       ├── health-records/
│       ├── nursing-notes/
│       ├── alerts/
│       ├── notifications/
│       └── ai/
│           ├── summarise/
│           └── speech-to-text/
├── components/           # Shared UI components
│   ├── ui/
│   ├── dashboard/
│   ├── forms/
│   └── charts/
├── lib/                  # Core utilities
│   ├── prisma.ts         # Prisma client singleton
│   └── auth.ts           # NextAuth config
├── types/                # Shared TypeScript types
├── hooks/                # Custom React hooks
└── middleware.ts          # RBAC route protection
prisma/
└── schema.prisma          # Database schema
```

## User Roles

| Role | Access |
|------|--------|
| `PATIENT` | Log symptoms, view own records & trends |
| `NURSE` | Record observations, voice notes, handover summaries |
| `DOCTOR` | View patient records, AI insights, risk flags |
| `FAMILY_MEMBER` | View summaries, provide preferences |
| `MANAGER` | Workforce dashboard, outcomes, audit logs |

## Team & Branching Strategy

- `main` — protected, only accepts PRs
- `develop` — integration branch
- `feature/your-name/feature-name` — individual feature branches

```bash
# Start a new feature
git checkout develop
git pull
git checkout -b feature/your-name/feature-name

# When done, push and open a PR into develop
git push origin feature/your-name/feature-name
```

## Environment Variables

See `.env.example` for all required variables. **Never commit `.env.local`.**
