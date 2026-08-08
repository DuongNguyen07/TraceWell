# Tracewell

AI-powered healthcare documentation and communication platform.  
ATW306 Capstone Project.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth.js v4 (JWT, role-based) |
| AI | Google Gemini (`gemini-2.0-flash`) |
| Containerisation | Docker + Docker Compose |

---

## Getting Started (Local Dev)

### 1. Clone the repo

```bash
git clone https://github.com/DuongNguyen07/Tracewell.git
cd Tracewell
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string |
| `NEXTAUTH_SECRET` | Any long random string — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — starts with `AIzaSy...` |

> **Never commit `.env.local`** — it is in `.gitignore` for this reason.

### 4. Push the schema and seed demo data

```bash
npx prisma db push
npx prisma db seed
```

### 5. Start the dev server

```bash
npm run dev
# http://localhost:3000
```

---

## Running with Docker

Docker is the fastest way to spin up a production-like build on any machine.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Steps

```bash
# 1. Clone the repo (if you haven't already)
git clone https://github.com/DuongNguyen07/Tracewell.git
cd Tracewell

# 2. Copy and fill in env vars
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, GEMINI_API_KEY

# 3. Build the image and start the container
docker compose up --build

# App is now running at http://localhost:3000
```

To stop it: `Ctrl+C`, then `docker compose down`.

> The Docker image uses `output: standalone` — only the files actually needed
> at runtime are included, so the final image is small and fast to deploy.

---

## Project Structure

```
Tracewell/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data seeder
├── prisma.config.ts           # Prisma datasource + seed config
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # 2-stage login (org select → credentials)
│   │   ├── (dashboard)/
│   │   │   ├── nurse/         # Nurse dashboard
│   │   │   ├── doctor/        # Doctor dashboard
│   │   │   ├── patient/       # Patient dashboard
│   │   │   ├── family/        # Family dashboard
│   │   │   └── manager/       # Manager / Admin dashboard
│   │   └── api/
│   │       ├── auth/          # NextAuth handler
│   │       ├── handover/      # AI shift-handover generation
│   │       ├── query/         # AI clinical Q&A
│   │       ├── caption/       # AI image captioning
│   │       ├── family-update/ # AI family-update generation
│   │       └── discharge-summary/ # AI discharge summary
│   ├── components/
│   │   ├── Providers.tsx      # SessionProvider wrapper
│   │   └── dashboard/
│   │       ├── DashboardView.tsx      # Main role-aware dashboard
│   │       ├── HealthChart.tsx        # 4-metric wellbeing chart
│   │       └── FamilyResidentView.tsx # Family/resident read-only view
│   ├── lib/
│   │   └── prisma.ts          # Prisma client (adapter-pg)
│   ├── types/
│   │   └── next-auth.d.ts     # Session type extensions
│   └── middleware.ts          # Role-based route protection
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## User Roles

| Role | Org | Access |
|------|-----|--------|
| `NURSE` / `CARER` | Hospital / Aged Care | Care notes, wellbeing checks, AI handover, vitals |
| `DOCTOR` | Both | All nurse access + diagnoses, referrals, discharge summaries |
| `MANAGER` / `ADMIN` | Both | Full overview of all patients |
| `FAMILY` | Both | Read-only family view — health info, activity digest, chat |
| `PATIENT` / `RESIDENT` | Both | Own records only — same read-only view as family |

---

## Branching & Contribution Workflow

We use a **`main` → `develop` → `feature/*`** flow.

| Branch | Purpose |
|--------|---------|
| `main` | Stable, production-ready — PRs only, no direct pushes |
| `develop` | Integration branch — merge your feature here first |
| `feature/<your-name>/<description>` | Your working branch |

### Starting a new feature

```bash
# Make sure your local develop is up to date
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/your-name/what-youre-building
```

### While you work

```bash
# Commit often with clear messages
git add <files>
git commit -m "feat: short description of what changed"

# Keep your branch up to date with develop to avoid big merge conflicts
git fetch origin
git merge origin/develop
```

### When your feature is ready

```bash
# Push your branch to GitHub
git push origin feature/your-name/what-youre-building
```

Then open a **Pull Request into `develop`** on GitHub:
- Write a short description of what you built and why.
- If it fixes a bug, mention the issue.
- Ask a teammate to review before merging.

### After the PR is merged

```bash
# Switch back to develop and pull the merged changes
git checkout develop
git pull origin develop

# Delete your local feature branch (it's now merged, you don't need it)
git branch -d feature/your-name/what-youre-building
```

### Commit message style

```
feat: add family chat to FamilyResidentView
fix: correct Gemini model name in handover route
chore: update .env.example with GEMINI_API_KEY
```

Use `feat:` for new things, `fix:` for bugs, `chore:` for config/tooling, `docs:` for README changes.

---

## Environment Variables

See `.env.example` for all required variables and where to get them.  
**Never commit `.env.local` or any file containing real secrets.**
