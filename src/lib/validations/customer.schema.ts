import { z } from "zod";
import { PROPERTY_TYPES } from "./cleaning-request.schema";

const optionalText = (max: number) => z.preprocess((value) => typeof value === "string" ? value.trim() : value, z.string().max(max).optional().nullable());
const optionalNumber = z.preprocess((value) => value === "" || value === undefined ? null : value, z.number().finite().optional().nullable());
const bathroom = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
}, z.union([z.null(), z.string()]).superRefine((value, context) => {
  if (value === null) return;
  if (!/^\d+(?:\.\d)?$/.test(value)) {
    context.addIssue({ code: "custom", message: "Enter a bathroom count with at most one decimal place." });
    return;
  }
  if (Number(value) <= 0) context.addIssue({ code: "custom", message: "Enter a positive bathroom count." });
}));

export const CustomerPropertyInputSchema = z.object({
  label: optionalText(80), propertyType: z.enum(PROPERTY_TYPES), addressLine1: z.preprocess((v) => typeof v === "string" ? v.trim() : v, z.string().min(1).max(200)),
  addressLine2: optionalText(200), city: z.preprocess((v) => typeof v === "string" ? v.trim() : v, z.string().min(1).max(120)),
  state: z.preprocess((v) => typeof v === "string" ? v.trim().toUpperCase() : v, z.string().regex(/^[A-Z]{2}$/)),
  postalCode: z.preprocess((v) => typeof v === "string" ? v.trim() : v, z.string().regex(/^\d{5}(?:-\d{4})?$/)),
  bedrooms: optionalNumber.pipe(z.union([z.null(), z.number().int().positive()])), bathrooms: bathroom,
  approximateSquareFeet: optionalNumber.pipe(z.union([z.null(), z.number().int().positive()])),
}).strict();

export const CustomerInputSchema = z.object({
  name: z.preprocess((v) => typeof v === "string" ? v.trim() : v, z.string().min(2).max(120)),
  email: z.preprocess((v) => typeof v === "string" ? v.trim().toLowerCase() : v, z.union([z.null(), z.undefined(), z.literal(""), z.email()]).transform((v) => v || null)),
  phone: z.preprocess((v) => typeof v === "string" ? v.trim() : v, z.union([z.null(), z.undefined(), z.literal(""), z.string().max(40)]).transform((v) => v || null)),
  property: CustomerPropertyInputSchema.optional().nullable(),
  allowDuplicateContact: z.boolean().optional().default(false),
}).strict().superRefine((value, context) => {
  if (!value.email && !value.phone) context.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number or email address." });
});

export type CustomerInput = z.input<typeof CustomerInputSchema>;
export type ParsedCustomerInput = z.output<typeof CustomerInputSchema>;
