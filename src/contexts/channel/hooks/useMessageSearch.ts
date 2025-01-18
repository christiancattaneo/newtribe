import { useCallback } from 'react';
import { 
  collection,
  query as firestoreQuery,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Channel, DirectMessage, Message } from '../../../types/channel';
import { User } from '../../../types';
import { SearchResult } from '../types';

interface UseMessageSearchProps {
  channels: Channel[];
  directMessages: DirectMessage[];
  users: Record<string, User>;
  fetchUserData: (userId: string) => Promise<void>;
}

export function useMessageSearch({ 
  channels, 
  directMessages, 
  users,
  fetchUserData
}: UseMessageSearchProps) {
  const searchMessages = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];
    const processedMessageIds = new Set<string>();

    const processDoc = async (doc: QueryDocumentSnapshot<DocumentData>) => {
      // Skip if we've already processed this message
      if (processedMessageIds.has(doc.id)) return;
      processedMessageIds.add(doc.id);

      const data = doc.data();
      const message = {
        id: doc.id,
        content: data.content,
        userId: data.userId,
        channelId: data.channelId,
        directMessageId: data.directMessageId,
        chatId: data.chatId,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        reactions: data.reactions || {},
        isEdited: data.isEdited || false,
        attachments: data.attachments || [],
        threadId: data.threadId,
        parentMessageId: data.parentMessageId
      } as Message;

      // Fetch user data if needed
      if (!users[message.userId] && !message.userId.startsWith('ai-')) {
        await fetchUserData(message.userId);
      }

      // Add context based on message type
      if (message.channelId) {
        const channel = channels.find(c => c.id === message.channelId);
        if (channel) {
          results.push({ message, channel });
        }
      } else if (message.directMessageId) {
        const dm = directMessages.find(d => d.id === message.directMessageId);
        if (dm) {
          results.push({ message, directMessage: dm });
        }
      } else if (message.chatId?.startsWith('ai-chat-')) {
        // Handle AI chat messages
        results.push({ message });
      }
    };

    // Search in regular messages collection
    const messagesRef = collection(db, 'messages');
    const messagesQuery = firestoreQuery(messagesRef);
    const messagesSnapshot = await getDocs(messagesQuery);

    // Search in channel messages subcollections
    const channelSearchPromises = channels.map(async channel => {
      const channelMessagesRef = collection(db, 'channels', channel.id, 'messages');
      const channelMessagesQuery = firestoreQuery(channelMessagesRef);
      return getDocs(channelMessagesQuery);
    });

    const channelSnapshots = await Promise.all(channelSearchPromises);

    // Process all messages and filter by search query
    for (const doc of messagesSnapshot.docs) {
      const data = doc.data();
      if (data.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
        await processDoc(doc);
      }
    }

    // Process channel messages
    for (const snapshot of channelSnapshots) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
          await processDoc(doc);
        }
      }
    }

    // Sort results by date
    return results.sort((a, b) => b.message.createdAt.getTime() - a.message.createdAt.getTime());
  }, [channels, directMessages, users, fetchUserData]);

  return {
    searchMessages
  };
} 