"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setCleaningRequestConfirmedScheduleAction } from "@/app/actions/set-cleaning-request-confirmed-schedule";
import { formatBusinessDateTimeRange } from "@/src/lib/business-time";
import type { CleaningRequestStatus } from "@/src/generated/prisma/client";

type ScheduleValue = { start: string | null; end: string | null } | null;
type ScheduleHistoryItem = { id: string; previousScheduledStart: string | null; previousScheduledEnd: string | null; newScheduledStart: string; newScheduledEnd: string; reason: string | null; changedAt: string; changedBy: { id: string; name: string; email: string } };

function inputParts(value: string | null): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` };
}

export default function RequestScheduleActions({ requestId, status, preferredLabel, confirmedSchedule, scheduleHistory }: { requestId: string; status: CleaningRequestStatus; preferredLabel: string; confirmedSchedule: ScheduleValue; scheduleHistory: ScheduleHistoryItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initialStart = inputParts(confirmedSchedule?.start ?? null);
  const [date, setDate] = useState(initialStart.date);
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endTime, setEndTime] = useState(inputParts(confirmedSchedule?.end ?? null).time);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = status === "REVIEWING";
  const hasCompleteCurrentSchedule = Boolean(confirmedSchedule?.start && confirmedSchedule?.end);

  const openEditor = () => {
    if (!editable || pending) return;
    const currentStart = inputParts(confirmedSchedule?.start ?? null);
    setDate(currentStart.date);
    setStartTime(currentStart.time);
    setEndTime(inputParts(confirmedSchedule?.end ?? null).time);
    setReason("");
    setError(null);
    setOpen(true);
  };

  const closeEditor = () => {
    if (!pending) {
      setOpen(false);
      setError(null);
    }
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await setCleaningRequestConfirmedScheduleAction({ cleaningRequestId: requestId, date, startTime, endTime, reason });
      if (result.success) {
        setOpen(false);
        router.refresh();
        return;
      }
      if (result.reason === "SCHEDULE_CONFLICT") {
        setError("This appointment changed while you were editing it. Refreshing to show the latest schedule.");
        router.refresh();
      } else if (result.reason === "INVALID_REQUEST_STATUS") {
        setError("This request can no longer be scheduled while in its current status.");
        router.refresh();
      } else if (result.reason === "INVALID_CURRENT_SCHEDULE") {
        setError("This request has incomplete scheduling data and can't be rescheduled safely.");
      } else if (result.reason === "INVALID_SCHEDULE_RANGE") {
        setError("End time must be later than start time.");
      } else if (result.reason === "SCHEDULE_IN_PAST") {
        setError("Choose a future appointment time.");
      } else if (result.reason === "NO_SCHEDULE_CHANGE") {
        setError("Choose a different appointment time.");
      } else if (result.reason === "SCHEDULE_CHANGE_REASON_REQUIRED") {
        setError("Please explain why the confirmed appointment is changing.");
      } else if (result.reason === "REQUEST_NOT_FOUND") {
        router.push("/admin/requests");
      } else if (result.reason === "INVALID_LOCAL_TIME") {
        setError("Choose a valid New York business date and time.");
      } else {
        setError("We couldn't update the confirmed schedule right now. Please try again.");
      }
    });
  };

  return <>
    <div className="mt-5"><p className="text-sm text-slate-500">Customer preferred: <span className="font-medium text-slate-700">{preferredLabel}</span></p><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm text-slate-500">Confirmed schedule</p><p className="mt-1 text-sm font-semibold text-slate-900">{confirmedSchedule === null ? "Not scheduled yet" : hasCompleteCurrentSchedule ? formatBusinessDateTimeRange(confirmedSchedule.start, confirmedSchedule.end) : "Schedule incomplete"}</p></div>{editable ? <button type="button" onClick={openEditor} disabled={pending} className="min-h-11 rounded-xl bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">{hasCompleteCurrentSchedule ? "Change confirmed schedule" : "Set confirmed schedule"}</button> : null}</div></div>
    {open ? <div role="dialog" aria-modal="true" aria-labelledby="confirmed-schedule-heading" className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><h3 id="confirmed-schedule-heading" className="font-semibold text-slate-950">{hasCompleteCurrentSchedule ? "Change confirmed schedule" : "Set confirmed schedule"}</h3><p className="mt-1 text-sm text-slate-600">Times use the Just Cleaning business timezone: America/New_York.</p></div><button type="button" onClick={closeEditor} disabled={pending} aria-label="Close confirmed schedule dialog" className="text-2xl leading-none text-slate-400 hover:text-slate-700 disabled:opacity-50">×</button></div><form onSubmit={submit} className="mt-4 space-y-4"><div className="grid gap-4 sm:grid-cols-3"><label className="block text-sm font-semibold text-slate-700">Date<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-800" /></label><label className="block text-sm font-semibold text-slate-700">Start time<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-800" /></label><label className="block text-sm font-semibold text-slate-700">End time<input type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-800" /></label></div><label htmlFor="schedule-change-reason" className="block text-sm font-semibold text-slate-700">Reason{hasCompleteCurrentSchedule ? <span className="font-normal text-slate-500"> (required for a change)</span> : <span className="font-normal text-slate-500"> (optional)</span>}<textarea id="schedule-change-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} placeholder={hasCompleteCurrentSchedule ? "Explain why the appointment is changing..." : "Optional context for setting this appointment..."} className="mt-2 block min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal text-slate-800" /></label>{error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeEditor} disabled={pending} className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 disabled:opacity-50">Cancel</button><button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-blue-700 px-5 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400">{pending ? "Saving schedule…" : "Save confirmed schedule"}</button></div></form></div> : null}
    <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-sm font-semibold text-slate-800">Schedule history</h3>{scheduleHistory.length === 0 ? <p className="mt-3 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-600">No confirmed schedule changes yet.</p> : <ol className="mt-4 space-y-4">{scheduleHistory.map((item) => <li key={item.id} className="rounded-xl bg-slate-50 px-4 py-4"><p className="font-semibold text-slate-900">{item.previousScheduledStart === null ? "Confirmed schedule set" : "Confirmed schedule changed"}</p><p className="mt-2 text-sm text-slate-700">{formatBusinessDateTimeRange(item.previousScheduledStart, item.previousScheduledEnd)} → {formatBusinessDateTimeRange(item.newScheduledStart, item.newScheduledEnd)}</p><p className="mt-2 text-xs text-slate-500"><time dateTime={item.changedAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(item.changedAt))}</time> · {item.changedBy.name}<span className="block text-slate-400">{item.changedBy.email}</span></p>{item.reason ? <div className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-700"><p className="font-semibold text-slate-600">Reason</p><p className="mt-1 whitespace-pre-wrap break-words">{item.reason}</p></div> : null}</li>)}</ol>}</div>
  </>;
}
