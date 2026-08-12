import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPropertySummary,
  formatRequestDate,
  formatTimeWindow,
  getEstimateConfirmationPresentation,
} from "../request-confirmation";

test("formats a date-only preference without timezone shifting", () => {
  assert.equal(formatRequestDate("2026-08-21"), "Friday, August 21, 2026");
});

test("formats preferred time windows for customers", () => {
  assert.equal(formatTimeWindow("MORNING"), "Morning");
});

test("builds grammatical residential property summaries", () => {
  assert.equal(buildPropertySummary({ propertyType: "HOUSE", bedrooms: 2, bathrooms: "1.5" }), "House · 2 bedrooms · 1.5 bathrooms");
  assert.equal(buildPropertySummary({ propertyType: "APARTMENT", bedrooms: 1, bathrooms: "1" }), "Apartment · 1 bedroom · 1 bathroom");
});

test("does not invent residential details for commercial properties", () => {
  assert.equal(buildPropertySummary({ propertyType: "OFFICE", bedrooms: undefined, bathrooms: "" }), "Office");
});

test("presents the authoritative automatic estimate exactly", () => {
  assert.deepEqual(getEstimateConfirmationPresentation({ outcome: "AUTOMATIC_ESTIMATE", amount: "225.00", currency: "USD" }), {
    label: "Starting estimate",
    amount: "$225.00",
    description: "Final pricing will be confirmed after our team reviews your request.",
  });
});

test("presents manual estimate outcomes without rendering zero", () => {
  for (const outcome of ["MANUAL_QUOTE_REQUIRED", "NO_CONFIGURED_ESTIMATE", "ESTIMATE_UNAVAILABLE"] as const) {
    const presentation = getEstimateConfirmationPresentation({ outcome, amount: null, currency: "USD" });
    assert.equal(presentation.amount, null);
    assert.equal(/\$0|final price/i.test(presentation.description), false);
  }
});
