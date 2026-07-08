# Contributing to TraceWell

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code only. Protected — no direct pushes. |
| `develop` | Integration branch. All features merge here first. |
| `feature/<name>/<desc>` | Your working branch. Branch off `develop`. |

## Workflow

1. Branch off `develop`:
   ```bash
   git checkout develop && git pull
   git checkout -b feature/yourname/short-description
   ```

2. Commit often with clear messages:
   ```bash
   git commit -m "feat: add voice-to-text recording component"
   git commit -m "fix: correct auth redirect for nurse role"
   git commit -m "docs: update README setup steps"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org): `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

3. Push and open a Pull Request into `develop`:
   - Assign at least one other team member to review
   - CI must pass (type check + lint) before merging
   - Delete the branch after merge

4. Periodically merge `develop` → `main` as a group milestone.

## Environment

- Copy `.env.example` to `.env.local` and fill in your own values
- **Never commit `.env.local`** — it is in `.gitignore`
- Share secrets with teammates via a private channel, not the repo
