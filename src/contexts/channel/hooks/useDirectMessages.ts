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
  addDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { DirectMessage } from '../../../types/channel';
import { User } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import debounce from 'lodash/debounce';

interface UseDirectMessagesProps {
  currentUser: User | null;
  users: Record<string, User>;
  setUsers: (users: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void;
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
  const [isSelecting, setIsSelecting] = useState(false);

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
          if (participantId !== currentUser.uid && !users[participantId]) {
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
          updatedAt: data.updatedAt?.toDate() || new Date(),
          isEdited: data.isEdited || false
        };
        dmData.push(dm);
      });

      // Only fetch users that we don't already have and aren't AI users
      if (userIdsToFetch.size > 0) {
        const userPromises = Array.from(userIdsToFetch).map(async (userId) => {
          // Skip if we already have the user or if it's an AI user
          if (users[userId] || userId.startsWith('ai-')) {
            return;
          }

          try {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = { uid: userDoc.id, ...userDoc.data() } as User;
              setUsers((prev: Record<string, User>) => ({
                ...prev,
                [userId]: userData
              }));
            }
          } catch (error) {
            console.error(`[useDirectMessages] Error fetching user ${userId}:`, error);
          }
        });
        await Promise.all(userPromises);
      }
      
      setDirectMessages(dmData);
    });

    return () => unsubscribe();
  }, [currentUser, users, setUsers]);

  const selectDirectMessage = useCallback(
    (userId: string) => {
      const debouncedSelect = debounce(async (id: string) => {
        console.log('[useDirectMessages] Selecting DM with user:', id);
        
        if (!currentUser) {
          console.error('[useDirectMessages] No current user');
          throw new Error('Must be signed in to create a DM');
        }

        if (isSelecting) {
          console.log('[useDirectMessages] Already selecting a DM');
          return;
        }

        setIsSelecting(true);

        try {
          await clearCurrentChat();
          
          if (!id) {
            setIsSelecting(false);
            return;
          }
          
          // Find existing DM by checking both possible participant orders
          const existingDM = directMessages.find(dm => 
            (dm.participants.includes(id) && dm.participants.includes(currentUser.uid))
          );

          if (existingDM) {
            console.log('[useDirectMessages] Found existing DM:', existingDM);
            setCurrentDirectMessage(existingDM);
            setIsSelecting(false);
            return;
          }

          // Create new DM
          const newDM = {
            id: uuidv4(),
            participants: [currentUser.uid, id].sort(), // Sort to ensure consistent order
            content: '',
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            reactions: {},
            isEdited: false
          };

          await setDoc(doc(db, 'directMessages', newDM.id), newDM);
          setCurrentDirectMessage({
            ...newDM,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } catch (error) {
          console.error('[useDirectMessages] Error creating DM:', error);
          throw error;
        } finally {
          setIsSelecting(false);
        }
      }, 300);

      return debouncedSelect(userId);
    },
    [currentUser, directMessages, clearCurrentChat, setCurrentDirectMessage, isSelecting]
  );

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

  const deleteDirectMessage = useCallback(async (dmId: string) => {
    if (!currentUser) {
      throw new Error('Must be signed in to delete a DM');
    }

    const dm = directMessages.find(d => d.id === dmId);
    if (!dm) return;

    try {
      // Delete all messages in the DM first
      const messagesQuery = query(
        collection(db, 'messages'),
        where('directMessageId', '==', dmId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      // Create a new batch
      const batch = writeBatch(db);
      
      // Add message deletions to batch
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Add DM document deletion to batch
      batch.delete(doc(db, 'directMessages', dmId));
      
      // Commit the batch
      await batch.commit();

      // If this was the current DM, clear it
      if (currentDirectMessage?.id === dmId) {
        clearCurrentChat();
      }
    } catch (error) {
      console.error('[useDirectMessages] Error deleting DM:', error);
      throw error;
    }
  }, [currentUser, directMessages, currentDirectMessage, clearCurrentChat]);

  return {
    directMessages,
    currentDirectMessage,
    setCurrentDirectMessage,
    selectDirectMessage,
    sendDirectMessage,
    deleteDirectMessage
  };
} 