"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Phone, Sparkles } from "lucide-react";
import Link from "next/link";
import { getCleaningEstimate } from "@/app/actions/get-cleaning-estimate";
import {
  submitCleaningRequest,
  type SubmitCleaningRequestResult,
} from "@/app/actions/submit-cleaning-request";
import type {
  CatalogItem,
  CleaningRequestDraft,
  PropertyType,
} from "@/src/types/cleaning-request-draft";
import {
  getEarliestRequestErrorStep,
  getRequestFieldLabel,
  isResidentialPropertyType,
  mapEstimateResult,
  REQUEST_STEP,
  toggleRequestExtra,
  updateRequestDraft,
} from "@/src/lib/request-form";
import {
  toRequestConfirmationData,
  type RequestConfirmationData,
} from "@/src/lib/request-confirmation";
import EstimateCard, { type EstimateState } from "./EstimateCard";
import RequestProgress from "./RequestProgress";
import ServiceStep from "./ServiceStep";
import PropertyStep from "./PropertyStep";
import ExtrasStep from "./ExtrasStep";
import ScheduleStep from "./ScheduleStep";
import ContactStep from "./ContactStep";
import ReviewStep from "./ReviewStep";
import RequestConfirmation from "./RequestConfirmation";

const steps = [
  {
    label: "Property",
    title: "Tell us about the property",
    description: "A few details help us prepare a useful starting estimate.",
  },
  {
    label: "Service",
    title: "What kind of cleaning do you need?",
    description: "Choose the service that fits your space.",
  },
  {
    label: "Extras",
    title: "Anything extra you’d like us to handle?",
    description: "Choose as many as you need, or skip this step.",
  },
  {
    label: "Schedule",
    title: "When would you like us to come?",
    description: "Share your preferred timing and we’ll confirm availability.",
  },
  {
    label: "Your details",
    title: "Where should we reach you?",
    description: "We’ll use these details to follow up about your request.",
  },
  {
    label: "Review",
    title: "Review your request",
    description: "Make sure everything looks right before the next step.",
  },
];

const emptyDraft: CleaningRequestDraft = {
  serviceId: "",
  serviceName: "",
  propertyType: "",
  bedrooms: undefined,
  bathrooms: "",
  extraIds: [],
  preferredDate: "",
  preferredTimeWindow: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  customerNotes: "",
};

type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "error";
      reason: Extract<
        SubmitCleaningRequestResult,
        { success: false }
      >["reason"];
      fieldErrors?: Record<string, string[]>;
    }
  | { status: "success"; request: RequestConfirmationData };

function isComplete(step: number, draft: CleaningRequestDraft): boolean {
  if (step === REQUEST_STEP.PROPERTY)
    return (
      Boolean(draft.propertyType) &&
      (!isResidentialPropertyType(draft.propertyType) ||
        Boolean(
          draft.bedrooms &&
          Number.isInteger(draft.bedrooms) &&
          draft.bedrooms > 0,
        ))
    );
  if (step === REQUEST_STEP.SERVICE) return Boolean(draft.serviceId);
  if (step === REQUEST_STEP.SCHEDULE)
    return Boolean(draft.preferredDate && draft.preferredTimeWindow);
  if (step === REQUEST_STEP.DETAILS)
    return Boolean(
      draft.customerName &&
      draft.customerEmail &&
      draft.customerPhone &&
      draft.addressLine1 &&
      draft.city &&
      draft.state &&
      draft.postalCode,
    );
  return true;
}

