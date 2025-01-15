import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Channel } from '../types/channel';

export async function migrateDatabase() {
  console.log('Starting database migration...');
  
  try {
    // 1. Get all channels
    const channelsSnapshot = await getDocs(collection(db, 'channels'));
    const channels = channelsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (Channel & { id: string })[];
    
    // 2. Check for General channel
    const generalChannel = channels.find(channel => channel.name === 'General');
    if (!generalChannel) {
      // Create General channel if it doesn't exist
      const generalChannelData: Omit<Channel, 'id'> = {
        name: 'General',
        description: 'The default channel for all users',
        createdAt: new Date(),
        createdBy: 'system'
      };
      await setDoc(doc(db, 'channels', 'general'), generalChannelData);
      console.log('Created General channel');
    }
    
    // 3. Update all channels
    for (const channel of channels) {
      const channelRef = doc(db, 'channels', channel.id);
      const channelData = {
        name: channel.name,
        description: channel.description || '',
        createdAt: channel.createdAt,
        createdBy: channel.createdBy
      };
      await updateDoc(channelRef, channelData);
      console.log(`Updated channel ${channel.id}`);
    }
    
    // 4. Delete workspaces collection
    const workspacesSnapshot = await getDocs(collection(db, 'workspaces'));
    for (const workspace of workspacesSnapshot.docs) {
      await deleteDoc(doc(db, 'workspaces', workspace.id));
      console.log(`Deleted workspace ${workspace.id}`);
    }
    
    // 5. Delete workspace_invitations if they exist
    try {
      const invitationsSnapshot = await getDocs(collection(db, 'workspace_invitations'));
      for (const invitation of invitationsSnapshot.docs) {
        await deleteDoc(doc(db, 'workspace_invitations', invitation.id));
        console.log(`Deleted workspace invitation ${invitation.id}`);
      }
    } catch {
      console.log('No workspace_invitations collection found');
    }
    
    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  }
} 