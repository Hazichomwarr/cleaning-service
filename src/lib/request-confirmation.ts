import type { CleaningRequestDraft, PropertyType } from "../types/cleaning-request-draft";

export type RequestConfirmationEstimate = {
  outcome:
    | "AUTOMATIC_ESTIMATE"
    | "MANUAL_QUOTE_REQUIRED"
    | "NO_CONFIGURED_ESTIMATE"
    | "ESTIMATE_UNAVAILABLE";
  amount: string | null;
  currency: "USD";
};

export type RequestConfirmationData = {
  requestNumber: string;
  customerName: string;
  serviceName: string;
  propertySummary: string;
  preferredDate: string;
  preferredTimeWindow: string;
  estimate: RequestConfirmationEstimate;
};

const propertyLabels: Record<PropertyType, string> = {
  HOUSE: "House",
  APARTMENT: "Apartment",
  OFFICE: "Office",
  COMMERCIAL: "Commercial space",
  AIRBNB: "Airbnb / Short-term rental",
  OTHER: "Other",
};

const timeWindowLabels: Record<string, string> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  FLEXIBLE: "Flexible",
};

export function formatRequestDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return value;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimeWindow(value: string): string {
  return timeWindowLabels[value] ?? value;
}

export function buildPropertySummary(draft: Pick<CleaningRequestDraft, "propertyType" | "bedrooms" | "bathrooms">): string {
  const property = draft.propertyType ? propertyLabels[draft.propertyType] : "Property";
  const details: string[] = [];

  if (draft.bedrooms != null) details.push(`${draft.bedrooms} bedroom${draft.bedrooms === 1 ? "" : "s"}`);
  if (draft.bathrooms) details.push(`${draft.bathrooms} bathroom${draft.bathrooms === "1" ? "" : "s"}`);

  return [property, ...details].join(" · ");
}

export function getEstimateConfirmationPresentation(estimate: RequestConfirmationEstimate): {
  label: string;
  amount: string | null;
  description: string;
} {
  switch (estimate.outcome) {
    case "AUTOMATIC_ESTIMATE":
      return {
        label: "Starting estimate",
        amount: estimate.amount ? `$${estimate.amount}` : null,
        description: "Final pricing will be confirmed after our team reviews your request.",
      };
    case "MANUAL_QUOTE_REQUIRED":
      return {
        label: "Custom estimate",
        amount: null,
        description: "We’ll review the property details and confirm your price with you.",
      };
    case "NO_CONFIGURED_ESTIMATE":
      return {
        label: "Estimate to be confirmed",
        amount: null,
        description: "Your property needs a quick review before we can confirm the starting price.",
      };
    case "ESTIMATE_UNAVAILABLE":
      return {
        label: "Estimate to be confirmed",
        amount: null,
        description: "We received your request successfully and will confirm pricing after review.",
      };
  }
}

export function toRequestConfirmationData(
  draft: Pick<CleaningRequestDraft, "customerName" | "serviceName" | "propertyType" | "bedrooms" | "bathrooms" | "preferredDate" | "preferredTimeWindow">,
  request: Omit<RequestConfirmationData, "customerName" | "serviceName" | "propertySummary" | "preferredDate" | "preferredTimeWindow">,
): RequestConfirmationData {
  return {
    ...request,
    customerName: draft.customerName,
    serviceName: draft.serviceName,
    propertySummary: buildPropertySummary(draft),
    preferredDate: draft.preferredDate,
    preferredTimeWindow: draft.preferredTimeWindow,
  };
}
