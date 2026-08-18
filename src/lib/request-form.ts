import type { CleaningRequestDraft, PropertyType } from "../types/cleaning-request-draft";
import type { PublicCleaningEstimateResult } from "./cleaning-estimate-boundary";
import type { EstimateState } from "../../components/request/EstimateCard";

export const REQUEST_STEP = {
  PROPERTY: 0,
  SERVICE: 1,
  SCHEDULE: 2,
  DETAILS: 3,
  REVIEW: 4,
} as const;

export const requestFieldSteps: Record<string, number> = {
  serviceId: REQUEST_STEP.SERVICE,
  propertyType: REQUEST_STEP.PROPERTY,
  bedrooms: REQUEST_STEP.PROPERTY,
  bathrooms: REQUEST_STEP.PROPERTY,
  preferredDate: REQUEST_STEP.SCHEDULE,
  preferredTimeWindow: REQUEST_STEP.SCHEDULE,
  customerName: REQUEST_STEP.DETAILS,
  customerEmail: REQUEST_STEP.DETAILS,
  customerPhone: REQUEST_STEP.DETAILS,
  addressLine1: REQUEST_STEP.DETAILS,
  addressLine2: REQUEST_STEP.DETAILS,
  city: REQUEST_STEP.DETAILS,
  state: REQUEST_STEP.DETAILS,
  postalCode: REQUEST_STEP.DETAILS,
  customerNotes: REQUEST_STEP.DETAILS,
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

export function mapEstimateResult(result: PublicCleaningEstimateResult): EstimateState {
  if (result.success) return { status: "success", amount: result.estimate.amount };
  if (result.reason === "MANUAL_QUOTE_REQUIRED") return { status: "manual" };
  if (result.reason === "NO_CONFIGURED_ESTIMATE") return { status: "unconfigured" };
  return { status: result.reason === "INVALID_INPUT" ? "idle" : "unavailable" };
}
