import assert from "node:assert/strict";
import test from "node:test";
import { renderNewRequestAdminEmail, type NewRequestAdminEmailData } from "../new-request-admin.email";

const base: NewRequestAdminEmailData = {
  requestId: "request-1", requestNumber: "JC-2026-0001", customerName: "Jane <script>alert(1)</script>",
  customerEmail: "jane@example.com", customerPhone: "+19735551234", propertyType: "HOUSE", bedrooms: 2,
  bathrooms: "1.5", serviceName: "Standard Cleaning", extraNames: ["Inside Oven"], preferredDate: "August 21, 2026",
  preferredTimeWindow: "Morning", estimatedPrice: "200.00", estimateOutcome: "AUTOMATIC_ESTIMATE",
  addressLine1: "123 Main St", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102",
  customerNotes: "Please avoid <script>alert('x')</script>.",
};

test("renders operational snapshots and escapes customer-controlled HTML", () => {
  const html = renderNewRequestAdminEmail(base);
  assert.match(html, /JC-2026-0001/);
  assert.match(html, /\$200\.00/);
  assert.match(html, /Inside Oven/);
  assert.match(html, /&lt;script&gt;alert\(&#39;x&#39;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /internalNotes|confirmedPrice/);
});

test("renders non-automatic estimate outcomes without inventing zero pricing", () => {
  for (const estimateOutcome of ["MANUAL_QUOTE_REQUIRED", "NO_CONFIGURED_ESTIMATE", "ESTIMATE_UNAVAILABLE"] as const) {
    const html = renderNewRequestAdminEmail({ ...base, estimateOutcome, estimatedPrice: null });
    assert.doesNotMatch(html, /\$0\.00/);
    assert.match(html, estimateOutcome === "MANUAL_QUOTE_REQUIRED" ? /Manual quote required/ : estimateOutcome === "NO_CONFIGURED_ESTIMATE" ? /No automatic estimate configured/ : /Estimate unavailable/);
  }
});

test("does not imply a confirmed appointment or show a confirmed price", () => {
  const html = renderNewRequestAdminEmail(base);
  assert.match(html, /Preferred schedule/);
  assert.doesNotMatch(html, /Confirmed appointment|confirmedPrice/);
});
