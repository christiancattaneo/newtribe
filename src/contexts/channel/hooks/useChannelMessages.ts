import { useState, useCallback, useEffect } from 'react';
import { collection, query as firestoreQuery, where, orderBy, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Message, Channel, DirectMessage } from '../../../types/channel';
import { User } from '../../../types';

interface UseChannelMessagesProps {
  currentUser: User | null;
  currentChannel: Channel | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  users: Record<string, User>;
  setUsers: (users: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void;
}

export function useChannelMessages({
  currentUser,
  currentChannel,
  currentDirectMessage,
  currentCharacter,
  users,
  setUsers
}: UseChannelMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchMessageUsers = useCallback(async (userIds: Set<string>) => {
    const userPromises = Array.from(userIds).map(async (userId) => {
      if (!users[userId]) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUsers(prev => ({
            ...prev,
            [userId]: { uid: userDoc.id, ...userDoc.data() } as User
          }));
        }
      }
    });
    return Promise.all(userPromises);
  }, [users, setUsers]);

  // Effect to load messages
  useEffect(() => {
    if (!currentUser) {
      console.log('[useChannelMessages] No current user, clearing messages');
      setMessages([]);
      return;
    }

    let messagesQuery;
    if (currentChannel) {
      console.log('[useChannelMessages] Setting up channel messages listener for channel:', currentChannel.id);
      // Only query the subcollection for channel messages
      messagesQuery = firestoreQuery(
        collection(db, 'channels', currentChannel.id, 'messages'),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        console.log('[useChannelMessages] Messages loaded:', {
          count: snapshot.size
        });

        const allMessages = snapshot.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate() || data.createdAt?.toDate();
          if (!timestamp) {
            console.warn(`Message ${doc.id} has no valid timestamp, using current time`);
          }
          return {
            id: doc.id,
            content: data.content || '',
            userId: data.userId || '',
            channelId: data.channelId,
            directMessageId: data.directMessageId,
            timestamp: timestamp || new Date(),
            createdAt: timestamp || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            reactions: data.reactions || {},
            isEdited: data.isEdited || false,
            attachments: data.attachments || [],
            threadId: data.threadId,
            parentMessageId: data.parentMessageId
          } as Message;
        });

        const userIdsToFetch = new Set<string>(allMessages.map(msg => msg.userId));
        await fetchMessageUsers(userIdsToFetch);
        setMessages(allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
      }, (error) => {
        console.error('[useChannelMessages] Error in messages listener:', error);
      });

      return () => unsubscribe();
    } else if (currentDirectMessage) {
      console.log('[useChannelMessages] Setting up DM messages listener for DM:', {
        dmId: currentDirectMessage.id,
        participants: currentDirectMessage.participants
      });
      messagesQuery = firestoreQuery(
        collection(db, 'messages'),
        where('directMessageId', '==', currentDirectMessage.id),
        orderBy('createdAt', 'asc')
      );
    } else if (currentCharacter) {
      // For AI chats, get messages where chatId matches the AI chat ID
      const aiChatId = `ai-chat-${currentUser.uid}-${currentCharacter}`;
      console.log('[useChannelMessages] Setting up AI chat messages listener:', aiChatId);
      messagesQuery = firestoreQuery(
        collection(db, 'messages'),
        where('chatId', '==', aiChatId),
        orderBy('createdAt', 'asc')
      );
    } else {
      console.log('[useChannelMessages] No active chat, clearing messages');
      setMessages([]);
      return;
    }

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const newMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate() || data.createdAt?.toDate();
        if (!timestamp) {
          console.warn(`Message ${doc.id} has no valid timestamp, using current time`);
        }
        return {
          id: doc.id,
          content: data.content || '',
          userId: data.userId || '',
          channelId: data.channelId,
          directMessageId: data.directMessageId,
          timestamp: timestamp || new Date(),
          createdAt: timestamp || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          reactions: data.reactions || {},
          isEdited: data.isEdited || false,
          attachments: data.attachments || [],
          threadId: data.threadId,
          parentMessageId: data.parentMessageId
        } as Message;
      });
      
      const userIdsToFetch = new Set<string>(newMessages.map(msg => msg.userId));
      await fetchMessageUsers(userIdsToFetch);
      setMessages(newMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }, (error) => {
      console.error('[useChannelMessages] Error in messages listener:', error);
    });

    return () => unsubscribe();
  }, [currentUser, currentChannel, currentDirectMessage, currentCharacter, fetchMessageUsers]);

  const getThreadMessages = useCallback((threadId: string) => {
    return messages.filter(message => message.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages]);

  const getThreadRepliesCount = useCallback((threadId: string) => {
    return messages.filter(message => message.threadId === threadId).length;
  }, [messages]);

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
    messages,
    getThreadMessages,
    getThreadRepliesCount,
    addReaction,
    removeReaction
  };
} 