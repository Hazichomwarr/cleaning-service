import type { CleaningEstimateOutcome, PropertyType } from "../generated/prisma/client";
import { BUSINESS } from "../config/business";

export type RequestAcceptedCustomerEmailData = {
  requestNumber: string;
  customerName: string | null;
  serviceName: string;
  propertyType: PropertyType;
  preferredDate: string;
  preferredTimeWindow: string;
  estimateOutcome: CleaningEstimateOutcome;
  estimatedPrice: string | null;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function display(value: string | null | undefined, fallback = "Not provided"): string {
  return escapeHtml(value?.trim() || fallback);
}

function estimateLabel(data: RequestAcceptedCustomerEmailData): string {
  switch (data.estimateOutcome) {
    case "AUTOMATIC_ESTIMATE": return data.estimatedPrice ? `Starting estimate: $${data.estimatedPrice}` : "Our team will review the pricing.";
    case "MANUAL_QUOTE_REQUIRED": return "Pricing: A custom quote is required.";
    case "NO_CONFIGURED_ESTIMATE": return "Pricing: Our team will review the request and provide pricing.";
    case "ESTIMATE_UNAVAILABLE": return "Pricing: Our team will review the request manually.";
  }
}

export function renderRequestAcceptedCustomerEmail(data: RequestAcceptedCustomerEmailData): string {
  const property = `${data.propertyType.charAt(0)}${data.propertyType.slice(1).toLowerCase()}`;
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#101828;font-family:Arial,sans-serif;line-height:1.5"><main style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px"><p style="margin:0 0 6px;color:#667085;font-size:13px;text-transform:uppercase;letter-spacing:.08em">${BUSINESS.name}</p><h1 style="margin:0 0 22px;font-size:24px">We’ve received your cleaning request</h1><p>Hi ${display(data.customerName, "there")},</p><p>We’ve received your cleaning request and our team is reviewing it.</p><table style="border-collapse:collapse;width:100%;margin:22px 0"><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Request</strong></td><td style="padding:6px 0">${display(data.requestNumber)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Requested service</strong></td><td style="padding:6px 0">${display(data.serviceName)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Property</strong></td><td style="padding:6px 0">${display(property)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Preferred date</strong></td><td style="padding:6px 0">${display(data.preferredDate)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Preferred time</strong></td><td style="padding:6px 0">${display(data.preferredTimeWindow)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Pricing</strong></td><td style="padding:6px 0">${estimateLabel(data).replace(/^Pricing: /, "")}</td></tr></table><h2 style="font-size:17px">What happens next?</h2><p>We’ll review the details and contact you once the price and appointment are confirmed.</p><p style="margin-top:28px;padding-top:18px;border-top:1px solid #e4e7ec">Thank you,<br>${BUSINESS.name}</p></div></main></body></html>`;
}

export function requestAcceptedCustomerSubject(requestNumber: string): string {
  return `We’ve received your cleaning request — ${requestNumber}`;
}
