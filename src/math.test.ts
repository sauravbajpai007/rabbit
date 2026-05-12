import { add, subtract } from "./math";

describe("math", () => {
  describe("add", () => {
    it("sums two numbers", () => {
      expect(add(2, 3)).toBe(5);
    });
  });

  describe("subtract", () => {
    it("returns the difference", () => {
      expect(subtract(10, 4)).toBe(6);
    });
  });
});
