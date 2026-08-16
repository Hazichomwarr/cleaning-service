import assert from "node:assert/strict";
import test from "node:test";
import { getBusinessDate, validateCleaningRequest, type CleaningRequestReferenceReader } from "../cleaning-request-validation.service";

const now = new Date("2026-08-11T16:00:00.000Z");
const today = getBusinessDate(now);

const reader = (overrides: Partial<CleaningRequestReferenceReader> = {}): CleaningRequestReferenceReader => ({
  findServiceById: async (id) => id === "service-1" ? { id, isActive: true } : null,
  findActiveExtrasByIds: async (ids) => ids.filter((id) => id !== "inactive-extra").map((id) => ({ id })),
  ...overrides,
});

function input(overrides: Record<string, unknown> = {}) {
  return {
    serviceId: " service-1 ", propertyType: "HOUSE", bedrooms: 2, bathrooms: "1.5", extraIds: ["extra-1"],
    preferredDate: today, preferredTimeWindow: "Morning", customerName: "  Jane Smith  ", customerEmail: "Jane@Example.COM", customerPhone: "(973) 555-1234",
    addressLine1: " 123 Main St ", addressLine2: "  ", city: "Newark", state: "nj", postalCode: "07102", customerNotes: "  ", ...overrides,
  };
}

test("validates and normalizes a complete residential request", async () => {
  const result = await validateCleaningRequest(input(), { now, referenceReader: reader() });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data, {
    serviceId: "service-1", propertyType: "HOUSE", bedrooms: 2, bathrooms: "1.5", extraIds: ["extra-1"], preferredDate: today,
    preferredTimeWindow: "MORNING", customerName: "Jane Smith", customerEmail: "jane@example.com", customerPhone: "+19735551234",
    addressLine1: "123 Main St", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", customerNotes: null,
  });
});

for (const propertyType of ["APARTMENT", "AIRBNB"] as const) {
  test(`${propertyType} requires and accepts positive bedrooms`, async () => {
    const result = await validateCleaningRequest(input({ propertyType }), { now, referenceReader: reader() });
    assert.equal(result.success, true);
  });
}

for (const propertyType of ["OFFICE", "COMMERCIAL", "OTHER"] as const) {
  test(`${propertyType} is valid without bedrooms and discards stale bedroom data`, async () => {
    const result = await validateCleaningRequest(input({ propertyType, bedrooms: 3 }), { now, referenceReader: reader() });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.bedrooms, null);
  });
}

for (const propertyType of ["HOUSE", "APARTMENT", "AIRBNB", "OFFICE", "COMMERCIAL", "OTHER"] as const) {
  test(`${propertyType} accepts an omitted bathroom count`, async () => {
    const result = await validateCleaningRequest(input({ propertyType, bathrooms: undefined }), { now, referenceReader: reader() });
    assert.equal(result.success, true);
    if (result.success) assert.equal(result.data.bathrooms, null);
  });
}

test("accepts five bedrooms even without a pricing rule", async () => {
  const result = await validateCleaningRequest(input({ bedrooms: 5 }), { now, referenceReader: reader() });
  assert.equal(result.success, true);
});

for (const bedrooms of [undefined, 0, 2.5]) {
  test(`rejects invalid residential bedrooms: ${String(bedrooms)}`, async () => {
    const result = await validateCleaningRequest(input({ bedrooms }), { now, referenceReader: reader() });
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.fieldErrors?.bedrooms);
  });
}

test("validates bathrooms to one decimal place without rounding", async () => {
  assert.equal((await validateCleaningRequest(input({ bathrooms: 2 }), { now, referenceReader: reader() })).success, true);
  assert.equal((await validateCleaningRequest(input({ bathrooms: 1 }), { now, referenceReader: reader() })).success, true);
  assert.equal((await validateCleaningRequest(input({ bathrooms: 1.5 }), { now, referenceReader: reader() })).success, true);
  assert.equal((await validateCleaningRequest(input({ bathrooms: "1.25" }), { now, referenceReader: reader() })).success, false);
});

test("rejects non-positive or malformed bathrooms with one field error", async () => {
  for (const bathrooms of [0, -1, "0", "-1", "not-a-number", "1.25"]) {
    const result = await validateCleaningRequest(input({ bathrooms }), { now, referenceReader: reader() });
    assert.equal(result.success, false);
    if (!result.success) assert.equal(result.fieldErrors?.bathrooms?.length, 1);
  }
});

