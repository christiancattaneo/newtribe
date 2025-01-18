const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { readFileSync } = require('fs');
const { join } = require('path');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../firebase-admin.json'), 'utf-8')
);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.VITE_FIREBASE_PROJECT_ID
});

const db = admin.firestore();

async function migrateMessageTimestamps() {
  console.log('Starting message timestamp migration...');

  // Migrate root messages collection
  const messagesRef = db.collection('messages');
  const messagesSnapshot = await messagesRef.get();
  
  console.log(`Found ${messagesSnapshot.size} messages in root collection`);
  
  for (const messageDoc of messagesSnapshot.docs) {
    const data = messageDoc.data();
    if (!data.createdAt) {
      console.log(`Updating message ${messageDoc.id} with missing createdAt`);
      await messageDoc.ref.update({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  // Migrate messages in channel subcollections
  const channelsRef = db.collection('channels');
  const channelsSnapshot = await channelsRef.get();

  for (const channelDoc of channelsSnapshot.docs) {
    const channelMessagesRef = channelDoc.ref.collection('messages');
    const channelMessagesSnapshot = await channelMessagesRef.get();

    console.log(`Found ${channelMessagesSnapshot.size} messages in channel ${channelDoc.id}`);

    for (const messageDoc of channelMessagesSnapshot.docs) {
      const data = messageDoc.data();
      if (!data.createdAt) {
        console.log(`Updating message ${messageDoc.id} in channel ${channelDoc.id} with missing createdAt`);
        await messageDoc.ref.update({
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  }

  console.log('Migration completed successfully');
  process.exit(0);
}

// Run the migration
migrateMessageTimestamps().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 