import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  orderBy,
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Channel, DirectMessage, Message } from '../../../types/channel';
import { User } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

interface UseChannelsProps {
  currentUser: User | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  currentChannel: Channel | null;
  setCurrentChannel: (channel: Channel | null) => void;
  setCurrentDirectMessage: (dm: DirectMessage | null) => void;
  setCurrentCharacter: (character: string | null) => void;
  setMessages: (messages: Message[]) => void;
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
}: UseChannelsProps) {
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
  }, [currentUser, setCurrentChannel]);

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

  return {
    channels,
    isLoading,
    createChannel,
    selectChannel
  };
} 