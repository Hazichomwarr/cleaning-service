import type { PropertyType } from "../generated/prisma/client";
import { BUSINESS } from "../config/business";

export type RequestConfirmedCustomerEmailData = {
  requestNumber: string;
  customerName: string | null;
  serviceName: string;
  propertyType: PropertyType;
  bedrooms: number | null;
  bathrooms: string | null;
  confirmedPrice: string;
  scheduledRange: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  extraNames: string[];
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function display(value: string | null | undefined, fallback = "Not provided"): string {
  return escapeHtml(value?.trim() || fallback);
}

export function renderRequestConfirmedCustomerEmail(data: RequestConfirmedCustomerEmailData): string {
  const property = `${data.propertyType.charAt(0)}${data.propertyType.slice(1).toLowerCase()}`;
  const propertyDetails = [
    property,
    data.bedrooms === null ? null : `${data.bedrooms} bedroom${data.bedrooms === 1 ? "" : "s"}`,
    data.bathrooms === null ? null : `${data.bathrooms} bathroom${data.bathrooms === "1" ? "" : "s"}`,
  ].filter(Boolean).join(" · ");
  const address = [data.addressLine1, data.addressLine2, `${data.city}, ${data.state} ${data.postalCode}`]
    .filter((value): value is string => Boolean(value)).map((value) => display(value)).join("<br>");
  const extras = data.extraNames.length > 0 ? `<h2 style="font-size:17px">Extras</h2><ul style="margin:0;padding-left:20px">${data.extraNames.map((name) => `<li>${display(name)}</li>`).join("")}</ul>` : "";

  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#101828;font-family:Arial,sans-serif;line-height:1.5"><main style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px"><p style="margin:0 0 6px;color:#667085;font-size:13px;text-transform:uppercase;letter-spacing:.08em">${BUSINESS.name}</p><h1 style="margin:0 0 22px;font-size:24px">Your cleaning is confirmed</h1><p>Hi ${display(data.customerName, "there")},</p><p>Your cleaning is confirmed.</p><table style="border-collapse:collapse;width:100%;margin:22px 0"><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Request</strong></td><td style="padding:6px 0">${display(data.requestNumber)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Service</strong></td><td style="padding:6px 0">${display(data.serviceName)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Property</strong></td><td style="padding:6px 0">${display(propertyDetails)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Confirmed price</strong></td><td style="padding:6px 0">$${escapeHtml(data.confirmedPrice)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Confirmed appointment</strong></td><td style="padding:6px 0">${display(data.scheduledRange)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Address</strong></td><td style="padding:6px 0">${address}</td></tr></table>${extras}<p style="margin-top:28px;padding-top:18px;border-top:1px solid #e4e7ec">We’ll see you then.<br><br>Thank you,<br>${BUSINESS.name}</p></div></main></body></html>`;
}

export function requestConfirmedCustomerSubject(requestNumber: string): string {
  return `Your cleaning is confirmed — ${requestNumber}`;
}
