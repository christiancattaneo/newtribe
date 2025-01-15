import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAMgehfV7Gxh5BL1NyTYoDTho2IdiSELuw",
  authDomain: "newtribe-9d9c7.firebaseapp.com",
  projectId: "newtribe-9d9c7",
  storageBucket: "newtribe-9d9c7.firebasestorage.app",
  messagingSenderId: "884974404568",
  appId: "1:884974404568:web:0d407967927828c950e8ad",
  measurementId: "G-14QXZ63TXX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const users = {
  "users": [
    {
      "localId": "Lp6AwzuXQMRHXL9nadqNgLEjsI63",
      "email": "christian.cattaneo@gauntletai.com",
      "displayName": "Christian Cattaneo",
      "createdAt": "1736706399351"
    },
    {
      "localId": "iJKN0bEq6La9dbTsleyxVkEL63P2",
      "email": "christiandcattaneo@gmail.com",
      "displayName": "Christian",
      "createdAt": "1736733947579"
    }
  ]
};

async function migrateUsers() {
  console.log('Starting user migration...');
  
  for (const user of users.users) {
    try {
      console.log(`Migrating user: ${user.email}`);
      const userRef = doc(db, 'users', user.localId);
      
      await setDoc(userRef, {
        displayName: user.displayName,
        email: user.email,
        photoURL: null,
        createdAt: serverTimestamp()
      });
      
      console.log(`Successfully migrated user: ${user.email}`);
    } catch (error) {
      console.error(`Error migrating user ${user.email}:`, error);
    }
  }
  
  console.log('Migration complete!');
}

migrateUsers(); 