"use server";

import { cookies } from "next/headers";
import { CUSTOMER_VERIFICATION_COOKIE, readCustomerVerificationState } from "@/src/lib/customer-verification-state";
import { getVerifiedCustomerSavedProperties, type VerifiedCustomerPropertyOption } from "@/src/services/verified-customer-properties.service";

export type GetReturningCustomerPropertiesResult =
  | { success: true; properties: VerifiedCustomerPropertyOption[] }
  | { success: false; reason: "VERIFICATION_REQUIRED" };

export async function getReturningCustomerPropertiesAction(): Promise<GetReturningCustomerPropertiesResult> {
  const token = (await cookies()).get(CUSTOMER_VERIFICATION_COOKIE)?.value;
  if (!token) return { success: false, reason: "VERIFICATION_REQUIRED" };
  let state;
  try { state = readCustomerVerificationState(token); } catch { return { success: false, reason: "VERIFICATION_REQUIRED" }; }
  if (!state) return { success: false, reason: "VERIFICATION_REQUIRED" };
  const properties = await getVerifiedCustomerSavedProperties(state.customerId);
  if (!properties) return { success: false, reason: "VERIFICATION_REQUIRED" };
  return { success: true, properties };
}
