"use server";

import { cookies } from "next/headers";
import { issueCustomerVerificationState, readCustomerVerificationAttemptToken, CUSTOMER_VERIFICATION_ATTEMPT_COOKIE, CUSTOMER_VERIFICATION_COOKIE, CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS } from "@/src/lib/customer-verification-state";
import { verifyReturningCustomerCode } from "@/src/services/customer-verification.service";

export type VerifyReturningCustomerCodeActionResult = { success: true; verified: true } | { success: false; reason: "INVALID_INPUT" | "INVALID_OR_EXPIRED_CODE" };

export async function verifyReturningCustomerCodeAction(input: unknown): Promise<VerifyReturningCustomerCodeActionResult> {
  try {
    const cookieStore = await cookies();
    const attempt = cookieStore.get(CUSTOMER_VERIFICATION_ATTEMPT_COOKIE)?.value;
    const parsed = attempt ? readCustomerVerificationAttemptToken(attempt) : null;
    if (!parsed?.challengeId) return { success: false, reason: "INVALID_OR_EXPIRED_CODE" };
    const codeInput = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const result = await verifyReturningCustomerCode({ challengeId: parsed.challengeId, ...codeInput });
    if (result.outcome === "INVALID_INPUT") return { success: false, reason: "INVALID_INPUT" };
    if (result.outcome !== "VERIFIED") return { success: false, reason: "INVALID_OR_EXPIRED_CODE" };
    cookieStore.set(CUSTOMER_VERIFICATION_COOKIE, issueCustomerVerificationState(result.customerId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CUSTOMER_VERIFICATION_STATE_MAX_AGE_SECONDS });
    cookieStore.delete(CUSTOMER_VERIFICATION_ATTEMPT_COOKIE);
    return { success: true, verified: true };
  } catch {
    return { success: false, reason: "INVALID_OR_EXPIRED_CODE" };
  }
}
