import type {
  TimmiCalendarResponse,
  TimmiBooking,
  FieldSchedule,
  TimeSlot,
  BookingInfo,
} from './timmi.types';

const BASE_URL = 'https://timmi.ouka.fi/WebTimmi';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function msToTimeLabel(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  return `${pad(h)}:${pad(m)}`;
}

function dateStringToMills(dateStr: string): number {
  // dateStr = "YYYY-MM-DD"
  return new Date(`${dateStr}T00:00:00`).getTime();
}

function getBookingTeam(booking: TimmiBooking): string {
  return (
    booking.groupName ||
    booking.customerName ||
    booking.description ||
    'Varattu'
  );
}

function findBookingForSlot(
  bookings: TimmiBooking[],
  slotStartMs: number,
  slotEndMs: number
): TimmiBooking | undefined {
  return bookings.find(
    (b) =>
      b.startTime?.time !== undefined &&
      b.endTime?.time !== undefined &&
      b.startTime.time <= slotStartMs &&
      b.endTime.time >= slotEndMs
  );
}

// ------------------------------------------------------------------
// Core fetch
// ------------------------------------------------------------------

async function fetchCalendarData(
  resourceId: number,
  dateStr: string
): Promise<TimmiCalendarResponse> {
  const refDate = dateStringToMills(dateStr);
  const cacheBust = Date.now();

  const url =
    `${BASE_URL}/calendarAjax.do` +
    `?actionCode=getCalendarData` +
    `&resourceId=${resourceId}` +
    `&referenceDateMills=${refDate}` +
    `&_=${cacheBust}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
    },
  });

  if (!response.ok) {
    throw new Error(
      `Timmi API error: ${response.status} ${response.statusText}`
    );
  }

  const data: TimmiCalendarResponse = await response.json();
  return data;
}

// ------------------------------------------------------------------
// Parse raw response → clean FieldSchedule
// ------------------------------------------------------------------

function parseSchedule(
  data: TimmiCalendarResponse,
  resourceId: number,
  dateStr: string
): FieldSchedule {
  const resourceName =
    data.resourceNames?.[0] ?? data.resourceNamesMobile?.[0] ?? `Field ${resourceId}`;

  const viewStartMs = data.viewStartTime?.time ?? 0;
  const viewEndMs = data.viewEndTime?.time ?? 0;
  const slotMinutes = data.timePeriod ?? 60;
  const slotMs = slotMinutes * 60 * 1000;
  const rawBookings: TimmiBooking[] = data.bookings ?? [];

  const slots: TimeSlot[] = [];
  const bookingInfos: BookingInfo[] = [];

  let cursor = viewStartMs;
  while (cursor < viewEndMs) {
    const slotEnd = cursor + slotMs;
    const raw = findBookingForSlot(rawBookings, cursor, slotEnd);

    let bookingInfo: BookingInfo | undefined;
    if (raw) {
      bookingInfo = {
        id: raw.bookingId,
        team: getBookingTeam(raw),
        startLabel: msToTimeLabel(raw.startTime.time),
        endLabel: msToTimeLabel(raw.endTime.time),
        color: raw.color,
      };
    }

    slots.push({
      startMs: cursor,
      endMs: slotEnd,
      startLabel: msToTimeLabel(cursor),
      endLabel: msToTimeLabel(slotEnd),
      isBooked: !!raw,
      booking: bookingInfo,
    });

    cursor = slotEnd;
  }

  // Deduplicated bookings list
  rawBookings.forEach((b) => {
    const info: BookingInfo = {
      id: b.bookingId,
      team: getBookingTeam(b),
      startLabel: msToTimeLabel(b.startTime.time),
      endLabel: msToTimeLabel(b.endTime.time),
      color: b.color,
    };
    if (!bookingInfos.find((x) => x.id === info.id)) {
      bookingInfos.push(info);
    }
  });

  return {
    resourceId,
    resourceName,
    date: dateStr,
    openFrom: msToTimeLabel(viewStartMs),
    openUntil: msToTimeLabel(viewEndMs),
    slotMinutes,
    slots,
    bookings: bookingInfos,
  };
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Fetch schedule for a single field on a given date.
 *
 * @param resourceId  Timmi resource/field ID (e.g. 11102)
 * @param dateStr     Date as "YYYY-MM-DD"
 */
export async function getFieldSchedule(
  resourceId: number,
  dateStr: string
): Promise<FieldSchedule> {
  const data = await fetchCalendarData(resourceId, dateStr);
  return parseSchedule(data, resourceId, dateStr);
}

/**
 * Fetch schedules for multiple fields on a given date.
 *
 * @param resourceIds  Array of Timmi resource IDs
 * @param dateStr      Date as "YYYY-MM-DD"
 */
export async function getMultipleFieldSchedules(
  resourceIds: number[],
  dateStr: string
): Promise<FieldSchedule[]> {
  const results = await Promise.allSettled(
    resourceIds.map((id) => getFieldSchedule(id, dateStr))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<FieldSchedule> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Get only the booked slots for a field.
 */
export async function getBookedSlots(
  resourceId: number,
  dateStr: string
): Promise<TimeSlot[]> {
  const schedule = await getFieldSchedule(resourceId, dateStr);
  return schedule.slots.filter((s) => s.isBooked);
}

/**
 * Get only the available (open) slots for a field.
 */
export async function getOpenSlots(
  resourceId: number,
  dateStr: string
): Promise<TimeSlot[]> {
  const schedule = await getFieldSchedule(resourceId, dateStr);
  return schedule.slots.filter((s) => !s.isBooked);
}
