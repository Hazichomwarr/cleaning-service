"use server";

import { cookies } from "next/headers";
import { issueCustomerVerificationAttemptToken, CUSTOMER_VERIFICATION_ATTEMPT_COOKIE, CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS } from "@/src/lib/customer-verification-state";
import { startReturningCustomerVerification } from "@/src/services/customer-verification.service";

export type StartReturningCustomerVerificationActionResult = { success: true } | { success: false; reason: "INVALID_INPUT" | "INTERNAL_ERROR" };

export async function startReturningCustomerVerificationAction(input: unknown): Promise<StartReturningCustomerVerificationActionResult> {
  try {
    const result = await startReturningCustomerVerification(input);
    if (result.outcome === "INVALID_INPUT") return { success: false, reason: "INVALID_INPUT" };
    const token = issueCustomerVerificationAttemptToken(result.outcome === "STARTED" ? result.challengeId : null);
    (await cookies()).set(CUSTOMER_VERIFICATION_ATTEMPT_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS });
    return { success: true };
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}
