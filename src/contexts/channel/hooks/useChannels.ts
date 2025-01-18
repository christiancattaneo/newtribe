import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { Channel, DirectMessage, Message } from '../../../types/channel';
import { useCallback, useEffect, useState } from 'react';
import { 
  where, 
  orderBy, 
  deleteDoc
} from 'firebase/firestore';
import { User } from '../../../types';

export interface UseChannelsProps {
  currentUser: User | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel | null) => void;
  setCurrentDirectMessage: (dm: DirectMessage | null) => void;
  setCurrentCharacter: (character: string | null) => void;
  setMessages: (messages: Message[]) => void;
}

export interface UseChannelsReturn {
  channels: Channel[];
  isLoading: boolean;
  createChannel: (name: string, description?: string) => Promise<Channel>;
  selectChannel: (channelId: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
}

export function useChannels({
  currentUser,
  currentDirectMessage,
  currentCharacter,
  currentChannel,
  setCurrentChannel,
  setCurrentDirectMessage,
  setCurrentCharacter,
  setMessages
}: UseChannelsProps): UseChannelsReturn {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize channels including AI chat
  useEffect(() => {
    if (!currentUser) {
      console.log('[useChannels] No user, clearing state');
      setChannels([]);
      setCurrentChannel(null);
      setIsLoading(false);
      return;
    }

    console.log('[useChannels] Loading channels');
    setIsLoading(true);

    // Clean up any incorrectly generated AI chat channels
    const cleanupAIChannels = async () => {
      const q = query(
        collection(db, 'channels'),
        where('id', '>=', 'ai-chat-'),
        where('id', '<', 'ai-chat-\uf8ff')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        console.log('[useChannels] Found incorrect AI channels to clean up:', snapshot.size);
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('[useChannels] Cleaned up incorrect AI channels');
      }
    };

    // Initialize channels
    cleanupAIChannels().then(() => {
      const q = query(
        collection(db, 'channels'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const channelData: Channel[] = [];
        snapshot.forEach((doc) => {
          // Only include non-AI chat channels
          if (!doc.id.startsWith('ai-chat-')) {
            channelData.push({ id: doc.id, ...doc.data() } as Channel);
          }
        });
        console.log('[useChannels] Channels updated:', channelData);
        setChannels(channelData);
        setIsLoading(false);
      }, (error) => {
        console.error('[useChannels] Error in channels snapshot:', error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    });
  }, [currentUser, setCurrentChannel]);

  // Handle General channel selection
  useEffect(() => {
    if (!currentChannel && !currentDirectMessage && !currentCharacter && channels.length > 0) {
      const generalChannel = channels.find(c => c.name === 'General');
      if (generalChannel) {
        console.log('[useChannels] No active chat, selecting General channel:', generalChannel.id);
        setCurrentChannel(generalChannel);
      }
    }
  }, [channels, currentChannel, currentDirectMessage, currentCharacter, setCurrentChannel]);

  const createChannel = useCallback(async (name: string, description?: string) => {
    if (!currentUser) {
      throw new Error('Must be signed in to create a channel');
    }

    // Check for existing channel with same name
    const existingChannel = channels.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existingChannel) {
      console.log('[useChannels] Channel with name already exists:', name);
      setCurrentChannel(existingChannel);
      return existingChannel;
    }

    const newChannel: Channel = {
      id: uuidv4(),
      name,
      description: description || '',
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    };

    await setDoc(doc(db, 'channels', newChannel.id), newChannel);
    setCurrentChannel(newChannel);
    return newChannel;
  }, [currentUser, channels, setCurrentChannel]);

  // Effect to clean up duplicate channels
  useEffect(() => {
    if (!currentUser) return;

    const cleanupDuplicateChannels = async () => {
      const channelNames = new Map<string, Channel>();
      const duplicates: Channel[] = [];

      channels.forEach(channel => {
        const name = channel.name.toLowerCase();
        if (channelNames.has(name)) {
          // Keep the older channel, mark newer one as duplicate
          const existing = channelNames.get(name)!;
          if (channel.createdAt < existing.createdAt) {
            duplicates.push(existing);
            channelNames.set(name, channel);
          } else {
            duplicates.push(channel);
          }
        } else {
          channelNames.set(name, channel);
        }
      });

      if (duplicates.length > 0) {
        console.log('[useChannels] Found duplicate channels to clean up:', duplicates.length);
        const batch = writeBatch(db);
        
        for (const channel of duplicates) {
          // Delete the channel document
          batch.delete(doc(db, 'channels', channel.id));
          
          // Delete all messages in the channel
          const messagesSnapshot = await getDocs(collection(db, 'channels', channel.id, 'messages'));
          messagesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
        }

        await batch.commit();
        console.log('[useChannels] Cleaned up duplicate channels');
      }
    };

    cleanupDuplicateChannels().catch(error => {
      console.error('[useChannels] Error cleaning up duplicate channels:', error);
    });
  }, [currentUser, channels]);

  const selectChannel = useCallback(async (channelId: string) => {
    console.log('[useChannels] Selecting channel:', channelId);
    if (!channelId) return;
    
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      // Clear other states but not the channel
      setCurrentDirectMessage(null);
      setCurrentCharacter(null);
      setMessages([]);
      // Set the new channel
      setCurrentChannel(channel);
    }
  }, [channels, setCurrentChannel, setCurrentDirectMessage, setCurrentCharacter, setMessages]);

  const deleteChannel = useCallback(async (channelId: string) => {
    if (!currentUser) {
      throw new Error('Must be signed in to delete a channel');
    }

    await deleteDoc(doc(db, 'channels', channelId));
    setChannels(channels.filter(c => c.id !== channelId));
  }, [currentUser, channels]);

  return {
    channels,
    isLoading,
    createChannel,
    selectChannel,
    deleteChannel
  };
} 