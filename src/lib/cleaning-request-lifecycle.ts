import { CleaningRequestStatus } from "../generated/prisma/client";

const allowedTransitions: Record<CleaningRequestStatus, readonly CleaningRequestStatus[]> = {
  [CleaningRequestStatus.NEW]: [CleaningRequestStatus.REVIEWING, CleaningRequestStatus.CANCELLED],
  [CleaningRequestStatus.REVIEWING]: [CleaningRequestStatus.CONFIRMED, CleaningRequestStatus.CANCELLED],
  [CleaningRequestStatus.CONFIRMED]: [CleaningRequestStatus.ASSIGNED, CleaningRequestStatus.CANCELLED],
  [CleaningRequestStatus.ASSIGNED]: [CleaningRequestStatus.CONFIRMED, CleaningRequestStatus.IN_PROGRESS, CleaningRequestStatus.CANCELLED],
  [CleaningRequestStatus.IN_PROGRESS]: [CleaningRequestStatus.COMPLETED, CleaningRequestStatus.CANCELLED],
  [CleaningRequestStatus.COMPLETED]: [],
  [CleaningRequestStatus.CANCELLED]: [],
};

export function canTransitionCleaningRequestStatus(from: CleaningRequestStatus, to: CleaningRequestStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function getAllowedCleaningRequestTransitions(from: CleaningRequestStatus): readonly CleaningRequestStatus[] {
  return allowedTransitions[from];
}

export { allowedTransitions };
