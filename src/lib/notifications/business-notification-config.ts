export type BusinessNotificationConfig = {
  email: string;
  name: string | null;
};

export type BusinessNotificationConfigError = "MISSING_CONFIGURATION" | "INVALID_CONFIGURATION";

export function getBusinessNotificationConfig(
  env: Record<string, string | undefined> = process.env,
):
  | { success: true; config: BusinessNotificationConfig }
  | { success: false; errorCode: BusinessNotificationConfigError } {
  const email = env.BUSINESS_NOTIFICATION_EMAIL?.trim().toLowerCase();
  const name = env.BUSINESS_NOTIFICATION_NAME?.trim() || null;

  if (!email) return { success: false, errorCode: "MISSING_CONFIGURATION" };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { success: false, errorCode: "INVALID_CONFIGURATION" };

  return { success: true, config: { email, name } };
}
