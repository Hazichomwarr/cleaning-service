import { customerDisplay, renderCustomerAddress } from "./customer-email.helpers";
import { BUSINESS } from "../config/business";

export type CleaningStartedCustomerEmailData = {
  requestNumber: string; customerName: string | null; serviceName: string; confirmedPrice: string;
  addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string;
};

export function renderCleaningStartedCustomerEmail(data: CleaningStartedCustomerEmailData): string {
  const address = renderCustomerAddress(data);
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#101828;font-family:Arial,sans-serif;line-height:1.5"><main style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px"><p style="margin:0 0 6px;color:#667085;font-size:13px;text-transform:uppercase;letter-spacing:.08em">${BUSINESS.name}</p><h1 style="margin:0 0 22px;font-size:24px">Your cleaning has started</h1><p>Hi ${customerDisplay(data.customerName, "there")},</p><p>Your cleaning is now underway.</p><table style="border-collapse:collapse;width:100%;margin:22px 0"><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Request</strong></td><td style="padding:6px 0">${customerDisplay(data.requestNumber)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Service</strong></td><td style="padding:6px 0">${customerDisplay(data.serviceName)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Address</strong></td><td style="padding:6px 0">${address}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Confirmed price</strong></td><td style="padding:6px 0">$${customerDisplay(data.confirmedPrice)}</td></tr></table><p>Our team has started the cleaning.</p><p style="margin-top:28px;padding-top:18px;border-top:1px solid #e4e7ec">Thank you,<br>${BUSINESS.name}</p></div></main></body></html>`;
}

export function cleaningStartedCustomerSubject(requestNumber: string): string {
  return `Your cleaning has started — ${requestNumber}`;
}
