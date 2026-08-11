"use server";

import {
  resolvePublicCleaningEstimate,
  type PublicCleaningEstimateResult,
} from "../../src/lib/cleaning-estimate-boundary";

export async function getCleaningEstimate(
  input: unknown,
): Promise<PublicCleaningEstimateResult> {
  return resolvePublicCleaningEstimate(input);
}
