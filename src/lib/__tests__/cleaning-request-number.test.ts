import assert from "node:assert/strict";
import test from "node:test";
import { getNextCleaningRequestNumber, isRequestNumberCollision } from "../cleaning-request-number";

test("generates the next sequence within the business year", () => {
  assert.equal(getNextCleaningRequestNumber(["JC-2026-0001", "JC-2026-0002", "JC-2025-0099"], new Date("2026-08-11T16:00:00Z")), "JC-2026-0003");
});

test("resets the sequence for a new business year", () => {
  assert.equal(getNextCleaningRequestNumber(["JC-2025-0087"], new Date("2026-01-01T04:00:00Z")), "JC-2025-0088");
  assert.equal(getNextCleaningRequestNumber(["JC-2025-0087"], new Date("2026-01-01T06:00:00Z")), "JC-2026-0001");
});

test("allows the visible sequence to expand beyond four digits", () => {
  assert.equal(getNextCleaningRequestNumber(["JC-2026-9999"], new Date("2026-08-11T16:00:00Z")), "JC-2026-10000");
});

test("only request-number unique violations are retryable", () => {
  assert.equal(isRequestNumberCollision({ code: "P2002", meta: { target: ["requestNumber"] } }), true);
  assert.equal(isRequestNumberCollision({ code: "P2002", meta: { target: ["serviceId"] } }), false);
  assert.equal(isRequestNumberCollision({ code: "P1001" }), false);
});
