import { CleaningEstimateOutcome, CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { getNextCleaningRequestNumber, isRequestNumberCollision } from "../lib/cleaning-request-number";
import {
  validateCleaningRequest,
  getBusinessYear,
  type CleaningRequestValidationResult,
  type ValidatedCleaningRequestCommand,
} from "./cleaning-request-validation.service";
import {
  getResidentialStartingEstimate,
  type ResidentialPricingResult,
} from "./cleaning-pricing.service";

const MAX_REQUEST_NUMBER_ATTEMPTS = 5;

type CreatedRequestRecord = {
  id: string;
  requestNumber: string;
  status: CleaningRequestStatus;
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: Prisma.Decimal | null;
};

type RequestTransaction = {
  cleaningRequest: {
    findMany: (args: { where: { requestNumber: { startsWith: string } }; select: { requestNumber: true } }) => Promise<Array<{ requestNumber: string }>>;
    create: (args: { data: Record<string, unknown>; select: { id: true; requestNumber: true; status: true; estimateOutcome: true; estimatedPrice: true } }) => Promise<CreatedRequestRecord>;
  };
};

type RequestDatabase = {
  $transaction: <T>(callback: (transaction: RequestTransaction) => Promise<T>) => Promise<T>;
};

type PricingResolver = (input: { propertyType: ValidatedCleaningRequestCommand["propertyType"]; bedroomCount: number }) => Promise<ResidentialPricingResult>;
type RequestValidator = (input: unknown) => Promise<CleaningRequestValidationResult>;

export type CleaningRequestCreationOptions = {
  validator?: RequestValidator;
  pricingResolver?: PricingResolver;
  database?: RequestDatabase;
  now?: Date;
  maxRequestNumberAttempts?: number;
};

export type CleaningRequestCreationFailureReason = "INVALID_INPUT" | "SERVICE_UNAVAILABLE" | "EXTRA_UNAVAILABLE" | "INTERNAL_ERROR";

export type CleaningRequestCreationResult =
  | {
      success: true;
      request: {
        id: string;
        requestNumber: string;
        status: "NEW";
        estimate: {
          outcome: CleaningEstimateOutcome;
          amount: string | null;
          currency: "USD";
        };
      };
    }
  | {
      success: false;
      reason: CleaningRequestCreationFailureReason;
      fieldErrors?: Record<string, string[]>;
    };

type PersistedEstimate = {
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: Prisma.Decimal | null;
};

function mapPricingResult(result: ResidentialPricingResult): PersistedEstimate | null {
  if (result.success) {
    return {
      estimateOutcome: CleaningEstimateOutcome.AUTOMATIC_ESTIMATE,
      estimatedPrice: result.startingPrice,
    };
  }

  switch (result.reason) {
    case "NOT_RESIDENTIAL":
      return { estimateOutcome: CleaningEstimateOutcome.MANUAL_QUOTE_REQUIRED, estimatedPrice: null };
    case "NO_ACTIVE_RULE":
      return { estimateOutcome: CleaningEstimateOutcome.NO_CONFIGURED_ESTIMATE, estimatedPrice: null };
    case "AMBIGUOUS_ACTIVE_RULE":
      return { estimateOutcome: CleaningEstimateOutcome.ESTIMATE_UNAVAILABLE, estimatedPrice: null };
    case "INVALID_BEDROOM_COUNT":
      return null;
  }
}

function toPreferredDateTime(preferredDate: string): Date {
  return new Date(`${preferredDate}T00:00:00.000Z`);
}

function isAutomaticEstimate(estimate: PersistedEstimate): boolean {
  return estimate.estimateOutcome === CleaningEstimateOutcome.AUTOMATIC_ESTIMATE;
}

function hasValidEstimateInvariant(estimate: PersistedEstimate): boolean {
  return isAutomaticEstimate(estimate)
    ? estimate.estimatedPrice !== null
    : estimate.estimatedPrice === null;
}

async function getDefaultDatabase(): Promise<RequestDatabase> {
  const { prisma } = await import("../lib/db/prisma");
  return prisma as unknown as RequestDatabase;
}

async function persistRequest(
  database: RequestDatabase,
  command: ValidatedCleaningRequestCommand,
  estimate: PersistedEstimate,
  now: Date,
  maxAttempts: number,
): Promise<CreatedRequestRecord> {
  const year = now;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await database.$transaction(async (transaction) => {
        const prefix = `JC-${getBusinessYear(year)}-`;
        const existing = await transaction.cleaningRequest.findMany({
          where: { requestNumber: { startsWith: prefix } },
          select: { requestNumber: true },
        });
        const requestNumber = getNextCleaningRequestNumber(existing.map((item) => item.requestNumber), year);

        return transaction.cleaningRequest.create({
          data: {
            requestNumber,
            serviceId: command.serviceId,
            customerName: command.customerName,
            customerEmail: command.customerEmail,
            customerPhone: command.customerPhone,
            addressLine1: command.addressLine1,
            addressLine2: command.addressLine2,
            city: command.city,
            state: command.state,
            postalCode: command.postalCode,
            propertyType: command.propertyType,
            bedrooms: command.bedrooms,
            bathrooms: command.bathrooms === null ? null : new Prisma.Decimal(command.bathrooms),
            preferredDate: toPreferredDateTime(command.preferredDate),
            preferredTimeWindow: command.preferredTimeWindow,
            estimatedPrice: estimate.estimatedPrice,
            estimateOutcome: estimate.estimateOutcome,
            confirmedPrice: null,
            scheduledStart: null,
            scheduledEnd: null,
            customerNotes: command.customerNotes,
            internalNotes: null,
            status: CleaningRequestStatus.NEW,
            cancelledAt: null,
            cancellationReason: null,
            requestExtras: command.extraIds.length > 0
              ? { create: command.extraIds.map((cleaningExtraId) => ({ cleaningExtraId })) }
              : undefined,
          },
          select: { id: true, requestNumber: true, status: true, estimateOutcome: true, estimatedPrice: true },
        });
      });
    } catch (error) {
      if (!isRequestNumberCollision(error) || attempt === maxAttempts - 1) throw error;
    }
  }

  throw new Error("Request number generation exhausted its retry bound.");
}

