import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

// Generic env var collector
const getEnvVars = (keys: string[]) =>
  Object.fromEntries(keys.map(key => [key, process.env[`EXPO_PUBLIC_${key}`]]));

const firebaseVars = getEnvVars([
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID',
]);

const validateVars = (vars: Record<string, any>) => {
  const missing = Object.entries(vars)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  return missing.length > 0 ? missing : null;
};

export const firebaseInitError = validateVars(firebaseVars)
  ? `Missing Firebase env vars. Check your .env file and restart Expo.`
  : null;

const firebaseConfig: FirebaseOptions = {
  apiKey: firebaseVars.FIREBASE_API_KEY,
  authDomain: firebaseVars.FIREBASE_AUTH_DOMAIN,
  projectId: firebaseVars.FIREBASE_PROJECT_ID,
  messagingSenderId: firebaseVars.FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseVars.FIREBASE_APP_ID,
};

const app: FirebaseApp | null = !firebaseInitError && getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps().length > 0
    ? getApp()
    : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export type FirestoreHealthCheckResult = {
  ok: true;
  projectId: string;
  collection: string;
  sampleCount: number;
};

export type FacilitySection = {
  id: string;
  facilityId: string | null;
  name: string | null;
  sport: string | null;
  description: string | null;
  isBooked: boolean | null;
  createdAt: string | null;
  openingStart: string | null;
  openingEnd: string | null;
};

type Facility = {
  id: string;
  openingStart: string | null;
  openingEnd: string | null;
};

export type Booking = {
  id: string;
  facilitySectionId: string;
  userId: string;
  bookingDate: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateBookingInput = {
  facilitySectionId: string;
  userId: string;
  bookingDate: string;
  slotStart: string;
  slotEnd: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
};

const FACILITY_SECTIONS_COLLECTION =
  process.env.EXPO_PUBLIC_FIRESTORE_FACILITY_SECTIONS_COLLECTION || 'facility_sections';
const FACILITIES_COLLECTION = process.env.EXPO_PUBLIC_FIRESTORE_FACILITIES_COLLECTION || 'facilities';
const BOOKINGS_COLLECTION = process.env.EXPO_PUBLIC_FIRESTORE_BOOKINGS_COLLECTION || 'bookings';
const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed'];
const MAX_ACTIVE_BOOKINGS_PER_USER = 2;

function getFirestoreClient() {
  if (firebaseInitError) {
    throw new Error(firebaseInitError);
  }

  if (!db) {
    throw new Error('Firebase app is not initialized.');
  }

  return db;
}

function asNullableString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function toIsoDate(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    return ((value as { toDate: () => Date }).toDate()).toISOString();
  }

  return asNullableString(value);
}

function parseOpeningHours(value: string | null): { openingStart: string | null; openingEnd: string | null } {
  if (!value) {
    return { openingStart: null, openingEnd: null };
  }

  const match = value.trim().match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/);
  if (!match) {
    return { openingStart: null, openingEnd: null };
  }

  return {
    openingStart: match[1],
    openingEnd: match[2],
  };
}

function mapFacility(id: string, data: Record<string, unknown>): Facility {
  const openingHours = asNullableString(data.openingHours ?? data.opening_hours);
  const parsed = parseOpeningHours(openingHours);

  return {
    id,
    openingStart: parsed.openingStart,
    openingEnd: parsed.openingEnd,
  };
}

function mapSection(
  id: string,
  data: Record<string, unknown>,
  facilitiesById: Map<string, Facility>
): FacilitySection {
  const facilityId = asNullableString(
    data.facilityId ?? data.facility_id ?? data.facility_Id
  );
  const facility = facilityId ? facilitiesById.get(facilityId) : undefined;

  return {
    id,
    facilityId,
    name: asNullableString(data.name),
    sport: asNullableString(data.sport),
    description: asNullableString(data.description),
    isBooked: typeof data.isBooked === 'boolean'
      ? data.isBooked
      : typeof data.is_Booked === 'boolean'
        ? data.is_Booked
      : typeof data.is_booked === 'boolean'
        ? data.is_booked
        : null,
    createdAt: toIsoDate(data.createdAt ?? data.created_at),
    openingStart: facility?.openingStart ?? null,
    openingEnd: facility?.openingEnd ?? null,
  };
}

function mapBooking(id: string, data: Record<string, unknown>): Booking {
  return {
    id,
    facilitySectionId: asNullableString(data.facilitySectionId ?? data.facility_section_id) ?? '',
    userId: asNullableString(data.userId ?? data.user_id) ?? '',
    bookingDate: asNullableString(data.bookingDate ?? data.booking_date) ?? '',
    slotStart: asNullableString(data.slotStart ?? data.slot_start) ?? '',
    slotEnd: asNullableString(data.slotEnd ?? data.slot_end) ?? '',
    status: asNullableString(data.status) ?? 'confirmed',
    createdAt: toIsoDate(data.createdAt ?? data.created_at),
    updatedAt: toIsoDate(data.updatedAt ?? data.updated_at),
  };
}

