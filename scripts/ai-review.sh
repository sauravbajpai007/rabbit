#!/usr/bin/env bash
# =============================================================================
# Local Ollama PR diff review — for self-hosted GitHub Actions or manual runs.
#
# Outputs (repo root by default):
#   review.md   — Markdown (Critical / Warning / Suggestion / Summary)
#   review.txt  — same body as plain text
#   review.json — optional machine-readable (set OLLAMA_OUTPUT_JSON=1)
#
# Environment:
#   OLLAMA_HOST                 default http://127.0.0.1:11434
#   OLLAMA_MODEL                default qwen2.5-coder:7b (or e.g. deepseek-coder:6.7b)
#   GITHUB_EVENT_PATH           set by Actions for pull_request events
#   AI_REVIEW_MAX_DIFF_CHARS    default 120000
#   OLLAMA_REQUEST_TIMEOUT_SEC  default 1800
#   OLLAMA_OUTPUT_JSON          set to 1 to request JSON-shaped model output
#
# Manual usage (no GITHUB_EVENT_PATH):
#   ./scripts/ai-review.sh [base_ref] [head_ref]
#   Example: ./scripts/ai-review.sh origin/main HEAD
# =============================================================================
set -euo pipefail

OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5-coder:7b}"
MAX_DIFF_CHARS="${AI_REVIEW_MAX_DIFF_CHARS:-120000}"
TIMEOUT_SEC="${OLLAMA_REQUEST_TIMEOUT_SEC:-1800}"
OUT_MD="${AI_REVIEW_MD:-review.md}"
OUT_TXT="${AI_REVIEW_TXT:-review.txt}"
OUT_JSON="${AI_REVIEW_JSON:-review.json}"
DIFF_FILE="${AI_REVIEW_DIFF_FILE:-.ai-review-diff.patch}"
PROMPT_FILE="${AI_REVIEW_PROMPT_FILE:-.ai-review-prompt.txt}"
REQ_FILE="${AI_REVIEW_REQUEST_FILE:-.ai-review-request.json}"
RESP_FILE="${AI_REVIEW_RESPONSE_FILE:-.ai-review-response.json}"

log() { printf '%s\n' "$*" >&2; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "ERROR: missing required command: $1"
    exit 127
  fi
}

ollama_health() {
  curl -fsS --max-time 30 "${OLLAMA_HOST}/api/tags" >/dev/null
}

write_diff_from_github_event() {
  require_cmd python3
  require_cmd git
  python3 - "$GITHUB_EVENT_PATH" "$DIFF_FILE" <<'PY'
import json, subprocess, sys

path, out = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    ev = json.load(f)
pr = ev.get("pull_request")
if not pr:
    raise SystemExit("GITHUB_EVENT_PATH is not a pull_request payload")
base = (pr.get("base") or {}).get("sha") or ""
head = (pr.get("head") or {}).get("sha") or ""
if not base or not head:
    raise SystemExit("pull_request missing base.sha or head.sha")
text = subprocess.run(
    ["git", "diff", base, head],
    check=False,
    capture_output=True,
    text=True,
).stdout
open(out, "w", encoding="utf-8").write(text)
PY
}

write_diff_manual() {
  require_cmd git
  local base="${1:-origin/main}"
  local head="${2:-HEAD}"
  git fetch origin 2>/dev/null || true
  git diff "${base}...${head}" >"$DIFF_FILE" || true
}

truncate_diff() {
  require_cmd python3
  python3 - "$DIFF_FILE" "$MAX_DIFF_CHARS" <<'PY'
import pathlib, sys
p = pathlib.Path(sys.argv[1])
limit = int(sys.argv[2])
t = p.read_text(encoding="utf-8", errors="replace")
if len(t) > limit:
    t = t[:limit] + "\n\n[TRUNCATED: exceeded AI_REVIEW_MAX_DIFF_CHARS]\n"
p.write_text(t, encoding="utf-8")
PY
}

