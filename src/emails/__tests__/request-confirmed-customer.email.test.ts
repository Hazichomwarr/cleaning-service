import assert from "node:assert/strict";
import test from "node:test";
import { renderRequestConfirmedCustomerEmail } from "../request-confirmed-customer.email";

test("renders committed confirmation facts and business-time appointment", () => {
  const html = renderRequestConfirmedCustomerEmail({ requestNumber: "JC-2026-0001", customerName: "Jane <script>alert(1)</script>", serviceName: "Deep Cleaning", propertyType: "HOUSE", bedrooms: 2, bathrooms: "1.5", confirmedPrice: "250.00", scheduledRange: "Aug 18, 2026 · 10:00 AM–12:00 PM", addressLine1: "123 Main <Street>", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", extraNames: ["Inside <Oven>"] });
  assert.match(html, /Your cleaning is confirmed/);
  assert.match(html, /\$250\.00/);
  assert.doesNotMatch(html, /\$200\.00|estimatedPrice|preferredDate|preferredTimeWindow/);
  assert.match(html, /10:00 AM–12:00 PM/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /123 Main &lt;Street&gt;/);
  assert.doesNotMatch(html, /<script>|paid|balance due|payment received|internalNotes/);
});

test("omits extras when none were selected", () => {
  const html = renderRequestConfirmedCustomerEmail({ requestNumber: "JC-2026-0001", customerName: null, serviceName: "Office Cleaning", propertyType: "OFFICE", bedrooms: null, bathrooms: null, confirmedPrice: "650.00", scheduledRange: "Aug 18, 2026 · 10:00 AM–12:00 PM", addressLine1: "1 Main", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102", extraNames: [] });
  assert.doesNotMatch(html, /<h2[^>]*>Extras/);
});
