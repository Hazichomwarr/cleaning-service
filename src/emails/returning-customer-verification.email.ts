import { customerDisplay, escapeCustomerHtml } from "./customer-email.helpers";
import { BUSINESS } from "../config/business";

export function renderReturningCustomerVerificationEmail(customerName: string | null, code: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7fa;color:#101828;font-family:Arial,sans-serif;line-height:1.5"><main style="max-width:620px;margin:0 auto;padding:32px 20px"><div style="background:#fff;border:1px solid #e4e7ec;border-radius:12px;padding:28px"><p style="margin:0 0 6px;color:#667085;font-size:13px;text-transform:uppercase;letter-spacing:.08em">${BUSINESS.name}</p><h1 style="margin:0 0 22px;font-size:24px">Your verification code</h1><p>Hi ${customerDisplay(customerName, "there")},</p><p>Use this code to continue your cleaning request:</p><p style="margin:24px 0;text-align:center;font-size:32px;font-weight:700;letter-spacing:.3em">${escapeCustomerHtml(code)}</p><p>This code expires in 10 minutes.</p><p>If you didn't request this, you can ignore this email.</p><p style="margin-top:28px;padding-top:18px;border-top:1px solid #e4e7ec">Thank you,<br>${BUSINESS.name}</p></div></main></body></html>`;
}

export const returningCustomerVerificationSubject = `Your ${BUSINESS.name} verification code`;
