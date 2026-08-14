import type { CleaningEstimateOutcome, PropertyType } from "../generated/prisma/client";

export type NewRequestAdminEmailData = {
  requestId: string;
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: string | null;
  serviceName: string;
  extraNames: string[];
  preferredDate: string;
  preferredTimeWindow: string;
  estimatedPrice: string | null;
  estimateOutcome: CleaningEstimateOutcome;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  customerNotes: string | null;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function display(value: string | null | undefined): string {
  return escapeHtml(value?.trim() || "Not provided");
}

function propertyLabel(propertyType: PropertyType): string {
  return propertyType.charAt(0) + propertyType.slice(1).toLowerCase();
}

function estimateLabel(data: NewRequestAdminEmailData): string {
  switch (data.estimateOutcome) {
    case "AUTOMATIC_ESTIMATE": return data.estimatedPrice ? `$${data.estimatedPrice}` : "Estimate unavailable — review required";
    case "MANUAL_QUOTE_REQUIRED": return "Manual quote required";
    case "NO_CONFIGURED_ESTIMATE": return "No automatic estimate configured";
    case "ESTIMATE_UNAVAILABLE": return "Estimate unavailable — review required";
  }
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 16px 6px 0;color:#667085;vertical-align:top;white-space:nowrap"><strong>${escapeHtml(label)}</strong></td><td style="padding:6px 0">${value}</td></tr>`;
}

export function renderNewRequestAdminEmail(data: NewRequestAdminEmailData): string {
  const propertyDetails = [
    propertyLabel(data.propertyType),
    data.bedrooms === null ? null : `${data.bedrooms} bedroom${data.bedrooms === 1 ? "" : "s"}`,
    data.bathrooms === null ? null : `${data.bathrooms} bathroom${data.bathrooms === "1" ? "" : "s"}`,
  ].filter(Boolean).join(" · ");
  const extras = data.extraNames.length > 0
    ? data.extraNames.map((name) => `<li>${display(name)}</li>`).join("")
    : "<li>None selected</li>";
  const address = [data.addressLine1, data.addressLine2, `${data.city}, ${data.state} ${data.postalCode}`]
    .filter((value): value is string => Boolean(value))
    .map(display)
    .join("<br>");
  const notes = data.customerNotes ? display(data.customerNotes) : "None provided";

  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#101828;font-family:Arial,sans-serif;line-height:1.5"><main style="max-width:640px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px"><p style="margin:0 0 6px;color:#667085;font-size:13px;text-transform:uppercase;letter-spacing:.08em">Just Cleaning</p><h1 style="margin:0 0 24px;font-size:25px">New cleaning request</h1><table style="border-collapse:collapse;width:100%">${row("Request", display(data.requestNumber))}${row("Customer", `${display(data.customerName)}<br>${display(data.customerPhone)}<br>${display(data.customerEmail)}`)}${row("Property", display(propertyDetails))}${row("Service", display(data.serviceName))}${row("Preferred schedule", `${display(data.preferredDate)}<br>${display(data.preferredTimeWindow)}`)}${row("Starting estimate", estimateLabel(data))}${row("Address", address)}</table><h2 style="margin:26px 0 8px;font-size:17px">Extras</h2><ul style="margin:0;padding-left:20px">${extras}</ul><h2 style="margin:26px 0 8px;font-size:17px">Customer notes</h2><p style="margin:0;white-space:pre-wrap">${notes}</p><p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e4e7ec;color:#475467">Open the admin dashboard to review this request.</p></div></main></body></html>`;
}