export async function createCleaningRequest(
  input: unknown,
  options: CleaningRequestCreationOptions = {},
): Promise<CleaningRequestCreationResult> {
  const validator = options.validator ?? validateCleaningRequest;
  let validation: CleaningRequestValidationResult;

  try {
    validation = await validator(input);
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }

  if (!validation.success) {
    return {
      success: false,
      reason: validation.reason,
      fieldErrors: validation.fieldErrors,
    };
  }

  const command = validation.data;
  const pricingResolver = options.pricingResolver ?? getResidentialStartingEstimate;
  let pricingResult: ResidentialPricingResult;

  try {
    pricingResult = await pricingResolver({
      propertyType: command.propertyType,
      bedroomCount: command.bedrooms ?? 0,
    });
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }

  const estimate = mapPricingResult(pricingResult);
  if (!estimate || !hasValidEstimateInvariant(estimate)) return { success: false, reason: "INTERNAL_ERROR" };

  try {
    const database = options.database ?? await getDefaultDatabase();
    const created = await persistRequest(database, command, estimate, options.now ?? new Date(), options.maxRequestNumberAttempts ?? MAX_REQUEST_NUMBER_ATTEMPTS);
    return {
      success: true,
      request: {
        id: created.id,
        requestNumber: created.requestNumber,
        status: "NEW",
        estimate: {
          outcome: created.estimateOutcome,
          amount: created.estimatedPrice?.toFixed(2) ?? null,
          currency: "USD",
        },
      },
    };
  } catch {
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

export { MAX_REQUEST_NUMBER_ATTEMPTS, mapPricingResult, hasValidEstimateInvariant, toPreferredDateTime };
