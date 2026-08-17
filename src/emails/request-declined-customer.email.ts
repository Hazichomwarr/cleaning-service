import { BUSINESS } from "../config/business";

export type RequestDeclinedCustomerEmailData = {
  requestNumber: string;
  customerName: string | null;
  reason: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function display(value: string | null | undefined, fallback = "there"): string {
  return escapeHtml(value?.trim() || fallback);
}

export function renderRequestDeclinedCustomerEmail(data: RequestDeclinedCustomerEmailData): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#101828;font-family:Arial,sans-serif;line-height:1.5"><main style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px"><p style="margin:0 0 6px;color:#667085;font-size:13px;text-transform:uppercase;letter-spacing:.08em">${BUSINESS.name}</p><h1 style="margin:0 0 22px;font-size:24px">Update on your cleaning request</h1><p>Hi ${display(data.customerName)},</p><p>Thank you for contacting us. Unfortunately, we’re unable to proceed with your cleaning request at this time.</p><table style="border-collapse:collapse;width:100%;margin:22px 0"><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Request</strong></td><td style="padding:6px 0">${escapeHtml(data.requestNumber)}</td></tr><tr><td style="padding:6px 16px 6px 0;color:#667085"><strong>Reason</strong></td><td style="padding:6px 0">${escapeHtml(data.reason)}</td></tr></table><p>If your needs change, you’re welcome to submit a new request or contact us.</p><p style="margin-top:28px;padding-top:18px;border-top:1px solid #e4e7ec">Thank you,<br>${BUSINESS.name}</p></div></main></body></html>`;
}

export function requestDeclinedCustomerSubject(requestNumber: string): string {
  return `Update on your cleaning request — ${requestNumber}`;
}
