import { Resend } from "resend";
import { formatResendSender, getResendConfig } from "./resend-config";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
};

export type EmailDeliveryErrorCode =
  | "CONFIGURATION_ERROR"
  | "PROVIDER_REJECTED"
  | "PROVIDER_UNAVAILABLE"
  | "UNKNOWN_DELIVERY_ERROR";

export type SendEmailResult =
  | { success: true; providerMessageId: string }
  | { success: false; errorCode: EmailDeliveryErrorCode };

function isProviderUnavailable(error: unknown): boolean {
  return error instanceof Error && /timeout|network|fetch|connect|unavailable/i.test(error.message);
}

export type EmailProvider = {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
};

export function createResendEmailProvider(
  env: Record<string, string | undefined> = process.env,
): EmailProvider {
  return {
    async sendEmail(input) {
      const configured = getResendConfig(env);
      if (!configured.success) return { success: false, errorCode: "CONFIGURATION_ERROR" };

      try {
        const resend = new Resend(configured.config.apiKey);
        const result = await resend.emails.send(
          {
            from: formatResendSender(configured.config),
            to: input.to,
            subject: input.subject,
            html: input.html,
          },
          { idempotencyKey: input.idempotencyKey },
        );

        if (result.error || !result.data?.id) {
          return { success: false, errorCode: "PROVIDER_REJECTED" };
        }

        return { success: true, providerMessageId: result.data.id };
      } catch (error) {
        return {
          success: false,
          errorCode: isProviderUnavailable(error) ? "PROVIDER_UNAVAILABLE" : "UNKNOWN_DELIVERY_ERROR",
        };
      }
    },
  };
}
