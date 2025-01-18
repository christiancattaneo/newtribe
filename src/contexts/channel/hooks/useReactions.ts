import { useCallback } from 'react';
import { 
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Channel } from '../../../types/channel';
import { User } from '../../../types';

interface UseReactionsProps {
  currentUser: User | null;
  currentChannel: Channel | null;
}

export function useReactions({ 
  currentUser,
  currentChannel
}: UseReactionsProps) {
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    
    let messageRef;
    if (currentChannel) {
      messageRef = doc(db, 'channels', currentChannel.id, 'messages', messageId);
    } else {
      messageRef = doc(db, 'messages', messageId);
    }

    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp()
    });
  }, [currentUser, currentChannel]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    
    let messageRef;
    if (currentChannel) {
      messageRef = doc(db, 'channels', currentChannel.id, 'messages', messageId);
    } else {
      messageRef = doc(db, 'messages', messageId);
    }

    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayRemove(currentUser.uid),
      updatedAt: serverTimestamp()
    });
  }, [currentUser, currentChannel]);

  return {
    addReaction,
    removeReaction
  };
} 