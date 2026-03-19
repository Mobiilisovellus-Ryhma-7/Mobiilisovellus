export interface TimmiTime {
  date: number;
  hours: number;
  seconds: number;
  month: number;
  timezoneOffset: number;
  year: number;
  minutes: number;
  time: number; // Unix ms
  day: number;
}

export interface TimmiResourceRights {
  roomBookingCancellationTimeLimit: number;
  roomBookingMinTimeLimit: number;
  roomPartId: number;
  payBookingRight: number;
  bookingApplicationRight: number;
  roomBookingMaxTimeLimit: number;
  deleteBookingRight: number;
  meetingRight: number;
  bookingRight: number;
}

export interface TimmiBooking {
  bookingId: number;
  startTime: TimmiTime;
  endTime: TimmiTime;
  groupName?: string;
  customerName?: string;
  description?: string;
  bookingType?: string;
  color?: string;
}

export interface TimmiCalendarResponse {
  resourceIds: number[];
  referenceDateMills: number;
  datesInMills: number[];
  resourceColors: string[];
  resourceNames: string[];
  resourceNamesMobile: string[];
  weekDayNames: string[];
  viewType: number;
  selectedDays: number[];
  resourceRights: TimmiResourceRights[];
  viewStartTime: TimmiTime;
  viewEndTime: TimmiTime;
  timePeriod: number; // minutes per slot
  bookings?: TimmiBooking[];
}

export interface TimmiResourceListResponse {
  resources: TimmiResource[];
}

export interface TimmiResource {
  id: number;
  name: string;
  nameMobile: string;
  color: string;
  address?: string;
  type?: string;
}

// Processed / app-friendly types
export interface TimeSlot {
  startMs: number;
  endMs: number;
  startLabel: string; // "08:00"
  endLabel: string;   // "09:00"
  isBooked: boolean;
  booking?: BookingInfo;
}

export interface BookingInfo {
  id?: number;
  team: string;
  startLabel: string;
  endLabel: string;
  color?: string;
}

export interface FieldSchedule {
  resourceId: number;
  resourceName: string;
  date: string; // "YYYY-MM-DD"
  openFrom: string;
  openUntil: string;
  slotMinutes: number;
  slots: TimeSlot[];
  bookings: BookingInfo[];
}
