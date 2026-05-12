# coderabbit-node-app

TypeScript Node.js sample with GitHub Actions CI and optional **local Ollama** PR review.

## Prerequisites

- **Node.js 20+** (matches CI; use `nvm use` if you have `.nvmrc`)
- **npm** (lockfile: `package-lock.json`)

## Start the project

```bash
git clone <repository-url>
cd rabbit
nvm use                    # optional; reads .nvmrc → 20
npm ci
npm run lint               # ESLint
npm test                   # Jest
npm run build              # compile to dist/
npm start                  # run compiled app (needs build first)
```

## Useful scripts

| Command | Description |
|--------|-------------|
| `npm run ci` | Lint + test (`--ci`) + build (same as CI job) |
| `npm run dashboard` | Local AI dashboard at http://127.0.0.1:3847/ |
| `npm run ai-review:local` | Ollama diff review vs `origin/main...HEAD` (needs [Ollama](https://ollama.com/) running) |

## GitHub Actions

| Workflow | When | Runner |
|----------|------|--------|
| **Node.js CI** (`.github/workflows/node-ci.yml`) | `pull_request`, push to `main` | `ubuntu-latest` |
| **Ollama AI review** (`.github/workflows/ollama-ai-review.yml`) | `pull_request` | **self-hosted** (machine with Ollama) |

Ollama setup and runner registration: **[docs/OLLAMA-AI-REVIEW.md](docs/OLLAMA-AI-REVIEW.md)**.

## CodeRabbit

Install the [CodeRabbit GitHub App](https://github.com/apps/coderabbit/) and tune **`.coderabbit.yaml`** at the repo root. Reviews run in GitHub; no extra CI job is required.

## Layout

```
src/                    TypeScript sources
scripts/                ai-review.sh, dashboard-server.cjs, …
public/ai-dashboard.html
.github/workflows/      node-ci.yml, ollama-ai-review.yml
.coderabbit.yaml
```
