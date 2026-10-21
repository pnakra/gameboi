import { describe, expect, test } from "bun:test";
import { canCompose, MAX_EXCHANGES, reviewForExchange } from "./round-rules";

describe("round controls", () => {
  test("typed replies become available at exchange 3, not 2", () => {
    expect(canCompose(2, false, false)).toBe(false);
    expect(canCompose(3, false, false)).toBe(true);
    expect(canCompose(3, false, false, false)).toBe(false);
    expect(canCompose(4, false, true)).toBe(false);
    expect(canCompose(6, true, false)).toBe(false);
  });
  test("round progress ends at six exchanges", () => {
    expect(MAX_EXCHANGES).toBe(6);
  });
  test("both reflections are scheduled, including the final exchange", () => {
    expect(reviewForExchange(4)).toBe(1);
    expect(reviewForExchange(6)).toBe(2);
    expect(reviewForExchange(5)).toBeNull();
  });
});