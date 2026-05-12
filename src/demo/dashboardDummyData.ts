/**
 * Placeholder data shaped like CI / dashboard widgets.
 * Safe to delete once real GitHub or CodeRabbit APIs are wired in.
 */

export type WorkflowJobId =
  | "lint_test_build"
  | "semgrep"
  | "sonarqube"
  | "coderabbit_config"
  | "ai_pr_reviewer"
  | "custom_openai_diff";

export interface DummyJobRow {
  readonly id: WorkflowJobId;
  readonly label: string;
  readonly trigger: string;
  readonly notes: string;
}

/** Mirrors the dashboard jobs table (static reference). */
export const DUMMY_WORKFLOW_JOBS: readonly DummyJobRow[] = [
  {
    id: "lint_test_build",
    label: "Lint, test & build",
    trigger: "PR + main",
    notes: "Node 20, npm ci, gate for merge",
  },
  {
    id: "semgrep",
    label: "Semgrep",
    trigger: "PR + main",
    notes: "Security scan on ./src",
  },
  {
    id: "sonarqube",
    label: "SonarCloud",
    trigger: "Optional",
    notes: "SONAR_TOKEN + sonar-project.properties",
  },
  {
    id: "coderabbit_config",
    label: "CodeRabbit config",
    trigger: "PR + push main",
    notes: "Validates .coderabbit.yaml",
  },
  {
    id: "ai_pr_reviewer",
    label: "AI PR reviewer",
    trigger: "PR",
    notes: "coderabbitai/ai-pr-reviewer + OpenAI",
  },
  {
    id: "custom_openai_diff",
    label: "Custom OpenAI diff",
    trigger: "PR + push main",
    notes: "scripts/openai-diff-review.mjs",
  },
];

export interface DummyActivityLine {
  readonly timestampIso: string;
  readonly message: string;
}

const ACTIVITY_TEMPLATES: readonly string[] = [
  "Workflow dispatch: lint cache warm",
  "Semgrep: ruleset auto — 0 blocking on src/",
  "Dependabot: skipped (not configured)",
  "CodeRabbit: waiting for PR event",
  "OpenAI diff job: idle until secret present",
  "Branch protection: require status checks",
  "Artifact: dist/ not uploaded in this template",
] as const;

/** Deterministic fake log lines for UI demos (seed = e.g. uptime seconds). */
export function buildDummyActivityLines(seed: number, count: number): DummyActivityLine[] {
  const n = Math.max(0, Math.min(20, Math.floor(count)));
  const base = new Date();
  const out: DummyActivityLine[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = new Date(base.getTime() - i * 5000);
    const msg = ACTIVITY_TEMPLATES[(seed + i) % ACTIVITY_TEMPLATES.length] ?? "";
    out.push({
      timestampIso: t.toISOString(),
      message: msg,
    });
  }
  return out;
}

/** Same formula as the dashboard decorative rings (demo only). */
export function dummyCiRingPercents(uptimeSeconds: number): {
  readonly ci: number;
  readonly security: number;
  readonly ai: number;
} {
  const up = Math.max(0, Math.floor(uptimeSeconds));
  const phase = (up * 17) % 100;
  return {
    ci: 72 + (phase % 22),
    security: 68 + ((phase + 31) % 24),
    ai: 55 + ((phase + 7) % 30),
  };
}

export function findDummyJob(id: WorkflowJobId): DummyJobRow | undefined {
  return DUMMY_WORKFLOW_JOBS.find((j) => j.id === id);
}
