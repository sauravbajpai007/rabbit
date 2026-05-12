#!/usr/bin/env node
/**
 * CI: GPT review from git diff — pull_request (PR comment) or push to main (commit comment).
 *
 * Env: OPENAI_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_EVENT_PATH,
 *      DIFF_REVIEW_MODEL (optional)
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const MARKER_PR = "<!-- gpt-diff-review-bot -->";
const MARKER_PUSH = "<!-- gpt-diff-review-bot-push -->";
const MAX_DIFF_CHARS = 100_000;
const MODEL = process.env.DIFF_REVIEW_MODEL || "gpt-4o-mini";

function loadEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p) {
    return null;
  }
  return JSON.parse(readFileSync(p, "utf8"));
}

function getDiffRange(fromSha, toSha) {
  const emptySha = "0".repeat(40);
  if (!fromSha || fromSha === emptySha) {
    try {
      return execSync(`git show ${toSha}`, {
        encoding: "utf8",
        maxBuffer: 12 * 1024 * 1024,
      });
    } catch {
      return "";
    }
  }
  try {
    return execSync(`git diff ${fromSha}...${toSha}`, {
      encoding: "utf8",
      maxBuffer: 12 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

async function openaiReview(diff) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const truncated = diff.length > MAX_DIFF_CHARS;
  const body = diff.slice(0, MAX_DIFF_CHARS);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a senior engineer reviewing a git diff. List concrete issues: bugs, security, " +
            "performance, breaking changes, missing tests. Be brief. Use markdown bullets. Max ~400 words.",
        },
        {
          role: "user",
          content:
            (truncated ? `(Diff truncated to ${MAX_DIFF_CHARS} chars)\n\n` : "") +
            "```diff\n" +
            body +
            "\n```",
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI HTTP ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = (await res.json());
  const text = data.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("Unexpected OpenAI response shape");
  }
  return text;
}

async function findExistingPrComment(repo, prNumber, token) {
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    return null;
  }
  const comments = await res.json();
  if (!Array.isArray(comments)) {
    return null;
  }
  return comments.find((c) => typeof c.body === "string" && c.body.includes(MARKER_PR));
}

async function postOrUpdatePrComment(repo, prNumber, token, body) {
  const full = `${MARKER_PR}\n## GPT diff review (custom CI)\n\n${body}`;
  const existing = await findExistingPrComment(repo, prNumber, token);
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
  if (existing?.id) {
    const url = `https://api.github.com/repos/${repo}/issues/comments/${existing.id}`;
    const res = await fetch(url, { method: "PATCH", headers, body: JSON.stringify({ body: full }) });
    if (!res.ok) {
      throw new Error(`GitHub update PR comment failed: ${res.status} ${await res.text()}`);
    }
    return;
  }
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ body: full }) });
  if (!res.ok) {
    throw new Error(`GitHub post PR comment failed: ${res.status} ${await res.text()}`);
  }
}

async function postCommitComment(repo, commitSha, token, body) {
  const full = `${MARKER_PUSH}\n## GPT diff review (push)\n\n${body}`;
  const url = `https://api.github.com/repos/${repo}/commits/${commitSha}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body: full }),
  });
  if (!res.ok) {
    throw new Error(`GitHub post commit comment failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  const ev = loadEvent();
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    console.error("Missing GITHUB_REPOSITORY or GITHUB_TOKEN.");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY.");
    process.exit(1);
  }

  if (ev.pull_request) {
    const pr = ev.pull_request;
    const diff = getDiffRange(pr.base.sha, pr.head.sha);
    if (!diff.trim()) {
      console.log("No diff for PR; skipping OpenAI call.");
      process.exit(0);
    }
    const summary = await openaiReview(diff);
    await postOrUpdatePrComment(repo, String(pr.number), token, summary);
    console.log("Posted GPT diff review on PR.");
    return;
  }

  if (ev.commits && typeof ev.after === "string") {
    const before = typeof ev.before === "string" ? ev.before : "";
    const after = ev.after;
    const diff = getDiffRange(before, after);
    if (!diff.trim()) {
      console.log("No diff for push; skipping OpenAI call.");
      process.exit(0);
    }
    const summary = await openaiReview(diff);
    await postCommitComment(repo, after, token, summary);
    console.log("Posted GPT diff review as commit comment.");
    return;
  }

  console.error("Unsupported GitHub event (need pull_request or push with commits).");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
