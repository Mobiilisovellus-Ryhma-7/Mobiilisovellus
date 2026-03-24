import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  executeMutation,
  executeQuery,
  getDataConnect,
  mutationRef,
  queryRef,
} from 'firebase/data-connect';
import { getStorage } from 'firebase/storage';

const envVars = {
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingEnvVars = Object.entries(envVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseInitError =
  missingEnvVars.length > 0
    ? `Missing Firebase env vars: ${missingEnvVars.join(', ')}. Check your .env file and restart Expo.`
    : null;

const firebaseConfig: FirebaseOptions = {
  apiKey: envVars.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: envVars.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: envVars.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: envVars.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: envVars.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app: FirebaseApp | null =
  firebaseInitError === null
    ? getApps().length > 0
      ? getApp()
      : initializeApp(firebaseConfig)
    : null;

export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

const dataConnectEnv = {
  EXPO_PUBLIC_FIREBASE_DATA_CONNECT_LOCATION:
    process.env.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_LOCATION,
  EXPO_PUBLIC_FIREBASE_DATA_CONNECT_SERVICE:
    process.env.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_SERVICE,
  EXPO_PUBLIC_FIREBASE_DATA_CONNECT_CONNECTOR:
    process.env.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_CONNECTOR,
  EXPO_PUBLIC_FIREBASE_DATA_CONNECT_HEALTH_QUERY:
    process.env.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_HEALTH_QUERY,
  EXPO_PUBLIC_FIREBASE_DATA_CONNECT_HEALTH_MUTATION:
    process.env.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_HEALTH_MUTATION,
};

const DEFAULT_CONNECTION_QUERY = 'ListAllFacilities';

function getRequiredDataConnectConfig() {
  const requiredKeys = [
    'EXPO_PUBLIC_FIREBASE_DATA_CONNECT_LOCATION',
    'EXPO_PUBLIC_FIREBASE_DATA_CONNECT_SERVICE',
    'EXPO_PUBLIC_FIREBASE_DATA_CONNECT_CONNECTOR',
  ] as const;

  const missingKeys = requiredKeys.filter((key) => !dataConnectEnv[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Data Connect env vars: ${missingKeys.join(', ')}. Add them to .env and restart Expo.`
    );
  }

  return {
    location: dataConnectEnv.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_LOCATION!,
    service: dataConnectEnv.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_SERVICE!,
    connector: dataConnectEnv.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_CONNECTOR!,
    healthQuery:
      dataConnectEnv.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_HEALTH_QUERY ??
      DEFAULT_CONNECTION_QUERY,
    healthMutation: dataConnectEnv.EXPO_PUBLIC_FIREBASE_DATA_CONNECT_HEALTH_MUTATION,
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
    projectId: envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
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
