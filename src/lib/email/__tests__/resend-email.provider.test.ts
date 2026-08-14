import assert from "node:assert/strict";
import test from "node:test";
import { formatResendSender, getResendConfig } from "../resend-config";
import { createResendEmailProvider } from "../resend-email.provider";

test("validates server-only sender configuration without exposing secrets", () => {
  const missing = getResendConfig({ RESEND_API_KEY: "secret" });
  assert.deepEqual(missing, { success: false, errorCode: "MISSING_CONFIGURATION" });

  const configured = getResendConfig({
    RESEND_API_KEY: "secret",
    RESEND_FROM_EMAIL: " NOTIFICATIONS@EXAMPLE.COM ",
    RESEND_FROM_NAME: " Cleaning Service ",
  });
  assert.deepEqual(configured, {
    success: true,
    config: { apiKey: "secret", fromEmail: "notifications@example.com", fromName: "Cleaning Service" },
  });
  if (configured.success) assert.equal(formatResendSender(configured.config), "Cleaning Service <notifications@example.com>");
});

test("missing Resend configuration becomes a controlled delivery failure", async () => {
  const provider = createResendEmailProvider({});
  const result = await provider.sendEmail({ to: "customer@example.com", subject: "Test", html: "<p>Test</p>", idempotencyKey: "notification/test" });
  assert.deepEqual(result, { success: false, errorCode: "CONFIGURATION_ERROR" });
});
