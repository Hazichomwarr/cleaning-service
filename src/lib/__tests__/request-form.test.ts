import assert from "node:assert/strict";
import test from "node:test";
import { getEarliestRequestErrorStep, mapEstimateResult, REQUEST_STEP, updateRequestDraft } from "../request-form";

test("uses the property-first request step order", () => {
  assert.deepEqual(REQUEST_STEP, { PROPERTY: 0, SERVICE: 1, SCHEDULE: 2, DETAILS: 3, REVIEW: 4 });
  assert.equal(getEarliestRequestErrorStep({ serviceId: ["missing"] }), REQUEST_STEP.SERVICE);
  assert.equal(getEarliestRequestErrorStep({ bedrooms: ["required"], customerEmail: ["invalid"] }), REQUEST_STEP.PROPERTY);
  assert.equal(getEarliestRequestErrorStep({ customerEmail: ["invalid"] }), REQUEST_STEP.DETAILS);
});

test("draft updates preserve the other collected fields", () => {
  const draft = { serviceId: "service-1", serviceName: "Standard Cleaning", propertyType: "HOUSE" as const, bedrooms: 2, bathrooms: "1.5", extraIds: ["extra-1"], preferredDate: "2026-08-21", preferredTimeWindow: "Morning", customerName: "Ava", customerEmail: "ava@example.com", customerPhone: "555-1111", addressLine1: "1 Main St", addressLine2: "", city: "Newark", state: "NJ", postalCode: "07102", customerNotes: "Gate code" };
  const updated = updateRequestDraft(draft, "customerPhone", "555-2222");
  assert.equal(updated.customerPhone, "555-2222");
  assert.equal(updated.serviceId, "service-1");
  assert.deepEqual(updated.extraIds, ["extra-1"]);
});

test("public estimate results map to user-facing states", () => {
  assert.deepEqual(mapEstimateResult({ success: true, estimate: { amount: "200.00", currency: "USD" } }), { status: "success", amount: "200.00" });
  assert.deepEqual(mapEstimateResult({ success: false, reason: "MANUAL_QUOTE_REQUIRED" }), { status: "manual" });
  assert.deepEqual(mapEstimateResult({ success: false, reason: "NO_CONFIGURED_ESTIMATE" }), { status: "unconfigured" });
});