test("normalizes a blank bathroom count to null", async () => {
  const result = await validateCleaningRequest(input({ bathrooms: "   " }), { now, referenceReader: reader() });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.bathrooms, null);
});

test("deduplicates extras and permits no extras", async () => {
  const result = await validateCleaningRequest(input({ extraIds: ["extra-1", "extra-1", "extra-2"] }), { now, referenceReader: reader() });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.extraIds, ["extra-1", "extra-2"]);
  assert.equal((await validateCleaningRequest(input({ extraIds: [] }), { now, referenceReader: reader() })).success, true);
});

test("rejects unavailable service and extras", async () => {
  const missingService = await validateCleaningRequest(input({ serviceId: "missing" }), { now, referenceReader: reader() });
  assert.equal(missingService.success, false);
  if (!missingService.success) assert.equal(missingService.reason, "SERVICE_UNAVAILABLE");
  const inactiveService = await validateCleaningRequest(input(), { now, referenceReader: reader({ findServiceById: async () => ({ id: "service-1", isActive: false }) }) });
  assert.equal(inactiveService.success, false);
  const inactiveExtra = await validateCleaningRequest(input({ extraIds: ["inactive-extra"] }), { now, referenceReader: reader() });
  assert.equal(inactiveExtra.success, false);
  if (!inactiveExtra.success) assert.equal(inactiveExtra.reason, "EXTRA_UNAVAILABLE");
});

test("rejects a newly retired Laundry extra through active configuration validation", async () => {
  const result = await validateCleaningRequest(input({ extraIds: ["laundry-extra"] }), { now, referenceReader: reader({ findActiveExtrasByIds: async () => [] }) });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "EXTRA_UNAVAILABLE");
});

test("rejects past dates but accepts today and future dates", async () => {
  assert.equal((await validateCleaningRequest(input({ preferredDate: "2026-08-10" }), { now, referenceReader: reader() })).success, false);
  assert.equal((await validateCleaningRequest(input({ preferredDate: "2026-08-11" }), { now, referenceReader: reader() })).success, true);
  assert.equal((await validateCleaningRequest(input({ preferredDate: "2026-08-12" }), { now, referenceReader: reader() })).success, true);
});

test("normalizes current UI time labels and rejects unsupported windows", async () => {
  const result = await validateCleaningRequest(input({ preferredTimeWindow: "Flexible" }), { now, referenceReader: reader() });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.preferredTimeWindow, "FLEXIBLE");
  assert.equal((await validateCleaningRequest(input({ preferredTimeWindow: "Whenever" }), { now, referenceReader: reader() })).success, false);
});

test("validates phone, address, state, and ZIP boundaries", async () => {
  assert.equal((await validateCleaningRequest(input({ customerPhone: "973-555-1234", postalCode: "07102-1234" }), { now, referenceReader: reader() })).success, true);
  assert.equal((await validateCleaningRequest(input({ customerPhone: "123" }), { now, referenceReader: reader() })).success, false);
  assert.equal((await validateCleaningRequest(input({ addressLine1: "   " }), { now, referenceReader: reader() })).success, false);
  assert.equal((await validateCleaningRequest(input({ state: "ZZ" }), { now, referenceReader: reader() })).success, false);
  assert.equal((await validateCleaningRequest(input({ postalCode: "1234" }), { now, referenceReader: reader() })).success, false);
});

test("rejects privileged and unknown top-level fields", async () => {
  const result = await validateCleaningRequest(input({ status: "COMPLETED", confirmedPrice: 1, internalNotes: "hacked", pricingRuleId: "rule-1", foo: "bar" }), { now, referenceReader: reader() });
  assert.equal(result.success, false);
  if (!result.success) assert.equal(result.reason, "INVALID_INPUT");
});

test("rejects malformed runtime values safely", async () => {
  for (const value of [null, undefined, { ...input(), extraIds: "extra-1" }, { ...input(), customerName: 123 }, { ...input(), preferredDate: {} }]) {
    const result = await validateCleaningRequest(value, { now, referenceReader: reader() });
    assert.equal(result.success, false);
  }
});

test("keeps infrastructure failures distinguishable", async () => {
  const result = await validateCleaningRequest(input(), { now, referenceReader: reader({ findServiceById: async () => { throw new Error("database unavailable"); } }) });
  assert.deepEqual(result, { success: false, reason: "INTERNAL_ERROR" });
});
