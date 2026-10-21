import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { canCompose, MAX_EXCHANGES, reviewForExchange } from "./round-rules";

describe("round controls", () => {
  test("typed replies become available at exchange 3, not 2", () => {
    assert.equal(canCompose(2, false, false), false);
    assert.equal(canCompose(3, false, false), true);
    assert.equal(canCompose(3, false, false, false), false);
    assert.equal(canCompose(4, false, true), false);
    assert.equal(canCompose(6, true, false), false);
  });
  test("round progress ends at six exchanges", () => {
    assert.equal(MAX_EXCHANGES, 6);
  });
  test("both reflections are scheduled, including the final exchange", () => {
    assert.equal(reviewForExchange(4), 1);
    assert.equal(reviewForExchange(6), 2);
    assert.equal(reviewForExchange(5), null);
  });
});