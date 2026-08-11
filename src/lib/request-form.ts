import type { CleaningRequestDraft, PropertyType } from "../types/cleaning-request-draft";
import type { PublicCleaningEstimateResult } from "./cleaning-estimate-boundary";
import type { EstimateState } from "../../components/request/EstimateCard";

export function isResidentialPropertyType(propertyType: PropertyType | ""): boolean {
  return propertyType === "HOUSE" || propertyType === "APARTMENT" || propertyType === "AIRBNB";
}

export function updateRequestDraft<K extends keyof CleaningRequestDraft>(
  draft: CleaningRequestDraft,
  field: K,
  value: CleaningRequestDraft[K],
): CleaningRequestDraft {
  return { ...draft, [field]: value };
}

export function toggleRequestExtra(extraIds: string[], extraId: string): string[] {
  return extraIds.includes(extraId)
    ? extraIds.filter((id) => id !== extraId)
    : [...extraIds, extraId];
}

export function mapEstimateResult(result: PublicCleaningEstimateResult): EstimateState {
  if (result.success) return { status: "success", amount: result.estimate.amount };
  if (result.reason === "MANUAL_QUOTE_REQUIRED") return { status: "manual" };
  if (result.reason === "NO_CONFIGURED_ESTIMATE") return { status: "unconfigured" };
  return { status: result.reason === "INVALID_INPUT" ? "idle" : "unavailable" };
}
