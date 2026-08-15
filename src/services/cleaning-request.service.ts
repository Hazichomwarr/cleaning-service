import { CleaningEstimateOutcome, CleaningRequestStatus, Prisma } from "../generated/prisma/client";
import { renderNewRequestAdminEmail } from "../emails/new-request-admin.email";
import { getBusinessNotificationConfig } from "../lib/notifications/business-notification-config";
import { getNextCleaningRequestNumber, isRequestNumberCollision } from "../lib/cleaning-request-number";
import { deliverNotification, createEmailNotification, type NotificationDatabase } from "./notification.service";
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

type PersistedRequest = {
  request: CreatedRequestRecord;
  notificationId: string | null;
};

type RequestTransaction = {
  cleaningRequest: {
    findMany: (args: { where: { requestNumber: { startsWith: string } }; select: { requestNumber: true } }) => Promise<Array<{ requestNumber: string }>>;
    create: (args: { data: Record<string, unknown>; select: { id: true; requestNumber: true; status: true; estimateOutcome: true; estimatedPrice: true } }) => Promise<CreatedRequestRecord>;
  };
  cleaningService?: {
    findUnique: (args: { where: { id: string }; select: { name: true } }) => Promise<{ name: string } | null>;
  };
  cleaningExtra?: {
    findMany: (args: { where: { id: { in: string[] } }; select: { name: true } }) => Promise<Array<{ name: string }>>;
  };
  customer?: {
    findUnique: (args: { where: { id: string; isActive: true }; select: { id: true; name: true; email: true; phone: true } }) => Promise<{ id: string; name: string; email: string | null; phone: string | null } | null>;
  };
  customerProperty?: {
    findUnique: (args: { where: { id: string; customerId: string; isActive: true }; select: { id: true; customerId: true; addressLine1: true; addressLine2: true; city: true; state: true; postalCode: true; propertyType: true; bedrooms: true; bathrooms: true; approximateSquareFeet: true } }) => Promise<{ id: string; customerId: string; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string; propertyType: ValidatedCleaningRequestCommand["propertyType"]; bedrooms: number | null; bathrooms: Prisma.Decimal | null; approximateSquareFeet: number | null } | null>;
  };
  notification?: NotificationDatabase["notification"];
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
  businessNotificationEnv?: Record<string, string | undefined>;
  emailProvider?: Parameters<typeof deliverNotification>[1] extends infer Options ? Options extends { emailProvider?: infer Provider } ? Provider : never : never;
  /** Trusted context resolved from the signed returning-customer cookie by the server action. */
  returningCustomerContext?: { customerId: string };
};

export type CleaningRequestCreationFailureReason = "INVALID_INPUT" | "SERVICE_UNAVAILABLE" | "EXTRA_UNAVAILABLE" | "RETURNING_CUSTOMER_VERIFICATION_REQUIRED" | "RETURNING_CUSTOMER_PROPERTY_INVALID" | "RETURNING_CUSTOMER_PROFILE_INCOMPLETE" | "INTERNAL_ERROR";

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

class RequestLinkingError extends Error {
  constructor(readonly reason: Extract<CleaningRequestCreationFailureReason, `RETURNING_CUSTOMER_${string}`>) {
    super(reason);
  }
}

type RequestSnapshot = {
  customerId: string | null;
  customerPropertyId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  propertyType: ValidatedCleaningRequestCommand["propertyType"];
  bedrooms: number | null;
  bathrooms: string | null;
  approximateSquareFeet: number | null;
};

