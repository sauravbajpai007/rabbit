import {
  buildDummyActivityLines,
  dummyCiRingPercents,
  DUMMY_WORKFLOW_JOBS,
  findDummyJob,
} from "./dashboardDummyData";

describe("dashboardDummyData", () => {
  it("exposes six workflow rows", () => {
    expect(DUMMY_WORKFLOW_JOBS).toHaveLength(6);
    expect(findDummyJob("semgrep")?.label).toBe("Semgrep");
  });

  it("builds bounded ring demo percents", () => {
    const a = dummyCiRingPercents(0);
    const b = dummyCiRingPercents(999);
    for (const x of [a, b]) {
      expect(x.ci).toBeGreaterThanOrEqual(72);
      expect(x.ci).toBeLessThanOrEqual(93);
      expect(x.security).toBeGreaterThanOrEqual(68);
      expect(x.security).toBeLessThanOrEqual(91);
      expect(x.ai).toBeGreaterThanOrEqual(55);
      expect(x.ai).toBeLessThanOrEqual(84);
    }
  });

  it("builds activity lines with ISO timestamps", () => {
    const lines = buildDummyActivityLines(3, 4);
    expect(lines).toHaveLength(4);
    expect(lines[0]?.message).toBeTruthy();
    expect(lines[0]?.timestampIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
