import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isWorkerEligibleForProperty } from "../cleaning-request-worker-eligibility";

describe("cleaning worker eligibility", () => {
  it("allows crew only for residential properties", () => {
    for (const propertyType of ["HOUSE", "APARTMENT", "AIRBNB"] as const) { assert.equal(isWorkerEligibleForProperty(propertyType, "CREW"), true); assert.equal(isWorkerEligibleForProperty(propertyType, "CONTRACTOR"), false); }
  });
  it("allows both worker types for non-residential and OTHER properties", () => {
    for (const propertyType of ["OFFICE", "COMMERCIAL", "OTHER"] as const) { assert.equal(isWorkerEligibleForProperty(propertyType, "CREW"), true); assert.equal(isWorkerEligibleForProperty(propertyType, "CONTRACTOR"), true); }
  });
});
