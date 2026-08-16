import { z } from "zod";

export const PROPERTY_TYPES = [
  "HOUSE",
  "APARTMENT",
  "OFFICE",
  "COMMERCIAL",
  "AIRBNB",
  "OTHER",
] as const;

export const PREFERRED_TIME_WINDOWS = ["MORNING", "AFTERNOON", "EVENING", "FLEXIBLE"] as const;

const currentTimeWindowToMachineValue = {
  Morning: "MORNING",
  Afternoon: "AFTERNOON",
  Evening: "EVENING",
  Flexible: "FLEXIBLE",
} as const;

const optionalTrimmedString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().max(max).optional().nullable(),
  );

const bathroomValue = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return typeof value === "string" ? value.trim() : value;
  },
  z.union([z.null(), z.string().regex(/^\d+(?:\.\d)?$/, "Enter a valid bathroom count.")]).superRefine((value, context) => {
    if (value === null) return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      context.addIssue({ code: "custom", message: "Enter a positive bathroom count." });
    }
  }),
);

const preferredTimeWindow = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return currentTimeWindowToMachineValue[value as keyof typeof currentTimeWindowToMachineValue] ?? value.toUpperCase();
  },
  z.enum(PREFERRED_TIME_WINDOWS),
);

export const CleaningRequestInputSchema = z.object({
  savedPropertyId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).optional().nullable(),
  ),
  serviceId: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1, "Choose a cleaning service."),
  ),
  propertyType: z.enum(PROPERTY_TYPES),
  bedrooms: z.number().finite().int().positive().optional().nullable(),
  bathrooms: bathroomValue.optional(),
  extraIds: z.array(z.string().trim().min(1)).optional().default([]),
  preferredDate: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid preferred date."),
  ),
  preferredTimeWindow,
  customerName: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(2).max(120),
  ),
  customerEmail: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email("Enter a valid email address."),
  ),
  customerPhone: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(40),
  ),
  addressLine1: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(200),
  ),
  addressLine2: optionalTrimmedString(200),
  city: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(120),
  ),
  state: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.string().regex(/^[A-Z]{2}$/, "Enter a valid US state code."),
  ),
  postalCode: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid ZIP code."),
  ),
  customerNotes: optionalTrimmedString(2000),
  useReturningCustomerContext: z.boolean().optional(),
}).strict().superRefine((value, context) => {
  const residential = value.propertyType === "HOUSE" || value.propertyType === "APARTMENT" || value.propertyType === "AIRBNB";
  if (residential && value.bedrooms == null) {
    context.addIssue({ code: "custom", path: ["bedrooms"], message: "Enter the number of bedrooms." });
  }

  const date = new Date(`${value.preferredDate}T00:00:00Z`);
  const [year, month, day] = value.preferredDate.split("-").map(Number);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    context.addIssue({ code: "custom", path: ["preferredDate"], message: "Enter a valid preferred date." });
  }
});

export const ReturningCleaningRequestInputSchema = z.object({
  savedPropertyId: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1).optional().nullable()),
  useReturningCustomerContext: z.boolean().optional(),
  serviceId: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1, "Choose a cleaning service.")),
  propertyType: z.enum(PROPERTY_TYPES),
  bedrooms: z.number().finite().int().positive().optional().nullable(),
  bathrooms: bathroomValue.optional(),
  extraIds: z.array(z.string().trim().min(1)).optional().default([]),
  preferredDate: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid preferred date.")),
  preferredTimeWindow,
  customerName: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(2).max(120).optional().nullable()),
  customerEmail: z.preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), z.email("Enter a valid email address.").optional().nullable()),
  customerPhone: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1).max(40).optional().nullable()),
  addressLine1: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1).max(200).optional().nullable()),
  addressLine2: optionalTrimmedString(200),
  city: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().min(1).max(120).optional().nullable()),
  state: z.preprocess((value) => (typeof value === "string" ? value.trim().toUpperCase() : value), z.string().regex(/^[A-Z]{2}$/, "Enter a valid US state code.").optional().nullable()),
  postalCode: z.preprocess((value) => (typeof value === "string" ? value.trim() : value), z.string().regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid ZIP code.").optional().nullable()),
  customerNotes: optionalTrimmedString(2000),
}).strict().superRefine((value, context) => {
  const residential = value.propertyType === "HOUSE" || value.propertyType === "APARTMENT" || value.propertyType === "AIRBNB";
  if (residential && value.bedrooms == null) context.addIssue({ code: "custom", path: ["bedrooms"], message: "Enter the number of bedrooms." });
  const date = new Date(`${value.preferredDate}T00:00:00Z`);
  const [year, month, day] = value.preferredDate.split("-").map(Number);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) context.addIssue({ code: "custom", path: ["preferredDate"], message: "Enter a valid preferred date." });
});

export type CleaningRequestInput = z.input<typeof CleaningRequestInputSchema>;
export type ParsedCleaningRequestInput = z.output<typeof CleaningRequestInputSchema> | z.output<typeof ReturningCleaningRequestInputSchema>;
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type PreferredTimeWindow = (typeof PREFERRED_TIME_WINDOWS)[number];
