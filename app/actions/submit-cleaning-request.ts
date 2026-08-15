"use server";

import { cookies } from "next/headers";
import { CUSTOMER_VERIFICATION_COOKIE, readCustomerVerificationState } from "../../src/lib/customer-verification-state";
import {
  createCleaningRequest,
  type CleaningRequestCreationResult,
} from "../../src/services/cleaning-request.service";

export type SubmitCleaningRequestResult =
  | {
      success: true;
      request: Omit<Extract<CleaningRequestCreationResult, { success: true }>["request"], "id">;
    }
  | Extract<CleaningRequestCreationResult, { success: false }>;

/**
 * Public transport boundary for customer request submission.
 * The input is intentionally unknown because everything from the browser is untrusted.
 */
export async function submitCleaningRequest(input: unknown): Promise<SubmitCleaningRequestResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CUSTOMER_VERIFICATION_COOKIE)?.value;
    const verified = token ? readCustomerVerificationState(token) : null;
    const result = await createCleaningRequest(input, verified ? { returningCustomerContext: { customerId: verified.customerId } } : {});

    if (!result.success) return result;

    return {
      success: true,
      request: {
        requestNumber: result.request.requestNumber,
        status: result.request.status,
        estimate: result.request.estimate,
      },
    };
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}
