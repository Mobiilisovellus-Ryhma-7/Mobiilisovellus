export type TimeSlot = {
  key: string;
  start: string;
  end: string;
  label: string;
  isPast: boolean;
};

type BuildTimeSlotsOptions = {
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
};

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 22;
const DEFAULT_SLOT_MINUTES = 60;

function pad(value: number) {
  return `${value}`.padStart(2, '0');
}

function formatTime(hour: number, minute: number) {
  return `${pad(hour)}:${pad(minute)}`;
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isPastSlot(slotStart: Date, selectedDay: Date, now: Date) {
  if (!sameDay(selectedDay, now)) {
    return false;
  }

  return slotStart.getTime() <= now.getTime();
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildDailyTimeSlots(
  date: Date,
  options: BuildTimeSlotsOptions = {}
): TimeSlot[] {
  const startHour = options.startHour ?? DEFAULT_START_HOUR;
  const endHour = options.endHour ?? DEFAULT_END_HOUR;
  const slotMinutes = options.slotMinutes ?? DEFAULT_SLOT_MINUTES;
  const now = new Date();
  const slots: TimeSlot[] = [];

  for (let hour = startHour; hour < endHour; hour += 1) {
    for (let minute = 0; minute < 60; minute += slotMinutes) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);

      const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60_000);
      if (slotEnd.getHours() > endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() > 0)) {
        continue;
      }

      const start = formatTime(slotStart.getHours(), slotStart.getMinutes());
      const end = formatTime(slotEnd.getHours(), slotEnd.getMinutes());

      slots.push({
        key: `${start}-${end}`,
        start,
        end,
        label: `${start} - ${end}`,
        isPast: isPastSlot(slotStart, date, now),
      });
    }
  }

  return slots;
}
