import { PropertyType, Prisma } from "../generated/prisma/client.js";

export type ResidentialPricingInput = {
  propertyType: PropertyType;
  bedroomCount: number;
};

export type ResidentialPricingFailureReason =
  | "NOT_RESIDENTIAL"
  | "INVALID_BEDROOM_COUNT"
  | "NO_ACTIVE_RULE"
  | "AMBIGUOUS_ACTIVE_RULE";

export type ResidentialPricingResult =
  | {
      success: true;
      propertyType: PropertyType;
      bedroomCount: number;
      startingPrice: Prisma.Decimal;
      pricingRuleId: string;
    }
  | {
      success: false;
      reason: ResidentialPricingFailureReason;
    };

type PricingRuleRecord = {
  id: string;
  startingPrice: Prisma.Decimal;
};

export type PricingRuleReader = {
  findMany: (args: {
    where: {
      propertyType: null;
      bedroomCount: number;
      isActive: true;
    };
    select: {
      id: true;
      startingPrice: true;
    };
  }) => Promise<PricingRuleRecord[]>;
};

const RESIDENTIAL_PROPERTY_TYPES = new Set<PropertyType>([
  PropertyType.HOUSE,
  PropertyType.APARTMENT,
  PropertyType.AIRBNB,
]);

function isResidentialPropertyType(propertyType: PropertyType) {
  return RESIDENTIAL_PROPERTY_TYPES.has(propertyType);
}

function isValidBedroomCount(bedroomCount: number) {
  return (
    typeof bedroomCount === "number" &&
    Number.isFinite(bedroomCount) &&
    Number.isInteger(bedroomCount) &&
    bedroomCount > 0
  );
}

async function getDefaultPricingRuleReader(): Promise<PricingRuleReader> {
  const { prisma } = await import("../lib/db/prisma.js");
  return prisma.pricingRule;
}

export async function getResidentialStartingEstimate(
  input: ResidentialPricingInput,
  pricingRuleReader?: PricingRuleReader,
): Promise<ResidentialPricingResult> {
  if (!isResidentialPropertyType(input.propertyType)) {
    return { success: false, reason: "NOT_RESIDENTIAL" };
  }

  if (!isValidBedroomCount(input.bedroomCount)) {
    return { success: false, reason: "INVALID_BEDROOM_COUNT" };
  }

  const reader = pricingRuleReader ?? (await getDefaultPricingRuleReader());
  const matchingRules = await reader.findMany({
    where: {
      propertyType: null,
      bedroomCount: input.bedroomCount,
      isActive: true,
    },
    select: {
      id: true,
      startingPrice: true,
    },
  });

  if (matchingRules.length === 0) {
    return { success: false, reason: "NO_ACTIVE_RULE" };
  }

  if (matchingRules.length > 1) {
    return { success: false, reason: "AMBIGUOUS_ACTIVE_RULE" };
  }

  const [pricingRule] = matchingRules;

  return {
    success: true,
    propertyType: input.propertyType,
    bedroomCount: input.bedroomCount,
    startingPrice: pricingRule.startingPrice,
    pricingRuleId: pricingRule.id,
  };
}
