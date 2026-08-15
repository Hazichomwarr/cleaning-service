import assert from "node:assert/strict";
import test from "node:test";
import { renderReturningCustomerVerificationEmail } from "../returning-customer-verification.email.js";

test("verification email contains only the code instructions and escapes customer name", () => {
  const html = renderReturningCustomerVerificationEmail("Jane <script>", "483291");
  assert.match(html, /Jane &lt;script&gt;/);
  assert.match(html, /483291/);
  assert.match(html, /expires in 10 minutes/);
  assert.equal(html.includes("address"), false);
  assert.equal(html.includes("request history"), false);
});
