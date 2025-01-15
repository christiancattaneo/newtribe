import { db } from '../config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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