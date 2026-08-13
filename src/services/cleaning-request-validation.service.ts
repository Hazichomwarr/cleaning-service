import {
  CleaningRequestInputSchema,
  type ParsedCleaningRequestInput,
  type PreferredTimeWindow,
  type PropertyType,
} from "../lib/validations/cleaning-request.schema";

const BUSINESS_TIME_ZONE = "America/New_York";
const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
]);

export type ValidatedCleaningRequestCommand = {
  serviceId: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: string | null;
  extraIds: string[];
  preferredDate: string;
  preferredTimeWindow: PreferredTimeWindow;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  customerNotes: string | null;
};

export type CleaningRequestReferenceReader = {
  findServiceById: (serviceId: string) => Promise<{ id: string; isActive: boolean } | null>;
  findActiveExtrasByIds: (extraIds: string[]) => Promise<Array<{ id: string }>>;
};

export type CleaningRequestValidationResult =
  | { success: true; data: ValidatedCleaningRequestCommand }
  | { success: false; reason: "INVALID_INPUT" | "SERVICE_UNAVAILABLE" | "EXTRA_UNAVAILABLE" | "INTERNAL_ERROR"; fieldErrors?: Record<string, string[]> };

export type ValidationOptions = {
  referenceReader?: CleaningRequestReferenceReader;
  now?: Date;
};

function getBusinessDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getBusinessYear(now: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
  }).format(now);
}

function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function isValidUSState(value: string): boolean {
  return US_STATE_CODES.has(value.toUpperCase());
}

function toFieldErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): Record<string, string[]> {
  return error.issues.reduce<Record<string, string[]>>((errors, issue) => {
    const field = String(issue.path[0] ?? "form");
    errors[field] = [...(errors[field] ?? []), issue.message];
    return errors;
  }, {});
}

async function getDefaultReferenceReader(): Promise<CleaningRequestReferenceReader> {
  const { prisma } = await import("../lib/db/prisma");
  return {
    findServiceById: async (serviceId) => prisma.cleaningService.findUnique({ where: { id: serviceId }, select: { id: true, isActive: true } }),
    findActiveExtrasByIds: async (extraIds) => {
      if (extraIds.length === 0) return [];
      return prisma.cleaningExtra.findMany({ where: { id: { in: extraIds }, isActive: true }, select: { id: true } });
    },
  };
}

function normalizeParsedInput(input: ParsedCleaningRequestInput): Omit<ValidatedCleaningRequestCommand, "serviceId" | "extraIds"> & { serviceId: string; extraIds: string[] } | { field: string; message: string } {
  if (!US_STATE_CODES.has(input.state)) return { field: "state", message: "Enter a valid US state code." };
  const phone = normalizePhone(input.customerPhone);
  if (!phone) return { field: "customerPhone", message: "Enter a valid US phone number." };

  return {
    serviceId: input.serviceId,
    propertyType: input.propertyType,
    bedrooms: input.propertyType === "HOUSE" || input.propertyType === "APARTMENT" || input.propertyType === "AIRBNB" ? input.bedrooms ?? null : null,
    bathrooms: input.bathrooms ?? null,
    extraIds: [...new Set(input.extraIds)],
    preferredDate: input.preferredDate,
    preferredTimeWindow: input.preferredTimeWindow,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: phone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2 || null,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    customerNotes: input.customerNotes || null,
  };
}

export async function validateCleaningRequest(input: unknown, options: ValidationOptions = {}): Promise<CleaningRequestValidationResult> {
  const parsed = CleaningRequestInputSchema.safeParse(input);
  if (!parsed.success) return { success: false, reason: "INVALID_INPUT", fieldErrors: toFieldErrors(parsed.error) };

  const normalized = normalizeParsedInput(parsed.data);
  if ("field" in normalized) return { success: false, reason: "INVALID_INPUT", fieldErrors: { [normalized.field]: [normalized.message] } };
  if (normalized.preferredDate < getBusinessDate(options.now ?? new Date())) return { success: false, reason: "INVALID_INPUT", fieldErrors: { preferredDate: ["Choose today or a future date."] } };

  const referenceReader = options.referenceReader ?? await getDefaultReferenceReader();
  try {
    const service = await referenceReader.findServiceById(normalized.serviceId);
    if (!service?.isActive) return { success: false, reason: "SERVICE_UNAVAILABLE", fieldErrors: { serviceId: ["That cleaning service is no longer available."] } };

    const activeExtras = await referenceReader.findActiveExtrasByIds(normalized.extraIds);
    if (activeExtras.length !== normalized.extraIds.length || new Set(activeExtras.map((extra) => extra.id)).size !== normalized.extraIds.length) {
      return { success: false, reason: "EXTRA_UNAVAILABLE", fieldErrors: { extraIds: ["One or more selected extras are no longer available."] } };
    }

    return { success: true, data: normalized };
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

export { BUSINESS_TIME_ZONE, getBusinessDate, getBusinessYear, normalizePhone };
