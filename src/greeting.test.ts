import { buildGreeting } from "./greeting";

describe("buildGreeting", () => {
  it("uses a default when name is blank", () => {
    expect(buildGreeting("")).toBe("Hello, world!");
    expect(buildGreeting("   ")).toBe("Hello, world!");
  });

  it("greets a trimmed name", () => {
    expect(buildGreeting("  Ada  ")).toBe("Hello, Ada!");
  });
});