function getSavedPropertyId(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = (input as Record<string, unknown>).savedPropertyId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRequestSnapshot(command: ValidatedCleaningRequestCommand): RequestSnapshot {
  return { customerId: null, customerPropertyId: null, customerName: command.customerName, customerEmail: command.customerEmail, customerPhone: command.customerPhone, addressLine1: command.addressLine1, addressLine2: command.addressLine2, city: command.city, state: command.state, postalCode: command.postalCode, propertyType: command.propertyType, bedrooms: command.bedrooms, bathrooms: command.bathrooms, approximateSquareFeet: null };
}

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
  businessNotificationEnv: Record<string, string | undefined>,
  returningCustomerContext: CleaningRequestCreationOptions["returningCustomerContext"],
  savedPropertyId: string | null,
): Promise<PersistedRequest> {
  const year = now;
  const businessRecipient = getBusinessNotificationConfig(businessNotificationEnv);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await database.$transaction(async (transaction) => {
        const prefix = `JC-${getBusinessYear(year)}-`;
        const existing = await transaction.cleaningRequest.findMany({
          where: { requestNumber: { startsWith: prefix } },
          select: { requestNumber: true },
        });
        const requestNumber = getNextCleaningRequestNumber(existing.map((item) => item.requestNumber), year);
        const snapshot = getRequestSnapshot(command);

        if (returningCustomerContext) {
          if (!transaction.customer) throw new Error("Returning customer transaction boundary is unavailable.");
          const customer = await transaction.customer.findUnique({ where: { id: returningCustomerContext.customerId, isActive: true }, select: { id: true, name: true, email: true, phone: true } });
          if (!customer) throw new RequestLinkingError("RETURNING_CUSTOMER_VERIFICATION_REQUIRED");
          if (!customer.name.trim() || !customer.email?.trim() || !customer.phone?.trim()) throw new RequestLinkingError("RETURNING_CUSTOMER_PROFILE_INCOMPLETE");
          snapshot.customerId = customer.id;
          snapshot.customerName = customer.name;
          snapshot.customerEmail = customer.email.trim().toLowerCase();
          snapshot.customerPhone = customer.phone.trim();

          if (savedPropertyId) {
            if (!transaction.customerProperty) throw new Error("Saved property transaction boundary is unavailable.");
            const property = await transaction.customerProperty.findUnique({ where: { id: savedPropertyId, customerId: customer.id, isActive: true }, select: { id: true, customerId: true, addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true, propertyType: true, bedrooms: true, bathrooms: true, approximateSquareFeet: true } });
            if (!property) throw new RequestLinkingError("RETURNING_CUSTOMER_PROPERTY_INVALID");
            snapshot.customerPropertyId = property.id;
            snapshot.addressLine1 = property.addressLine1;
            snapshot.addressLine2 = property.addressLine2;
            snapshot.city = property.city;
            snapshot.state = property.state;
            snapshot.postalCode = property.postalCode;
            snapshot.propertyType = property.propertyType;
            snapshot.bedrooms = property.bedrooms;
            snapshot.bathrooms = property.bathrooms?.toString() ?? null;
            snapshot.approximateSquareFeet = property.approximateSquareFeet;
          }
        } else if (savedPropertyId) {
          throw new RequestLinkingError("RETURNING_CUSTOMER_VERIFICATION_REQUIRED");
        }

        const created = await transaction.cleaningRequest.create({
          data: {
            requestNumber,
            serviceId: command.serviceId,
            customerId: snapshot.customerId,
            customerPropertyId: snapshot.customerPropertyId,
            customerName: snapshot.customerName,
            customerEmail: snapshot.customerEmail,
            customerPhone: snapshot.customerPhone,
            addressLine1: snapshot.addressLine1,
            addressLine2: snapshot.addressLine2,
            city: snapshot.city,
            state: snapshot.state,
            postalCode: snapshot.postalCode,
            propertyType: snapshot.propertyType,
            bedrooms: snapshot.bedrooms,
            bathrooms: snapshot.bathrooms === null ? null : new Prisma.Decimal(snapshot.bathrooms),
            approximateSquareFeet: snapshot.approximateSquareFeet,
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

        if (!businessRecipient.success) {
          console.error("[notification] business recipient configuration unavailable", { errorCode: businessRecipient.errorCode, requestId: created.id, type: "NEW_REQUEST_ADMIN" });
          return { request: created, notificationId: null };
        }

        if (!transaction.cleaningService || !transaction.cleaningExtra || !transaction.notification) throw new Error("Notification transaction boundary is unavailable.");
        const service = await transaction.cleaningService.findUnique({ where: { id: command.serviceId }, select: { name: true } });
        const extras = command.extraIds.length > 0
          ? await transaction.cleaningExtra.findMany({ where: { id: { in: command.extraIds } }, select: { name: true } })
          : [];
        if (!service || extras.length !== command.extraIds.length) throw new Error("Unable to snapshot request references for notification.");

        const notification = await createEmailNotification({
          type: "NEW_REQUEST_ADMIN",
          recipientEmail: businessRecipient.config.email,
          recipientName: businessRecipient.config.name,
          subject: `New cleaning request — ${created.requestNumber}`,
          html: renderNewRequestAdminEmail({
            requestId: created.id,
            requestNumber: created.requestNumber,
            customerName: snapshot.customerName,
            customerEmail: snapshot.customerEmail,
            customerPhone: snapshot.customerPhone,
            propertyType: snapshot.propertyType,
            bedrooms: snapshot.bedrooms,
            bathrooms: snapshot.bathrooms,
            serviceName: service.name,
            extraNames: extras.map((extra) => extra.name),
            preferredDate: command.preferredDate,
            preferredTimeWindow: command.preferredTimeWindow,
            estimatedPrice: created.estimatedPrice?.toFixed(2) ?? null,
            estimateOutcome: created.estimateOutcome,
            addressLine1: snapshot.addressLine1,
            addressLine2: snapshot.addressLine2,
            city: snapshot.city,
            state: snapshot.state,
            postalCode: snapshot.postalCode,
            customerNotes: command.customerNotes,
          }),
          cleaningRequestId: created.id,
        }, { database: transaction as unknown as NotificationDatabase });
        if (!notification.success) throw new Error("Unable to persist new-request notification intent.");
        return { request: created, notificationId: notification.notification.id };
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
  const savedPropertyId = getSavedPropertyId(input);
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
    const created = await persistRequest(database, command, estimate, options.now ?? new Date(), options.maxRequestNumberAttempts ?? MAX_REQUEST_NUMBER_ATTEMPTS, options.businessNotificationEnv ?? process.env, options.returningCustomerContext, savedPropertyId);
    if (created.notificationId) {
      try {
        await deliverNotification(created.notificationId, { database: database as unknown as NotificationDatabase, emailProvider: options.emailProvider });
      } catch {
        console.error("[notification] new-request delivery failed unexpectedly", { notificationId: created.notificationId, type: "NEW_REQUEST_ADMIN" });
      }
    }
    return {
      success: true,
      request: {
        id: created.request.id,
        requestNumber: created.request.requestNumber,
        status: "NEW",
        estimate: {
          outcome: created.request.estimateOutcome,
          amount: created.request.estimatedPrice?.toFixed(2) ?? null,
          currency: "USD",
        },
      },
    };
  } catch (error) {
    if (error instanceof RequestLinkingError) return { success: false, reason: error.reason };
    return { success: false, reason: "INTERNAL_ERROR" };
  }
}

export { MAX_REQUEST_NUMBER_ATTEMPTS, mapPricingResult, hasValidEstimateInvariant, toPreferredDateTime };
