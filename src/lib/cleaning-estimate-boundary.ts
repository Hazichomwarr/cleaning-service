import {
  getResidentialStartingEstimate,
  type ResidentialPricingInput,
  type ResidentialPricingResult,
} from "../services/cleaning-pricing.service.js";
import {
  PublicCleaningEstimateSchema,
  type PublicCleaningEstimateInput,
} from "./validations/cleaning-estimate.schema.js";

export type PublicCleaningEstimateResult =
  | {
      success: true;
      estimate: {
        amount: string;
        currency: "USD";
      };
    }
  | {
      success: false;
      reason:
        | "INVALID_INPUT"
        | "MANUAL_QUOTE_REQUIRED"
        | "NO_CONFIGURED_ESTIMATE"
        | "ESTIMATE_UNAVAILABLE";
    };

export type PricingResolver = (
  input: ResidentialPricingInput,
) => Promise<ResidentialPricingResult>;

function mapDomainResult(
  result: ResidentialPricingResult,
): PublicCleaningEstimateResult {
  if (result.success) {
    return {
      success: true,
      estimate: {
        amount: result.startingPrice.toFixed(2),
        currency: "USD",
      },
    };
  }

  switch (result.reason) {
    case "NOT_RESIDENTIAL":
      return { success: false, reason: "MANUAL_QUOTE_REQUIRED" };
    case "INVALID_BEDROOM_COUNT":
      return { success: false, reason: "INVALID_INPUT" };
    case "NO_ACTIVE_RULE":
      return { success: false, reason: "NO_CONFIGURED_ESTIMATE" };
    case "AMBIGUOUS_ACTIVE_RULE":
      return { success: false, reason: "ESTIMATE_UNAVAILABLE" };
  }
}

export async function resolvePublicCleaningEstimate(
  input: unknown,
  pricingResolver: PricingResolver = getResidentialStartingEstimate,
): Promise<PublicCleaningEstimateResult> {
  const parsedInput = PublicCleaningEstimateSchema.safeParse(input);

  if (!parsedInput.success) {
    return { success: false, reason: "INVALID_INPUT" };
  }

  try {
    return mapDomainResult(await pricingResolver(parsedInput.data));
  } catch {
    return { success: false, reason: "ESTIMATE_UNAVAILABLE" };
  }
}

export type { PublicCleaningEstimateInput };
