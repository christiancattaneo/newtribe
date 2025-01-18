import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyAMgehfV7Gxh5BL1NyTYoDTho2IdiSELuw",
  authDomain: "newtribe-9d9c7.firebaseapp.com",
  projectId: "newtribe-9d9c7",
  storageBucket: "newtribe-9d9c7.appspot.com",
  messagingSenderId: "1098133116514",
  appId: "1:1098133116514:web:d3831d90588442e08fb4db",
  databaseURL: "https://newtribe-9d9c7-default-rtdb.firebaseio.com",
  measurementId: "G-MEASUREMENT-ID"
};

console.log('[Firebase Init] Initializing with config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

// Configure auth settings
setPersistence(auth, inMemoryPersistence);

const db = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

export { app, auth, db, rtdb, storage, functions }; 