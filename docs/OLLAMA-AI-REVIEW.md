# Ollama — local / private AI code review

This repo includes an **offline-friendly** PR diff review using **Ollama** on a **self-hosted GitHub Actions runner**. GitHub-hosted runners cannot reach your workstation Ollama, so the workflow **does not run** until you register a runner that can see `127.0.0.1:11434` (or your LAN Ollama host).

## 1. Install Ollama (runner machine)

**Linux**

```bash
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl enable --now ollama   # if your distro uses systemd
```

**macOS**

```bash
brew install ollama
ollama serve   # or run as a background service per Homebrew notes
```

Verify:

```bash
curl -sS http://127.0.0.1:11434/api/tags | head
```

## 2. Pull a coding model

Pick one (both work well for diffs):

```bash
ollama pull qwen2.5-coder:7b
# or
ollama pull deepseek-coder:6.7b
```

Default in `scripts/ai-review.sh` is `qwen2.5-coder:7b`. Override with env `OLLAMA_MODEL` or GitHub variable `OLLAMA_MODEL`.

## 3. Local review (no GitHub)

From the repo root (requires `git`, `curl`, `python3`, Ollama running):

```bash
chmod +x scripts/ai-review.sh
git update-index --chmod=+x scripts/ai-review.sh   # persist executable bit in git
./scripts/ai-review.sh origin/main HEAD
# outputs: review.md, review.txt (and review.json if OLLAMA_OUTPUT_JSON=1)
```

Or:

```bash
npm run ai-review:local
```

## 4. Self-hosted GitHub Actions runner

1. In GitHub: **Settings → Actions → Runners → New self-hosted runner** and follow OS-specific install steps.
2. Install the runner on the **same host** as Ollama (or a host that can reach `OLLAMA_HOST`).
3. Install **git**, **curl**, **python3** on that machine.
4. (Optional) Install [GitHub CLI](https://cli.github.com/) if you want `POST_OLLAMA_REVIEW_COMMENT`.

Label the runner (recommended) e.g. `self-hosted`, `linux`, `ollama`, then edit `.github/workflows/ollama-ai-review.yml`:

```yaml
runs-on: [self-hosted, linux, ollama]
```

## 5. Repository variables (optional)

| Variable | Example | Purpose |
|----------|---------|---------|
| `OLLAMA_MODEL` | `deepseek-coder:6.7b` | Model id for Ollama |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | API base URL |
| `OLLAMA_JSON_OUTPUT` | `true` | Ask Ollama for JSON mode + write `review.json` |
| `POST_OLLAMA_REVIEW_COMMENT` | `true` | Post `review.md` as a PR comment via `gh` |

## 6. Workflow file

- `.github/workflows/ollama-ai-review.yml` — triggers on `pull_request`, `runs-on: self-hosted`, uploads **artifacts**, optional PR comment, timeouts, cleanup of temp files.

## 7. Security notes

- Code in the diff is sent to **your** Ollama process — it does not leave your network if Ollama is local.
- The optional PR comment step uses `GITHUB_TOKEN` (no third-party secret).
- Lock down the self-hosted runner VM; it runs arbitrary CI from the repo.

## 8. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Workflow queued forever | No self-hosted runner online or labels mismatch |
| `Ollama not reachable` | `ollama serve`, firewall, or set `OLLAMA_HOST` |
| Empty `review.md` | Check `git diff` range; verify checkout `fetch-depth: 0` |
| `gh pr comment` skipped | Install `gh` and auth the runner, or disable `POST_OLLAMA_REVIEW_COMMENT` |

## 9. Repository layout (relevant paths)

```
.github/workflows/ollama-ai-review.yml   # CI entry
scripts/ai-review.sh                     # Bash + curl + python helpers
review.md                                 # Generated (gitignored)
docs/OLLAMA-AI-REVIEW.md                   # This file
```
