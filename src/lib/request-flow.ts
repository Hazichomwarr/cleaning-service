export type RequestFlowMode = "NEW_CUSTOMER" | "RETURNING_SAVED_PROPERTY" | "RETURNING_NEW_PROPERTY";
export type RequestFlowSection = "PROPERTY" | "SERVICE" | "EXTRAS" | "SCHEDULE" | "CONTACT" | "REVIEW";

export type RequestFlowStep = {
  id: RequestFlowSection;
  label: string;
  title: string;
  description: string;
};

const stepDefinitions: Record<RequestFlowSection, RequestFlowStep> = {
  PROPERTY: { id: "PROPERTY", label: "Property", title: "Tell us about the property", description: "A few details help us prepare a useful starting estimate." },
  SERVICE: { id: "SERVICE", label: "Service", title: "What kind of cleaning do you need?", description: "Choose the service that fits your space." },
  EXTRAS: { id: "EXTRAS", label: "Extras", title: "Anything extra you’d like us to handle?", description: "Choose as many as you need, or skip this step." },
  SCHEDULE: { id: "SCHEDULE", label: "Schedule", title: "When would you like us to come?", description: "Share your preferred timing and we’ll confirm availability." },
  CONTACT: { id: "CONTACT", label: "Your details", title: "Where should we reach you?", description: "We’ll use these details to follow up about your request." },
  REVIEW: { id: "REVIEW", label: "Review", title: "Review your request", description: "Make sure everything looks right before the next step." },
};

const flowSections: Record<RequestFlowMode, RequestFlowSection[]> = {
  NEW_CUSTOMER: ["PROPERTY", "SERVICE", "EXTRAS", "SCHEDULE", "CONTACT", "REVIEW"],
  RETURNING_SAVED_PROPERTY: ["SERVICE", "EXTRAS", "SCHEDULE", "REVIEW"],
  RETURNING_NEW_PROPERTY: ["PROPERTY", "SERVICE", "EXTRAS", "SCHEDULE", "REVIEW"],
};

export function getRequestFlowSteps(mode: RequestFlowMode): RequestFlowStep[] {
  return flowSections[mode].map((section) => stepDefinitions[section]);
}

export function getRequestFlowStepIndex(mode: RequestFlowMode, section: RequestFlowSection): number {
  return flowSections[mode].indexOf(section);
}

export function getRequestFlowSections(mode: RequestFlowMode): RequestFlowSection[] {
  return [...flowSections[mode]];
}

const fieldSections: Record<string, RequestFlowSection> = {
  serviceId: "SERVICE", propertyType: "PROPERTY", bedrooms: "PROPERTY", bathrooms: "PROPERTY",
  extraIds: "EXTRAS", preferredDate: "SCHEDULE", preferredTimeWindow: "SCHEDULE",
  customerName: "CONTACT", customerEmail: "CONTACT", customerPhone: "CONTACT",
  addressLine1: "PROPERTY", addressLine2: "PROPERTY", city: "PROPERTY", state: "PROPERTY", postalCode: "PROPERTY",
  customerNotes: "REVIEW",
};

export function getRequestFlowSectionForField(field: string, mode: RequestFlowMode = "NEW_CUSTOMER"): RequestFlowSection {
  if (mode === "NEW_CUSTOMER" && ["addressLine1", "addressLine2", "city", "state", "postalCode"].includes(field)) return "CONTACT";
  return fieldSections[field] ?? "REVIEW";
}
