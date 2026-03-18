import { FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing Firebase env vars: ${missingEnvVars.join(', ')}. Check your .env file and restart Expo.`
  );
}

const firebaseConfig: FirebaseOptions = {
  apiKey: envVars.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: envVars.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: envVars.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: envVars.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: envVars.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: envVars.EXPO_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
