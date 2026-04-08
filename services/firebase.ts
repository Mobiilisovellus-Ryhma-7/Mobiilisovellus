import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  query,
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
};

const FACILITY_SECTIONS_COLLECTION =
  process.env.EXPO_PUBLIC_FIRESTORE_FACILITY_SECTIONS_COLLECTION || 'facility_sections';

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

function mapSection(id: string, data: Record<string, unknown>): FacilitySection {
  return {
    id,
    facilityId: asNullableString(data.facilityId ?? data.facility_id ?? data.facility_Id),
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
  };
}

async function fetchAllFacilitySections() {
  const firestore = getFirestoreClient();
  const snapshot = await getDocs(collection(firestore, FACILITY_SECTIONS_COLLECTION));

  return snapshot.docs.map((doc) => mapSection(doc.id, doc.data()));
}

function normalize(value: string) {
  return value.trim().toLowerCase();
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
