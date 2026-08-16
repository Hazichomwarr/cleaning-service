import assert from "node:assert/strict";
import test from "node:test";
import { getRequestFlowSectionForField, getRequestFlowStepIndex, getRequestFlowSteps, type RequestFlowMode } from "../request-flow";
import { validateCleaningRequest } from "../../services/cleaning-request-validation.service";

test("defines the six-step new-customer flow", () => {
  assert.deepEqual(getRequestFlowSteps("NEW_CUSTOMER").map((step) => step.id), ["PROPERTY", "SERVICE", "EXTRAS", "SCHEDULE", "CONTACT", "REVIEW"]);
  assert.equal(getRequestFlowSteps("NEW_CUSTOMER").length, 6);
  assert.equal(getRequestFlowSteps("NEW_CUSTOMER")[0].label, "Property");
});

test("defines four saved-property and five different-property steps", () => {
  assert.deepEqual(getRequestFlowSteps("RETURNING_SAVED_PROPERTY").map((step) => step.id), ["SERVICE", "EXTRAS", "SCHEDULE", "REVIEW"]);
  assert.deepEqual(getRequestFlowSteps("RETURNING_NEW_PROPERTY").map((step) => step.id), ["PROPERTY", "SERVICE", "EXTRAS", "SCHEDULE", "REVIEW"]);
  assert.equal(getRequestFlowStepIndex("RETURNING_SAVED_PROPERTY", "SERVICE"), 0);
  assert.equal(getRequestFlowStepIndex("RETURNING_NEW_PROPERTY", "PROPERTY"), 0);
});

test("routes validation fields by semantic section instead of global indexes", () => {
  assert.equal(getRequestFlowSectionForField("customerEmail"), "CONTACT");
  assert.equal(getRequestFlowSectionForField("addressLine1"), "CONTACT");
  assert.equal(getRequestFlowSectionForField("addressLine1", "RETURNING_NEW_PROPERTY"), "PROPERTY");
  assert.equal(getRequestFlowSectionForField("customerNotes"), "REVIEW");
  for (const mode of ["RETURNING_SAVED_PROPERTY", "RETURNING_NEW_PROPERTY"] satisfies RequestFlowMode[]) assert.equal(getRequestFlowSteps(mode).some((step) => step.id === "CONTACT"), false);
});

test("returning submissions may omit contact fields without weakening normal validation", async () => {
  const input = { serviceId: "service-1", propertyType: "HOUSE", bedrooms: 2, bathrooms: "1.5", extraIds: [], preferredDate: "2026-08-21", preferredTimeWindow: "MORNING", customerNotes: "Gate code", savedPropertyId: "property-1", useReturningCustomerContext: true };
  const referenceReader = { findServiceById: async () => ({ id: "service-1", isActive: true }), findActiveExtrasByIds: async () => [] };
  const returning = await validateCleaningRequest(input, { allowReturningCustomer: true, now: new Date("2026-08-11T16:00:00Z"), referenceReader });
  assert.equal(returning.success, true);
  const normal = await validateCleaningRequest(input, { now: new Date("2026-08-11T16:00:00Z"), referenceReader });
  assert.equal(normal.success, false);
});
