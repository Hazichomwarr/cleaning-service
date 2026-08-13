import type { CleaningRequestStatus } from "../generated/prisma/client";

export function canShowNewRequestActions(status: CleaningRequestStatus): boolean {
  return status === "NEW";
}
