import assert from "node:assert/strict";
import test from "node:test";
import { renderRequestAcceptedCustomerEmail } from "../request-accepted-customer.email";
import { renderRequestDeclinedCustomerEmail } from "../request-declined-customer.email";

test("accepted email communicates review, estimate, and preferred timing without confirmation claims", () => {
  const html = renderRequestAcceptedCustomerEmail({ requestNumber: "JC-2026-0001", customerName: "Jane <script>alert(1)</script>", serviceName: "Deep Cleaning", propertyType: "HOUSE", preferredDate: "2026-08-18", preferredTimeWindow: "Morning", estimateOutcome: "AUTOMATIC_ESTIMATE", estimatedPrice: "200.00" });
  assert.match(html, /reviewing it/);
  assert.match(html, /Starting estimate: \$200\.00/);
  assert.match(html, /Preferred date/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /Your cleaning is confirmed|appointment is booked|final price/);
});

test("accepted email uses safe language for non-automatic pricing", () => {
  for (const estimateOutcome of ["MANUAL_QUOTE_REQUIRED", "NO_CONFIGURED_ESTIMATE", "ESTIMATE_UNAVAILABLE"] as const) {
    const html = renderRequestAcceptedCustomerEmail({ requestNumber: "JC-2026-0001", customerName: null, serviceName: "Office Cleaning", propertyType: "OFFICE", preferredDate: "2026-08-18", preferredTimeWindow: "Morning", estimateOutcome, estimatedPrice: null });
    assert.doesNotMatch(html, /\$0\.00/);
  }
});

test("declined email snapshots and escapes the customer-visible reason", () => {
  const html = renderRequestDeclinedCustomerEmail({ requestNumber: "JC-2026-0001", customerName: "Jane", reason: "Outside <service> & area" });
  assert.match(html, /unable to proceed/);
  assert.match(html, /Outside &lt;service&gt; &amp; area/);
  assert.doesNotMatch(html, /internalNotes|AdminUser|changedBy/);
});
