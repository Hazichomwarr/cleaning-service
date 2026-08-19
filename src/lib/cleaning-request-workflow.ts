import type { CleaningRequestStatus } from "../generated/prisma/client";

export type WorkflowBlockingReason = "NO_ASSIGNED_WORKERS" | "CONFIRMED_PRICE_MISSING_OR_INVALID" | "CONFIRMED_SCHEDULE_MISSING_OR_INVALID";
export type CleaningRequestWorkflowReadiness = { canStartCleaning: boolean; startBlockingReasons: WorkflowBlockingReason[]; canCompleteCleaning: boolean; completeBlockingReasons: WorkflowBlockingReason[] };
export function getCleaningRequestWorkflowReadiness(input: { status: CleaningRequestStatus; assignmentCount: number; confirmedPrice: { gt: (value: number) => boolean } | null; scheduledStart: Date | null; scheduledEnd: Date | null }): CleaningRequestWorkflowReadiness {
  const reasons: WorkflowBlockingReason[] = [];
  if (input.assignmentCount < 1) reasons.push("NO_ASSIGNED_WORKERS");
  if (!input.confirmedPrice || !input.confirmedPrice.gt(0)) reasons.push("CONFIRMED_PRICE_MISSING_OR_INVALID");
  if (!input.scheduledStart) reasons.push("CONFIRMED_SCHEDULE_MISSING_OR_INVALID");
  return { canStartCleaning: input.status === "ASSIGNED" && reasons.length === 0, startBlockingReasons: reasons, canCompleteCleaning: input.status === "IN_PROGRESS" && input.assignmentCount > 0, completeBlockingReasons: input.assignmentCount > 0 ? [] : ["NO_ASSIGNED_WORKERS"] };
}