async function fetchAllFacilitySections() {
  const firestore = getFirestoreClient();
  const [sectionsSnapshot, facilitiesSnapshot] = await Promise.all([
    getDocs(collection(firestore, FACILITY_SECTIONS_COLLECTION)),
    getDocs(collection(firestore, FACILITIES_COLLECTION)),
  ]);

  const facilitiesById = new Map<string, Facility>();
  facilitiesSnapshot.docs.forEach((doc) => {
    facilitiesById.set(doc.id, mapFacility(doc.id, doc.data()));
  });

  return sectionsSnapshot.docs.map((doc) => mapSection(doc.id, doc.data(), facilitiesById));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getTodayDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNowTimeKey() {
  const now = new Date();
  const hours = `${now.getHours()}`.padStart(2, '0');
  const minutes = `${now.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isActiveBooking(booking: Booking, todayDate: string, nowTime: string) {
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
    return false;
  }

  if (!booking.bookingDate) {
    return false;
  }

  if (booking.bookingDate > todayDate) {
    return true;
  }

  if (booking.bookingDate < todayDate) {
    return false;
  }

  return booking.slotEnd > nowTime;
}

async function countActiveBookingsForUser(userId: string) {
  const firestore = getFirestoreClient();
  const snapshot = await getDocs(
    query(
      collection(firestore, BOOKINGS_COLLECTION),
      where('userId', '==', userId),
      where('status', 'in', ACTIVE_BOOKING_STATUSES)
    )
  );

  const todayDate = getTodayDateKey();
  const nowTime = getNowTimeKey();
  const activeBookings = snapshot.docs
    .map((doc) => mapBooking(doc.id, doc.data()))
    .filter((booking) => isActiveBooking(booking, todayDate, nowTime));

  return activeBookings.length;
}

export async function listFacilitySections() {
  return fetchAllFacilitySections();
}

export async function searchFacilitySectionsBySport(sport: string) {
  const normalizedSport = normalize(sport);
  const sections = await fetchAllFacilitySections();
  return sections.filter((section) => normalize(section.sport ?? '') === normalizedSport);
}

export async function searchFacilitySectionsByName(name: string) {
  const normalizedName = normalize(name);
  const sections = await fetchAllFacilitySections();
  return sections.filter((section) => normalize(section.name ?? '').includes(normalizedName));
}

export async function searchFacilitySectionsByBookingStatus(isBooked: boolean) {
  const sections = await fetchAllFacilitySections();
  return sections.filter((section) => section.isBooked === isBooked);
}

export async function getBookingsForSectionOnDate(
  facilitySectionId: string,
  bookingDate: string,
  statuses: string[] = ['confirmed']
) {
  const firestore = getFirestoreClient();
  const snapshot = statuses.length > 0
    ? await getDocs(
        query(
          collection(firestore, BOOKINGS_COLLECTION),
          where('facilitySectionId', '==', facilitySectionId),
          where('bookingDate', '==', bookingDate),
          where('status', 'in', statuses)
        )
      )
    : await getDocs(
        query(
          collection(firestore, BOOKINGS_COLLECTION),
          where('facilitySectionId', '==', facilitySectionId),
          where('bookingDate', '==', bookingDate)
        )
      );

  return snapshot.docs.map((doc) => mapBooking(doc.id, doc.data()));
}

export async function createBooking(input: CreateBookingInput) {
  const firestore = getFirestoreClient();
  const activeBookingsCount = await countActiveBookingsForUser(input.userId);
  if (activeBookingsCount >= MAX_ACTIVE_BOOKINGS_PER_USER) {
    throw new Error('Sinulla voi olla enintään 2 aktiivista varausta.');
  }

  const payload = {
    facilitySectionId: input.facilitySectionId,
    userId: input.userId,
    bookingDate: input.bookingDate,
    slotStart: input.slotStart,
    slotEnd: input.slotEnd,
    status: input.status ?? 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(firestore, BOOKINGS_COLLECTION), payload);
  return docRef.id;
}

export async function runFirestoreHealthCheck(): Promise<FirestoreHealthCheckResult> {
  if (firebaseInitError) {
    throw new Error(firebaseInitError);
  }

  const firestore = getFirestoreClient();
  const snapshot = await getDocs(
    query(collection(firestore, FACILITY_SECTIONS_COLLECTION), limit(1))
  );

  return {
    ok: true,
    projectId: firebaseVars.FIREBASE_PROJECT_ID!,
    collection: FACILITY_SECTIONS_COLLECTION,
    sampleCount: snapshot.size,
  };
}

export default app;