export default function CleaningRequestForm({
  services,
  extras,
  savedPropertyId = null,
}: {
  services: CatalogItem[];
  extras: CatalogItem[];
  savedPropertyId?: string | null;
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [currentStep, setCurrentStep] = useState(0);
  const [estimate, setEstimate] = useState<EstimateState>({ status: "idle" });
  const [submission, setSubmission] = useState<SubmissionState>({
    status: "idle",
  });
  const submissionInFlight = useRef(false);
  const estimateSequence = useRef(0);

  useEffect(() => {
    if (!draft.propertyType) {
      return;
    }

    const requestId = ++estimateSequence.current;
    const input = {
      propertyType: draft.propertyType,
      bedroomCount: isResidentialPropertyType(draft.propertyType)
        ? draft.bedrooms
        : 1,
    };

    void getCleaningEstimate(input)
      .then((result) => {
        if (requestId === estimateSequence.current)
          setEstimate(mapEstimateResult(result));
      })
      .catch(() => {
        if (requestId === estimateSequence.current)
          setEstimate({ status: "unavailable" });
      });

    return () => {
      estimateSequence.current += 1;
    };
  }, [draft.propertyType, draft.bedrooms]);

  const update = <K extends keyof CleaningRequestDraft>(
    field: K,
    value: CleaningRequestDraft[K],
  ) => {
    setDraft((current) => updateRequestDraft(current, field, value));
  };

  const chooseService = (service: CatalogItem) => {
    setDraft((current) => ({
      ...current,
      serviceId: service.id,
      serviceName: service.name,
    }));
  };

  const chooseProperty = (propertyType: PropertyType) => {
    setEstimate({
      status:
        isResidentialPropertyType(propertyType) && !draft.bedrooms
          ? "idle"
          : "loading",
    });
    setDraft((current) => ({
      ...current,
      propertyType,
      bedrooms: isResidentialPropertyType(propertyType)
        ? current.bedrooms
        : undefined,
      bathrooms: isResidentialPropertyType(propertyType)
        ? current.bathrooms
        : "",
    }));
  };

  const chooseBedrooms = (bedrooms: number | undefined) => {
    setEstimate({ status: bedrooms ? "loading" : "idle" });
    update("bedrooms", bedrooms);
  };

  const submit = async () => {
    if (submissionInFlight.current || submission.status === "success") return;

    submissionInFlight.current = true;
    setSubmission({ status: "submitting" });

    const input = {
      serviceId: draft.serviceId,
      propertyType: draft.propertyType,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      extraIds: draft.extraIds,
      preferredDate: draft.preferredDate,
      preferredTimeWindow: draft.preferredTimeWindow,
      customerName: draft.customerName,
      customerEmail: draft.customerEmail,
      customerPhone: draft.customerPhone,
      addressLine1: draft.addressLine1,
      addressLine2: draft.addressLine2,
      city: draft.city,
      state: draft.state,
      postalCode: draft.postalCode,
      customerNotes: draft.customerNotes,
      savedPropertyId,
    };

    try {
      const result = await submitCleaningRequest(input);
      if (result.success) {
        const confirmationData = toRequestConfirmationData(
          draft,
          result.request,
        );
        setDraft(emptyDraft);
        setEstimate({ status: "idle" });
        setSubmission({ status: "success", request: confirmationData });
        return;
      }

      setSubmission({
        status: "error",
        reason: result.reason,
        fieldErrors: result.fieldErrors,
      });
      if (result.reason === "INVALID_INPUT" && result.fieldErrors) {
        setCurrentStep(getEarliestRequestErrorStep(result.fieldErrors));
      } else if (result.reason === "SERVICE_UNAVAILABLE") {
        setCurrentStep(REQUEST_STEP.SERVICE);
      } else if (result.reason === "EXTRA_UNAVAILABLE") {
        setCurrentStep(REQUEST_STEP.EXTRAS);
      }
    } catch {
      setSubmission({ status: "error", reason: "INTERNAL_ERROR" });
    } finally {
      submissionInFlight.current = false;
    }
  };

  const submissionMessage =
    submission.status === "error"
      ? submission.reason === "SERVICE_UNAVAILABLE"
        ? "That service is no longer available. Please choose another service."
        : submission.reason === "EXTRA_UNAVAILABLE"
          ? "One of the selected extras is no longer available. Please review your selections."
          : submission.reason === "INTERNAL_ERROR"
            ? "We couldn't send your request right now. Your information is still here. Please try again."
            : submission.reason === "RETURNING_CUSTOMER_VERIFICATION_REQUIRED"
              ? "Your returning-customer verification is no longer valid. Please verify again or continue as a new customer."
              : submission.reason === "RETURNING_CUSTOMER_PROPERTY_INVALID"
                ? "That saved property is no longer available. Please choose another property and try again."
                : submission.reason === "RETURNING_CUSTOMER_PROFILE_INCOMPLETE"
                  ? "We couldn’t use the saved customer profile for this request. Please continue as a new customer."
            : "Please review the highlighted information and try again."
      : null;

  const startAnotherRequest = () => {
    submissionInFlight.current = false;
    setDraft(emptyDraft);
    setEstimate({ status: "idle" });
    setSubmission({ status: "idle" });
    setCurrentStep(REQUEST_STEP.PROPERTY);
  };

  const renderStep = () => {
    switch (currentStep) {
      case REQUEST_STEP.PROPERTY:
        return (
          <PropertyStep
            draft={draft}
            estimate={estimate}
            onPropertyTypeChange={chooseProperty}
            onBedroomsChange={chooseBedrooms}
            onBathroomsChange={(bathrooms) => update("bathrooms", bathrooms)}
          />
        );
      case REQUEST_STEP.SERVICE:
        return (
          <ServiceStep
            services={services}
            selectedId={draft.serviceId}
            onSelect={chooseService}
          />
        );
      case REQUEST_STEP.EXTRAS:
        return (
          <ExtrasStep
            extras={extras}
            selectedIds={draft.extraIds}
            onToggle={(extraId) =>
              update("extraIds", toggleRequestExtra(draft.extraIds, extraId))
            }
          />
        );
      case REQUEST_STEP.SCHEDULE:
        return (
          <ScheduleStep
            preferredDate={draft.preferredDate}
            preferredTimeWindow={draft.preferredTimeWindow}
            onDateChange={(date) => update("preferredDate", date)}
            onTimeChange={(timeWindow) =>
              update("preferredTimeWindow", timeWindow)
            }
          />
        );
      case REQUEST_STEP.DETAILS:
        return <ContactStep draft={draft} onChange={update} />;
      default:
        return (
          <ReviewStep
            draft={draft}
            services={services}
            extras={extras}
            estimate={estimate}
            onEdit={setCurrentStep}
          />
        );
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            Just Cleaning
          </Link>
          <a
            href="tel:+19084145613"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
          >
            <Phone aria-hidden="true" className="size-4 text-blue-600" />
            <span className="hidden sm:inline">Questions? (908) 414-5613</span>
            <span className="sm:hidden">Call us</span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:py-12 lg:px-8 lg:py-16">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            <Check aria-hidden="true" className="size-3.5" />A simpler way to
            get started
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Plan your clean space with us.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            Tell us a little about what you need. It only takes a few minutes,
            and there’s no obligation to book.
          </p>
        </div>

        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {submission.status === "success" ? (
            <RequestConfirmation
              data={submission.request}
              onRequestAnother={startAnotherRequest}
            />
          ) : (
            <>
              <div className="border-b border-slate-100 px-5 py-5 sm:px-8">
                <RequestProgress
                  currentStep={currentStep + 1}
                  totalSteps={steps.length}
                  label={steps[currentStep].label}
                />
              </div>
              <div className="px-5 py-7 sm:px-8 sm:py-9">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {steps[currentStep].title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                    {steps[currentStep].description}
                  </p>
                </div>
                <>
                  {submissionMessage ? (
                    <div
                      className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-950"
                      role="alert"
                    >
                      <p className="font-semibold">{submissionMessage}</p>
                      {submission.status === "error" &&
                      submission.fieldErrors ? (
                        <ul className="mt-2 list-disc pl-5">
                          {Object.entries(submission.fieldErrors).flatMap(
                            ([field, messages]) =>
                              messages.map((message) => (
                                <li key={`${field}-${message}`}>
                                  {getRequestFieldLabel(field)}: {message}
                                </li>
                              )),
                          )}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  {services.length === 0 &&
                  currentStep === REQUEST_STEP.SERVICE ? (
                    <EstimateCard state={{ status: "unavailable" }} />
                  ) : (
                    renderStep()
                  )}
                </>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentStep((step) => Math.max(0, step - 1))
                  }
                  disabled={
                    currentStep === 0 || submission.status === "submitting"
                  }
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Back
                </button>
                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentStep((step) =>
                        Math.min(steps.length - 1, step + 1),
                      )
                    }
                    disabled={
                      !isComplete(currentStep, draft) ||
                      submission.status === "submitting"
                    }
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Continue
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={submission.status === "submitting"}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {submission.status === "submitting"
                      ? "Sending your request…"
                      : "Send cleaning request"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
