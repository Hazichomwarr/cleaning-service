import assert from "node:assert/strict";
import test from "node:test";
import { renderUpcomingCleaningCustomerEmail } from "../upcoming-cleaning-customer.email.js";

test("escapes reminder snapshots and excludes operational/payment language", () => {
  const html = renderUpcomingCleaningCustomerEmail({
    requestNumber: "JC-2026-0001", customerName: "Jane <script>", serviceName: "Deep & detailed", propertyType: "HOUSE",
    confirmedPrice: "250.00", scheduledTime: "Aug 18, 2026 · 10:00 AM", addressLine1: "123 <Main>", addressLine2: null,
    city: "Newark", state: "NJ", postalCode: "07102", extraNames: ["Inside & cabinets"],
  });
  assert.match(html, /Jane &lt;script&gt;/);
  assert.match(html, /Deep &amp; detailed/);
  assert.match(html, /123 &lt;Main&gt;/);
  assert.match(html, /Inside &amp; cabinets/);
  assert.equal(html.includes("balance due"), false);
  assert.equal(html.includes("worker"), false);
  assert.equal(html.includes("internalNotes"), false);
});
