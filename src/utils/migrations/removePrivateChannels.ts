import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function removePrivateChannels() {
  // Initialize Firebase Admin if not already initialized
  if (getApps().length === 0) {
    const adminCredentials = JSON.parse(
      readFileSync(join(process.cwd(), 'firebase-admin.json'), 'utf-8')
    );
    
    initializeApp({
      credential: cert(adminCredentials)
    });
  }

  const db = getFirestore();
  
  // First delete all messages
  const messagesRef = db.collection('messages');
  const allMessages = await messagesRef.get();
  
  const messageDeletes = allMessages.docs.map(async (doc) => {
    await doc.ref.delete();
  });
  
  await Promise.all(messageDeletes);
  console.log(`Deleted ${allMessages.size} messages`);

  // Then delete all channels
  const channelsRef = db.collection('channels');
  const allChannels = await channelsRef.get();
  
  const channelDeletes = allChannels.docs.map(async (doc) => {
    await doc.ref.delete();
  });
  
  await Promise.all(channelDeletes);
  console.log(`Deleted ${allChannels.size} channels`);
} 