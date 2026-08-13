"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { createCustomerProperty, type CustomerPropertyCreationResult } from "@/src/services/customer-property.service";

export async function createCustomerPropertyAction(customerId: string, input: unknown): Promise<CustomerPropertyCreationResult> {
  await requireAdmin();
  const result = await createCustomerProperty(customerId, input);
  if (result.status === "SUCCESS") revalidatePath(`/admin/customers/${customerId}`);
  return result;
}