build_prompt_file() {
  require_cmd python3
  python3 - "$DIFF_FILE" "$PROMPT_FILE" <<'PY'
import pathlib, sys

diff_path = pathlib.Path(sys.argv[1])
out_path = pathlib.Path(sys.argv[2])
diff = diff_path.read_text(encoding="utf-8", errors="replace")

prompt = f"""You are a principal engineer reviewing a pull request git diff.

Find: bugs, security issues, performance problems, bad practices, readability issues.

Respond in **Markdown only** with this exact heading structure:

### Critical
- (bullets; or single line: None)

### Warning
- (bullets; or None)

### Suggestion
- (bullets; or None)

### Summary
2-4 concise sentences with actionable next steps.

```diff
{diff}
```
"""
out_path.write_text(prompt, encoding="utf-8")
PY
}

build_ollama_request() {
  require_cmd python3
  local json_mode="${OLLAMA_OUTPUT_JSON:-0}"
  python3 - "$PROMPT_FILE" "$OLLAMA_MODEL" "$REQ_FILE" "$json_mode" <<'PY'
import json, pathlib, sys

prompt_path = pathlib.Path(sys.argv[1])
model = sys.argv[2]
out_path = pathlib.Path(sys.argv[3])
json_mode = sys.argv[4] == "1"

prompt = prompt_path.read_text(encoding="utf-8")
body: dict = {
    "model": model,
    "prompt": prompt,
    "stream": False,
    "options": {"temperature": 0.15, "num_ctx": 8192},
}
if json_mode:
    body["format"] = "json"
    body["prompt"] = (
        prompt
        + "\n\nAlso return a JSON object with keys "
          "critical (array of strings), warning (array), suggestion (array), summary (string). "
          "Merge this JSON as the only content if format=json."
    )
out_path.write_text(json.dumps(body), encoding="utf-8")
PY
}

call_ollama() {
  require_cmd curl
  curl -sS --max-time "$TIMEOUT_SEC" \
    -H "Content-Type: application/json" \
    --data-binary "@${REQ_FILE}" \
    "${OLLAMA_HOST}/api/generate" -o "$RESP_FILE"
}

extract_markdown() {
  require_cmd python3
  python3 - "$RESP_FILE" "$OUT_MD" "$OUT_TXT" "$OUT_JSON" "${OLLAMA_OUTPUT_JSON:-0}" <<'PY'
import json, pathlib, sys

resp_path = pathlib.Path(sys.argv[1])
md_path = pathlib.Path(sys.argv[2])
txt_path = pathlib.Path(sys.argv[3])
json_path = pathlib.Path(sys.argv[4])
json_mode = sys.argv[5] == "1"

raw = json.loads(resp_path.read_text(encoding="utf-8"))
text = raw.get("response") or ""
md_path.write_text(text.strip() + "\n", encoding="utf-8")
txt_path.write_text(text.strip() + "\n", encoding="utf-8")

if json_mode:
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = {"parse_error": True, "raw": text[:8000]}
    json_path.write_text(json.dumps(parsed, indent=2) + "\n", encoding="utf-8")
PY
}

main() {
  require_cmd git
  require_cmd curl
  require_cmd python3

  if [[ -n "${GITHUB_EVENT_PATH:-}" && -f "${GITHUB_EVENT_PATH}" ]]; then
    write_diff_from_github_event
  else
    write_diff_manual "${1:-}" "${2:-}"
  fi

  if [[ ! -s "$DIFF_FILE" ]]; then
    {
      echo "### Critical"
      echo "- None (empty diff)"
      echo ""
      echo "### Warning"
      echo "- None"
      echo ""
      echo "### Suggestion"
      echo "- None"
      echo ""
      echo "### Summary"
      echo "No file changes in diff range."
    } | tee "$OUT_MD" >"$OUT_TXT"
    log "INFO: empty diff; wrote stub $OUT_MD"
    exit 0
  fi

  if ! ollama_health; then
    log "ERROR: Ollama not reachable at ${OLLAMA_HOST}"
    exit 1
  fi

  truncate_diff
  build_prompt_file
  build_ollama_request
  log "INFO: calling Ollama model=${OLLAMA_MODEL} (timeout ${TIMEOUT_SEC}s)…"
  call_ollama
  extract_markdown
  log "INFO: wrote ${OUT_MD}, ${OUT_TXT}"
  if [[ "${OLLAMA_OUTPUT_JSON:-0}" == "1" ]]; then
    log "INFO: wrote ${OUT_JSON}"
  fi
}

main "$@"
