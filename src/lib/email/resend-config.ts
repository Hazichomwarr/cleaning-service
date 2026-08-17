export type ResendConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
};

export type ResendConfigError = "MISSING_CONFIGURATION" | "INVALID_CONFIGURATION";

export function getResendConfig(env: Record<string, string | undefined> = process.env):
  | { success: true; config: ResendConfig }
  | { success: false; errorCode: ResendConfigError } {
  const apiKey = env.RESEND_API_KEY?.trim();
  const fromEmail = env.RESEND_FROM_EMAIL?.trim().toLowerCase();
  const fromName = env.RESEND_FROM_NAME?.trim();

  if (!apiKey || !fromEmail || !fromName) {
    return { success: false, errorCode: "MISSING_CONFIGURATION" };
  }

  if (!/^\S+@\S+\.\S+$/.test(fromEmail)) {
    return { success: false, errorCode: "INVALID_CONFIGURATION" };
  }

  return { success: true, config: { apiKey, fromEmail, fromName } };
}

export function formatResendSender(config: ResendConfig): string {
  return `${config.fromName} <${config.fromEmail}>`;
}

/** Returns a safe, normalized optional CC. Invalid configuration is omitted. */
export function getOptionalResendCcEmail(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const email = env.RESEND_CC_EMAIL?.trim().toLowerCase();
  return email && /^\S+@\S+\.\S+$/.test(email) ? email : undefined;
}
