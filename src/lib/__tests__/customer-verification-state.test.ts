import assert from "node:assert/strict";
import test from "node:test";
import { issueCustomerVerificationAttemptToken, issueCustomerVerificationState, readCustomerVerificationAttemptToken, readCustomerVerificationState } from "../customer-verification-state.js";

const secret = "test-customer-verification-secret";
const now = new Date();

test("issues purpose-scoped signed attempt and verified state tokens", () => {
  const attempt = issueCustomerVerificationAttemptToken("challenge-1", now, secret);
  assert.deepEqual(readCustomerVerificationAttemptToken(attempt, secret)?.challengeId, "challenge-1");
  assert.equal(readCustomerVerificationState(attempt, secret), null);
  const verified = issueCustomerVerificationState("customer-1", now, secret);
  assert.deepEqual(readCustomerVerificationState(verified, secret)?.customerId, "customer-1");
  assert.equal(readCustomerVerificationState(`${verified}tampered`, secret), null);
});

test("expires verification state", () => {
  const expired = issueCustomerVerificationState("customer-1", new Date(Date.now() - 60 * 60 * 1000), secret);
  assert.equal(readCustomerVerificationState(expired, secret), null);
});
