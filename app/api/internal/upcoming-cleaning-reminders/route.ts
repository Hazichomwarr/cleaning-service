import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processUpcomingCleaningReminders } from "../../../../src/services/upcoming-cleaning-reminder.service";

function authorized(request: Request): boolean {
  // Vercel supplies CRON_SECRET as a Bearer token for native cron requests;
  // keep SCHEDULER_SECRET as a portable fallback for other schedulers.
  const configured = process.env.CRON_SECRET ?? process.env.SCHEDULER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request)) return NextResponse.json({ processed: false, error: "Unauthorized" }, { status: 401 });
  const summary = await processUpcomingCleaningReminders();
  return NextResponse.json(summary);
}
