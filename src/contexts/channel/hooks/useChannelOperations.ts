import { useState, useCallback, useEffect } from 'react';
import { collection, query as firestoreQuery, doc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Channel, DirectMessage, Message } from '../../../types/channel';
import { User } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

interface UseChannelOperationsProps {
  currentUser: User | null;
  setCurrentChannel: (channel: Channel | null) => void;
  setCurrentDirectMessage: (dm: DirectMessage | null) => void;
  setCurrentCharacter: (character: string | null) => void;
  setMessages: (messages: Message[]) => void;
}

export function useChannelOperations({
  currentUser,
  setCurrentChannel,
  setCurrentDirectMessage,
  setCurrentCharacter,
  setMessages
}: UseChannelOperationsProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to load channels
  useEffect(() => {
    if (!currentUser) {
      setChannels([]);
      setIsLoading(false);
      return;
    }

    const q = firestoreQuery(collection(db, 'channels'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Channel));
      setChannels(channelData);
      setIsLoading(false);
    }, (error) => {
      console.error('[useChannelOperations] Error in channels listener:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

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

  const clearCurrentChat = useCallback(() => {
    console.log('[useChannelOperations] Clearing current chat state');
    setCurrentChannel(null);
    setCurrentDirectMessage(null);
    setCurrentCharacter(null);
    setMessages([]);
  }, [setCurrentChannel, setCurrentDirectMessage, setCurrentCharacter, setMessages]);

  const selectChannel = useCallback(async (channelId: string) => {
    console.log('[useChannelOperations] Selecting channel:', channelId);
    await clearCurrentChat();
    
    if (!channelId) return;
    
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      setCurrentChannel(channel);
    }
  }, [channels, setCurrentChannel, clearCurrentChat]);

  return {
    channels,
    isLoading,
    createChannel,
    selectChannel,
    clearCurrentChat
  };
} 