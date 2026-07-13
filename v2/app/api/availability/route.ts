import { NextResponse } from "next/server";
import { getRawBusyRanges } from "@/lib/ical";
import { getDisabledDates, getOrphanGapNights, mergeBusyRanges } from "@/lib/availability";

// Matches the fetch-level cache lifetime in lib/ical.ts — re-fetch the
// upstream iCal feeds at most every 30 minutes.
export const revalidate = 1800;

export async function GET() {
  try {
    const raw = await getRawBusyRanges();
    const merged = mergeBusyRanges(raw);

    return NextResponse.json({
      merged,
      disabledDates: getDisabledDates(merged),
      orphanGapNights: getOrphanGapNights(merged),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/availability] failed:", err);
    return NextResponse.json(
      { error: "Could not load availability right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
