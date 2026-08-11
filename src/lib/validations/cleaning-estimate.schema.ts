import { PropertyType } from "../../generated/prisma/client.js";
import { z } from "zod";

export const PublicCleaningEstimateSchema = z
  .object({
    propertyType: z.enum([
      PropertyType.HOUSE,
      PropertyType.APARTMENT,
      PropertyType.AIRBNB,
      PropertyType.OFFICE,
      PropertyType.COMMERCIAL,
      PropertyType.OTHER,
    ]),
    bedroomCount: z.number().finite().int().positive(),
  })
  .strict();

export type PublicCleaningEstimateInput = z.infer<
  typeof PublicCleaningEstimateSchema
>;
