import assert from "node:assert/strict";
import test from "node:test";
import { getBusinessNotificationConfig } from "../business-notification-config";

test("normalizes configured business recipient and keeps it independent of admin users", () => {
  assert.deepEqual(getBusinessNotificationConfig({ BUSINESS_NOTIFICATION_EMAIL: " OWNER@EXAMPLE.COM ", BUSINESS_NOTIFICATION_NAME: " Just Cleaning " }), {
    success: true,
    config: { email: "owner@example.com", name: "Just Cleaning" },
  });
});

test("missing or malformed recipient configuration is controlled", () => {
  assert.deepEqual(getBusinessNotificationConfig({}), { success: false, errorCode: "MISSING_CONFIGURATION" });
  assert.deepEqual(getBusinessNotificationConfig({ BUSINESS_NOTIFICATION_EMAIL: "not-an-email" }), { success: false, errorCode: "INVALID_CONFIGURATION" });
});
