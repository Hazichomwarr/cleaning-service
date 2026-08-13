import assert from "node:assert/strict";
import test from "node:test";
import { canShowNewRequestActions } from "../admin-request-actions.js";

test("only NEW requests expose the Accept and Decline action surface", () => {
  assert.equal(canShowNewRequestActions("NEW"), true);
  for (const status of ["REVIEWING", "CANCELLED", "COMPLETED"] as const) {
    assert.equal(canShowNewRequestActions(status), false);
  }
});
