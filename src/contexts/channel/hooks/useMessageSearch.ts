import { useCallback } from 'react';
import { 
  collection,
  query as firestoreQuery,
  where,
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

interface MessageAttachment {
  name: string;
  url: string;
  type: string;
}

export function useMessageSearch({ 
  channels, 
  directMessages, 
  users,
  fetchUserData
}: UseMessageSearchProps) {
  const searchMessages = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
    if (!searchQuery.trim()) return [];

    // Search in messages collection for content or attachment names
    const messagesRef = collection(db, 'messages');
    const contentQuery = firestoreQuery(
      messagesRef,
      where('content', '>=', searchQuery),
      where('content', '<=', searchQuery + '\uf8ff')
    );

    const attachmentQuery = firestoreQuery(
      messagesRef,
      where('attachments', 'array-contains', {
        name: searchQuery
      })
    );

    const [contentSnapshot, attachmentSnapshot] = await Promise.all([
      getDocs(contentQuery),
      getDocs(attachmentQuery)
    ]);

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
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        reactions: data.reactions || {},
        isEdited: data.isEdited || false,
        attachments: data.attachments || [],
        threadId: data.threadId,
        parentMessageId: data.parentMessageId
      } as Message;

      // Fetch user data if needed
      if (!users[message.userId]) {
        await fetchUserData(message.userId);
      }

      // Add channel or DM context
      if ('channelId' in data) {
        const channel = channels.find(c => c.id === data.channelId);
        if (channel) {
          results.push({ message, channel });
        }
      } else if ('directMessageId' in data) {
        const dm = directMessages.find(d => d.id === data.directMessageId);
        if (dm) {
          results.push({ message, directMessage: dm });
        }
      }
    };

    // Process both content and attachment matches
    for (const doc of contentSnapshot.docs) {
      await processDoc(doc);
    }

    for (const doc of attachmentSnapshot.docs) {
      await processDoc(doc);
    }

    // Also search for partial filename matches
    const allMessagesQuery = firestoreQuery(messagesRef);
    const allMessages = await getDocs(allMessagesQuery);
    
    for (const doc of allMessages.docs) {
      const data = doc.data();
      if (data.attachments?.some((att: MessageAttachment) => 
        att.name.toLowerCase().includes(searchQuery.toLowerCase())
      )) {
        await processDoc(doc);
      }
    }

    return results;
  }, [channels, directMessages, users, fetchUserData]);

  return {
    searchMessages
  };
} 