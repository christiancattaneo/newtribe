import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateData() {
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
  console.log('Starting data migration...');

  try {
    // 1. Preserve and update channels
    const channelsRef = db.collection('channels');
    const allChannels = await channelsRef.get();
    
    console.log(`Found ${allChannels.size} channels to migrate`);
    
    for (const channelDoc of allChannels.docs) {
      const channelData = channelDoc.data();
      // Remove workspace-related fields and keep essential data
      const updatedChannelData = {
        name: channelData.name,
        description: channelData.description || '',
        createdAt: channelData.createdAt,
        createdBy: channelData.createdBy
      };
      
      await channelDoc.ref.set(updatedChannelData, { merge: true });
    }
    
    // 2. Ensure General channel exists
    const generalChannelRef = db.collection('channels').doc('general');
    const generalChannel = await generalChannelRef.get();
    
    if (!generalChannel.exists) {
      console.log('Creating General channel...');
      await generalChannelRef.set({
        name: 'general',
        description: 'Welcome to the General channel!',
        createdAt: new Date(),
        createdBy: 'system'
      });
    }

    // 3. Update messages
    const messagesRef = db.collection('messages');
    const allMessages = await messagesRef.get();
    
    console.log(`Found ${allMessages.size} messages to migrate`);
    
    for (const messageDoc of allMessages.docs) {
      const messageData = messageDoc.data();
      // Update message structure if needed
      const updatedMessageData = {
        content: messageData.content,
        userId: messageData.userId,
        channelId: messageData.channelId,
        timestamp: messageData.timestamp || messageData.createdAt,
        attachments: messageData.attachments || [],
        reactions: messageData.reactions || {},
        threadId: messageData.threadId,
        parentMessageId: messageData.parentMessageId
      };
      
      await messageDoc.ref.set(updatedMessageData, { merge: true });
    }

    // 4. Update user permissions
    const usersRef = db.collection('users');
    const allUsers = await usersRef.get();
    
    console.log(`Found ${allUsers.size} users to migrate`);
    
    for (const userDoc of allUsers.docs) {
      const userData = userDoc.data();
      // Set default role if not exists
      if (!userData.role) {
        await userDoc.ref.update({
          role: 'user'
        });
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

migrateData().catch(console.error); 