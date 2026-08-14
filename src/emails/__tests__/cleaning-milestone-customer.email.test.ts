import assert from "node:assert/strict";
import test from "node:test";
import { renderCleaningStartedCustomerEmail } from "../cleaning-started-customer.email.js";
import { renderCleaningCompletedCustomerEmail } from "../cleaning-completed-customer.email.js";

const data = { requestNumber: "JC-2026-0001", customerName: "Jane <script>", serviceName: "Deep & detailed", confirmedPrice: "250.00", addressLine1: "123 <Main>", addressLine2: null, city: "Newark", state: "NJ", postalCode: "07102" };

test("started and completed templates escape snapshots and avoid unsupported claims", () => {
  for (const html of [renderCleaningStartedCustomerEmail(data), renderCleaningCompletedCustomerEmail(data)]) {
    assert.match(html, /Jane &lt;script&gt;/);
    assert.match(html, /Deep &amp; detailed/);
    assert.match(html, /123 &lt;Main&gt;/);
    assert.match(html, /Confirmed price/);
    assert.equal(html.includes("payment"), false);
    assert.equal(html.includes("worker"), false);
    assert.equal(html.includes("review"), false);
    assert.equal(html.includes("internalNotes"), false);
  }
  assert.match(renderCleaningStartedCustomerEmail(data), /cleaning is now underway/);
  assert.match(renderCleaningCompletedCustomerEmail(data), /Your cleaning is complete/);
});
