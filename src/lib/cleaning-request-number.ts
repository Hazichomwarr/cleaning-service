import { getBusinessYear } from "../services/cleaning-request-validation.service";

const REQUEST_NUMBER_PREFIX = "JC";

export function getNextCleaningRequestNumber(existingNumbers: string[], now: Date): string {
  const year = getBusinessYear(now);
  const prefix = `${REQUEST_NUMBER_PREFIX}-${year}-`;
  let highestSequence = 0;

  for (const requestNumber of existingNumbers) {
    if (!requestNumber.startsWith(prefix)) continue;
    const sequence = Number(requestNumber.slice(prefix.length));
    if (Number.isInteger(sequence) && sequence > highestSequence) highestSequence = sequence;
  }

  return `${prefix}${String(highestSequence + 1).padStart(4, "0")}`;
}

export function isRequestNumberCollision(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { target?: unknown } };
  if (candidate.code !== "P2002") return false;
  const target = candidate.meta?.target;
  return Array.isArray(target) ? target.includes("requestNumber") : String(target ?? "").includes("requestNumber");
}
