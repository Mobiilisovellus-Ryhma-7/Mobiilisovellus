import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  queryRef,
} from 'firebase/data-connect';

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
  : getApp() ?? null;

export const auth = app ? getAuth(app) : null;

const dataConnectVars = getEnvVars([
  'FIREBASE_DATA_CONNECT_LOCATION',
  'FIREBASE_DATA_CONNECT_SERVICE',
  'FIREBASE_DATA_CONNECT_CONNECTOR',
  'FIREBASE_DATA_CONNECT_HEALTH_QUERY',
  'FIREBASE_DATA_CONNECT_HEALTH_MUTATION',
]);

const DEFAULT_CONNECTION_QUERY = 'ListAllFacilities';

function getRequiredDataConnectConfig() {
  const requiredKeys = [
    'FIREBASE_DATA_CONNECT_LOCATION',
    'FIREBASE_DATA_CONNECT_SERVICE',
    'FIREBASE_DATA_CONNECT_CONNECTOR',
  ] as const;

  const missingKeys = requiredKeys.filter((key) => !dataConnectVars[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Data Connect env vars: ${missingKeys.join(', ')}. Add them to .env and restart Expo.`
    );
  }

  return {
    location: dataConnectVars.FIREBASE_DATA_CONNECT_LOCATION!,
    service: dataConnectVars.FIREBASE_DATA_CONNECT_SERVICE!,
    connector: dataConnectVars.FIREBASE_DATA_CONNECT_CONNECTOR!,
    healthQuery: dataConnectVars.FIREBASE_DATA_CONNECT_HEALTH_QUERY ?? DEFAULT_CONNECTION_QUERY,
    healthMutation: dataConnectVars.FIREBASE_DATA_CONNECT_HEALTH_MUTATION,
  };
}

export type DataConnectHealthCheckResult = {
  ok: true;
  projectId: string;
  connector: string;
  location: string;
  service: string;
  queryName: string;
  queryData: unknown;
  mutationName?: string;
  mutationData?: unknown;
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

type FacilitySectionsQueryData = {
  facilitySections?: FacilitySection[] | null;
};

function getDataConnectClient() {
  if (firebaseInitError) {
    throw new Error(firebaseInitError);
  }

  if (!app) {
    throw new Error('Firebase app is not initialized.');
  }

  const config = getRequiredDataConnectConfig();

  return getDataConnect(app, {
    location: config.location,
    service: config.service,
    connector: config.connector,
  });
}

function getFacilitySections(data: FacilitySectionsQueryData | undefined) {
  return data?.facilitySections ?? [];
}

export async function listFacilitySections() {
  const dc = getDataConnectClient();
  const result = await executeQuery(
    queryRef<FacilitySectionsQueryData>(dc, 'ListFacilitySections')
  );

  return getFacilitySections(result.data);
}

export async function searchFacilitySectionsBySport(sport: string) {
  const dc = getDataConnectClient();
  const result = await executeQuery(
    queryRef<FacilitySectionsQueryData, { sport: string }>(
      dc,
      'SearchFacilitySectionsBySport',
      { sport }
    )
  );

  return getFacilitySections(result.data);
}

export async function searchFacilitySectionsByName(name: string) {
  const dc = getDataConnectClient();
  const result = await executeQuery(
    queryRef<FacilitySectionsQueryData, { name: string }>(
      dc,
      'SearchFacilitySectionsByName',
      { name }
    )
  );

  return getFacilitySections(result.data);
}

export async function searchFacilitySectionsByBookingStatus(isBooked: boolean) {
  const dc = getDataConnectClient();
  const result = await executeQuery(
    queryRef<FacilitySectionsQueryData, { isBooked: boolean }>(
      dc,
      'SearchFacilitySectionsByBookingStatus',
      { isBooked }
    )
  );

  return getFacilitySections(result.data);
}

export async function runDataConnectHealthCheck(): Promise<DataConnectHealthCheckResult> {
  if (firebaseInitError) {
    throw new Error(firebaseInitError);
  }

  if (!app) {
    throw new Error('Firebase app is not initialized.');
  }

  const config = getRequiredDataConnectConfig();
  const dc = getDataConnect(app, {
    location: config.location,
    service: config.service,
    connector: config.connector,
  });

  const queryResult = await executeQuery(
    queryRef<Record<string, unknown>>(dc, config.healthQuery)
  );

  let mutationData: unknown;
  if (config.healthMutation) {
    const mutationResult = await executeMutation(
      mutationRef<Record<string, unknown>>(dc, config.healthMutation)
    );
    mutationData = mutationResult.data;
  }

  return {
    ok: true,
    projectId: firebaseVars.FIREBASE_PROJECT_ID!,
    connector: config.connector,
    location: config.location,
    service: config.service,
    queryName: config.healthQuery,
    queryData: queryResult.data,
    mutationName: config.healthMutation,
    mutationData,
  };
}

export default app;
