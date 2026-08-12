import type { CleaningRequestDraft, PropertyType } from "../types/cleaning-request-draft";
import type { PublicCleaningEstimateResult } from "./cleaning-estimate-boundary";
import type { EstimateState } from "../../components/request/EstimateCard";

export const requestFieldSteps: Record<string, number> = {
  serviceId: 0,
  propertyType: 1,
  bedrooms: 1,
  bathrooms: 1,
  extraIds: 2,
  preferredDate: 3,
  preferredTimeWindow: 3,
  customerName: 4,
  customerEmail: 4,
  customerPhone: 4,
  addressLine1: 4,
  addressLine2: 4,
  city: 4,
  state: 4,
  postalCode: 4,
  customerNotes: 4,
};

export function getEarliestRequestErrorStep(fieldErrors: Record<string, string[]>): number {
  return Object.keys(fieldErrors).reduce(
    (earliest, field) => Math.min(earliest, requestFieldSteps[field] ?? 0),
    Number.POSITIVE_INFINITY,
  );
}

export function getRequestFieldLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (character) => character.toUpperCase());
}

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
