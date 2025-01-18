/// <reference types="vite/client" />

import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

console.log('[Firebase Config] Using API Key:', import.meta.env.VITE_FIREBASE_API_KEY);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Configure auth settings
setPersistence(auth, inMemoryPersistence);

const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

// Connect to emulators in development
if (import.meta.env.DEV) {
  console.log('[Firebase Config] Connecting to emulators');
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectDatabaseEmulator(rtdb, 'localhost', 9000);
  connectStorageEmulator(storage, 'localhost', 9199);
}

export { app, auth, db, rtdb, storage, functions }; 