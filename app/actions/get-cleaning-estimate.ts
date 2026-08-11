"use server";

import {
  resolvePublicCleaningEstimate,
  type PublicCleaningEstimateResult,
} from "../../src/lib/cleaning-estimate-boundary.js";

export async function getCleaningEstimate(
  input: unknown,
): Promise<PublicCleaningEstimateResult> {
  return resolvePublicCleaningEstimate(input);
}
