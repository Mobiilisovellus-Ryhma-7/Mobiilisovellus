import { useEffect, useState } from 'react';
import type { FieldSchedule, TimeSlot } from '../api/timmi.types';

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
  // "YYYY-MM-DD" → midnight local time in ms
  return new Date(`${dateStr}T00:00:00`).getTime();
}

function getTeamName(booking: any): string {
  // eventTextField can be array or string
  const etf = booking?.eventTextField;
  if (Array.isArray(etf) && etf.length > 0) {
    const first = etf[0];
    if (typeof first === 'string') return first;
    return first?.name ?? first?.nameShort ?? 'Varattu';
  }
  if (typeof etf === 'string' && etf.trim()) return etf;

  // fallbacks from different Timmi response shapes
  return (
    booking?.groupName ??
    booking?.customerName ??
    booking?.description ??
    'Varattu'
  );
}

// ------------------------------------------------------------------
// Parse the raw calendarAjax response into FieldSchedule
// ------------------------------------------------------------------

function parseCalendarResponse(
  data: any,
  resourceId: number,
  dateStr: string
): FieldSchedule {
  const resourceName =
    data?.resourceNames?.[0] ??
    data?.resourceNamesMobile?.[0] ??
    `Kenttä ${resourceId}`;

  const viewStartMs: number = data?.viewStartTime?.time ?? 0;
  const viewEndMs: number = data?.viewEndTime?.time ?? 0;
  const slotMinutes: number = data?.timePeriod ?? 60;
  const slotMs = slotMinutes * 60 * 1000;

  // Bookings can live at data.bookings or data.events
  const rawBookings: any[] = data?.bookings ?? data?.events ?? [];

  const slots: TimeSlot[] = [];

  let cursor = viewStartMs;
  while (cursor < viewEndMs) {
    const slotEnd = cursor + slotMs;

    const raw = rawBookings.find(
      (b: any) =>
        b?.startTime?.time !== undefined &&
        b?.endTime?.time !== undefined &&
        b.startTime.time <= cursor &&
        b.endTime.time >= slotEnd
    );

    slots.push({
      startMs: cursor,
      endMs: slotEnd,
      startLabel: msToTimeLabel(cursor),
      endLabel: msToTimeLabel(slotEnd),
      isBooked: !!raw,
      booking: raw
        ? {
            id: raw.bookingId ?? raw.eventBookingId,
            team: getTeamName(raw),
            startLabel: msToTimeLabel(raw.startTime.time),
            endLabel: msToTimeLabel(raw.endTime.time),
          }
        : undefined,
    });

    cursor = slotEnd;
  }

  // Deduplicated booking list
  const seen = new Set<number>();
  const bookings = rawBookings
    .filter((b: any) => {
      const id = b?.bookingId ?? b?.eventBookingId ?? Math.random();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((b: any) => ({
      id: b.bookingId ?? b.eventBookingId,
      team: getTeamName(b),
      startLabel: msToTimeLabel(b?.startTime?.time ?? 0),
      endLabel: msToTimeLabel(b?.endTime?.time ?? 0),
    }));

  return {
    resourceId,
    resourceName,
    date: dateStr,
    openFrom: msToTimeLabel(viewStartMs),
    openUntil: msToTimeLabel(viewEndMs),
    slotMinutes,
    slots,
    bookings,
  };
}

// ------------------------------------------------------------------
// Core fetch — correct URL with all required parameters
// ------------------------------------------------------------------

async function fetchTimmiSchedule(
  resourceId: number,
  dateStr: string
): Promise<FieldSchedule> {
  const referenceDateMills = dateStringToMills(dateStr);
  const cacheBust = Date.now();

  // ✅ All three params are required: actionCode + resourceId + referenceDateMills
  const url =
    `${BASE_URL}/calendarAjax.do` +
    `?actionCode=getCalendarData` +
    `&resourceId=${resourceId}` +
    `&referenceDateMills=${referenceDateMills}` +
    `&_=${cacheBust}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
    },
  });

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  // HTML response means wrong URL or missing params
  if (contentType.includes('text/html') || text.trim().startsWith('<')) {
    console.error('[Timmi] Got HTML instead of JSON. URL was:', url);
    throw new Error(
      'Timmi palautti HTML-sivun. ' +
        'Tarkista resourceId ja päivämäärä.'
    );
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e: any) {
    throw new Error(
      `JSON parse error: ${e.message}. Preview: ${text.slice(0, 200)}`
    );
  }

  return parseCalendarResponse(data, resourceId, dateStr);
}

// ------------------------------------------------------------------
// Hook: single field
// ------------------------------------------------------------------

export function useFieldSchedule(resourceId: number, date: string) {
  const [schedule, setSchedule] = useState<FieldSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchTimmiSchedule(resourceId, date)
      .then((data) => {
        if (mounted) {
          setSchedule(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [resourceId, date, version]);

  return {
    schedule,
    slots: schedule?.slots ?? [],
    bookings: schedule?.bookings ?? [],
    loading,
    error,
    refresh: () => setVersion((v) => v + 1),
  };
}

// ------------------------------------------------------------------
// Hook: multiple fields in parallel
// ------------------------------------------------------------------

export function useMultipleFields(resourceIds: number[], date: string) {
  const [schedules, setSchedules] = useState<FieldSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled(
      resourceIds.map((id) => fetchTimmiSchedule(id, date))
    ).then((results) => {
      if (!mounted) return;
      const fulfilled = results
        .filter(
          (r): r is PromiseFulfilledResult<FieldSchedule> =>
            r.status === 'fulfilled'
        )
        .map((r) => r.value);
      setSchedules(fulfilled);
      setLoading(false);

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn(`[Timmi] ${failed.length} kenttää ei ladattu`);
      }
    });

    return () => {
      mounted = false;
    };
  }, [resourceIds.join(','), date, version]);

  return {
    schedules,
    loading,
    error,
    refresh: () => setVersion((v) => v + 1),
  };
}
