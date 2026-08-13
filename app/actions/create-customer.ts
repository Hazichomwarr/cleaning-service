"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/src/lib/auth/require-admin";
import { createCustomer, type CustomerCreationResult } from "@/src/services/customer.service";

export async function createCustomerAction(input: unknown): Promise<CustomerCreationResult> {
  await requireAdmin();
  const result = await createCustomer(input);
  if (result.status === "SUCCESS") revalidatePath("/admin/customers");
  return result;
}
