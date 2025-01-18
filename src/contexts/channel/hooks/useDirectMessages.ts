import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { DirectMessage } from '../../../types/channel';
import { User } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

interface UseDirectMessagesProps {
  currentUser: User | null;
  users: Record<string, User>;
  setUsers: (users: Record<string, User>) => void;
  clearCurrentChat: () => void;
  currentDirectMessage: DirectMessage | null;
  setCurrentDirectMessage: (dm: DirectMessage | null) => void;
}

export function useDirectMessages({ 
  currentUser, 
  users, 
  setUsers,
  clearCurrentChat,
  currentDirectMessage,
  setCurrentDirectMessage
}: UseDirectMessagesProps) {
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);

  // Effect to load direct messages
  useEffect(() => {
    if (!currentUser) {
      setDirectMessages([]);
      return;
    }

    const q = query(
      collection(db, 'directMessages'),
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const dmData: DirectMessage[] = [];
      const userIdsToFetch = new Set<string>();

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Add all participants except current user to fetch list
        data.participants.forEach((participantId: string) => {
          if (participantId !== currentUser.uid) {
            userIdsToFetch.add(participantId);
          }
        });
        
        const dm: DirectMessage = {
          id: doc.id,
          participants: data.participants || [],
          content: data.content || '',
          userId: data.userId || '',
          reactions: data.reactions || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
        dmData.push(dm);
      });

      // Fetch user data for all participants
      const userPromises = Array.from(userIdsToFetch).map(async (userId) => {
        if (!users[userId]) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            setUsers({
              ...users,
              [userId]: { uid: userDoc.id, ...userDoc.data() } as User
            });
          }
        }
      });

      await Promise.all(userPromises);
      setDirectMessages(dmData);
    });

    return () => unsubscribe();
  }, [currentUser, users, setUsers]);

  const selectDirectMessage = useCallback(async (userId: string) => {
    console.log('[useDirectMessages] Selecting DM with user:', userId);
    
    if (!currentUser) {
      console.error('[useDirectMessages] No current user');
      throw new Error('Must be signed in to create a DM');
    }

    await clearCurrentChat();
    
    if (!userId) return;
    
    // Find existing DM or create new one
    const existingDM = directMessages.find(dm => 
      dm.participants.includes(userId) && dm.participants.includes(currentUser.uid)
    );

    if (existingDM) {
      console.log('[useDirectMessages] Found existing DM:', existingDM);
      setCurrentDirectMessage(existingDM);
      return;
    }

    // Create new DM
    const newDM = {
      id: uuidv4(),
      participants: [currentUser.uid, userId],
      content: '',
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reactions: {}
    };

    try {
      await setDoc(doc(db, 'directMessages', newDM.id), newDM);
      setCurrentDirectMessage({
        ...newDM,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('[useDirectMessages] Error creating DM:', error);
      throw error;
    }
  }, [currentUser, directMessages, clearCurrentChat, setCurrentDirectMessage]);

  const sendDirectMessage = useCallback(async (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string): Promise<void> => {
    if (!currentUser || !currentDirectMessage) return;

    const messageData = {
      content,
      directMessageId: currentDirectMessage.id,
      userId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(attachments ? { attachments } : {}),
      reactions: {},
      isEdited: false
    };

    if (parentMessageId) {
      const parentMessage = await getDoc(doc(db, 'messages', parentMessageId));
      if (parentMessage.exists()) {
        const threadId = parentMessage.data().threadId || parentMessageId;
        Object.assign(messageData, {
          threadId,
          parentMessageId
        });
      }
    }

    await addDoc(collection(db, 'messages'), messageData);

    // Update DM with last message
    await updateDoc(doc(db, 'directMessages', currentDirectMessage.id), {
      lastMessage: {
        content,
        timestamp: serverTimestamp(),
        senderId: currentUser.uid
      },
      updatedAt: serverTimestamp()
    });
  }, [currentUser, currentDirectMessage]);

  return {
    directMessages,
    currentDirectMessage,
    setCurrentDirectMessage,
    selectDirectMessage,
    sendDirectMessage
  };
} 