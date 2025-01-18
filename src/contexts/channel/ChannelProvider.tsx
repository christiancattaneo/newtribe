import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query as firestoreQuery, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  orderBy,
  serverTimestamp,
  addDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  QueryDocumentSnapshot,
  DocumentData,
  writeBatch,
  FieldValue
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { ChannelContext } from './context';
import { useAuth } from '../hooks/useAuth';
import { Channel, Message, DirectMessage } from '../../types/channel';
import { User } from '../../types';
import { SearchResult } from './types';
import { v4 as uuidv4 } from 'uuid';

interface Attachment {
  name: string;
  url: string;
  type: string;
}

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  console.log('ChannelProvider mounted');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [currentDirectMessage, setCurrentDirectMessage] = useState<DirectMessage | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const [currentCharacter, setCurrentCharacter] = useState<string | null>(null);

  // Initialize channels including AI chat
  useEffect(() => {
    if (!currentUser) {
      console.log('[ChannelProvider] No user, clearing state');
      setChannels([]);
      setCurrentChannel(null);
      setMessages([]);
      setIsLoading(false);
      return;
    }

    console.log('[ChannelProvider] Loading channels');
    setIsLoading(true);

    // Clean up any incorrectly generated AI chat channels
    const cleanupAIChannels = async () => {
      const q = firestoreQuery(
        collection(db, 'channels'),
        where('id', '>=', 'ai-chat-'),
        where('id', '<', 'ai-chat-\uf8ff')
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        console.log('[ChannelProvider] Found incorrect AI channels to clean up:', snapshot.size);
        const batch = writeBatch(db);
        snapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log('[ChannelProvider] Cleaned up incorrect AI channels');
      }
    };

    // Initialize channels
    cleanupAIChannels().then(() => {
      const q = firestoreQuery(
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
        console.log('[ChannelProvider] Channels updated:', channelData);
        setChannels(channelData);

        // Only select General channel if we have no current channel AND no current DM
        if (!currentChannel && !currentDirectMessage) {
          const generalChannel = channelData.find(c => c.name === 'General');
          if (generalChannel) {
            console.log('[ChannelProvider] No active chat, selecting General channel:', generalChannel.id);
            setCurrentChannel(generalChannel);
          }
        }

        setIsLoading(false);
      }, (error) => {
        console.error('[ChannelProvider] Error in channels snapshot:', error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    });
  }, [currentUser, currentChannel, currentDirectMessage]);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!users[userId]) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUsers(prev => ({
            ...prev,
            [userId]: { uid: userDoc.id, ...userDoc.data() } as User
          }));
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    }
  }, [users]);

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
  }, [users]);

  useEffect(() => {
    if (!currentUser) {
      console.log('[ChannelProvider] No current user, clearing messages');
      setMessages([]);
      return;
    }

    let messagesQuery;
    if (currentChannel) {
      console.log('[ChannelProvider] Setting up channel messages listener for channel:', currentChannel.id);
      messagesQuery = firestoreQuery(
        collection(db, 'channels', currentChannel.id, 'messages'),
        orderBy('createdAt', 'asc')
      );
    } else if (currentDirectMessage) {
      console.log('[ChannelProvider] Setting up DM messages listener for DM:', {
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
      console.log('[ChannelProvider] Setting up AI chat messages listener:', aiChatId);
      messagesQuery = firestoreQuery(
        collection(db, 'messages'),
        where('chatId', '==', aiChatId),
        orderBy('createdAt', 'asc')
      );
    } else {
      console.log('[ChannelProvider] No active chat, clearing messages');
      setMessages([]);
      return;
    }

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const newMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          content: data.content || '',
          userId: data.userId || '',
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
      });
      
      const userIdsToFetch = new Set<string>(newMessages.map(msg => msg.userId));
      await fetchMessageUsers(userIdsToFetch);
      setMessages(newMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }, (error) => {
      console.error('[ChannelProvider] Error in messages listener:', error);
    });

    return () => {
      console.log('[ChannelProvider] Cleaning up messages listener');
      unsubscribe();
    };
  }, [currentUser, currentChannel, currentDirectMessage, fetchMessageUsers, currentCharacter]);

  // Effect to load direct messages
  useEffect(() => {
    if (!currentUser) {
      setDirectMessages([]);
      return;
    }

    const q = firestoreQuery(
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
      console.log('[ChannelProvider] Fetching user data for DM participants:', Array.from(userIdsToFetch));
      const userPromises = Array.from(userIdsToFetch).map(async (userId) => {
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

      await Promise.all(userPromises);
      setDirectMessages(dmData);
    });

    return () => unsubscribe();
  }, [currentUser, users]);

  const createChannel = async (name: string, description?: string) => {
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
  };

  const selectChannel = async (channelId: string) => {
    console.log('[ChannelProvider] Selecting channel:', channelId);
    setCurrentChannel(channels.find(c => c.id === channelId) || null);
    setCurrentDirectMessage(null); // Clear DM when selecting channel
  };

  const sendMessage = async (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string, overrideUser?: { displayName: string; photoURL: string; uid: string }): Promise<void> => {
    if (!currentUser && !overrideUser) return;

    const messageData: {
      content: string;
      userId: string;
      createdAt: FieldValue;
      updatedAt: FieldValue;
      reactions: Record<string, string[]>;
      isEdited: boolean;
      attachments?: { url: string; type: string; name: string }[];
      channelId?: string;
      directMessageId?: string;
      chatId?: string;
    } = {
      content,
      userId: overrideUser?.uid || currentUser!.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(attachments ? { attachments } : {}),
      reactions: {},
      isEdited: false,
    };

    // Add the appropriate chat identifier
    if (currentChannel) {
      messageData.channelId = currentChannel.id;
    } else if (currentDirectMessage) {
      messageData.directMessageId = currentDirectMessage.id;
    } else if (currentCharacter) {
      messageData.chatId = `ai-chat-${currentUser!.uid}-${currentCharacter}`;
    } else {
      console.error('[ChannelProvider] No active chat context');
      return;
    }

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

    // Add override user to users record if provided
    if (overrideUser) {
      setUsers(prev => ({
        ...prev,
        [overrideUser.uid]: {
          uid: overrideUser.uid,
          displayName: overrideUser.displayName,
          photoURL: overrideUser.photoURL
        } as User
      }));
    }

    await addDoc(collection(db, 'messages'), messageData);

    // Update DM with last message if this is a DM
    if (currentDirectMessage && !parentMessageId) {
      await updateDoc(doc(db, 'directMessages', currentDirectMessage.id), {
        lastMessage: {
          content,
          timestamp: serverTimestamp(),
          senderId: overrideUser?.uid || currentUser!.uid
        },
        updatedAt: serverTimestamp()
      });
    }
  };

  const uploadFile = async (file: File) => {
    if (!currentUser) throw new Error('Must be signed in to upload files');

    const uniqueId = uuidv4();
    const storageRef = ref(storage, `uploads/${currentUser.uid}/${uniqueId}_${file.name}`);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    return {
      url,
      type: file.type,
      name: file.name
    };
  };

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp()
    });
  }, [currentUser]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!currentUser) throw new Error('Not authenticated');
    
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayRemove(currentUser.uid),
      updatedAt: serverTimestamp()
    });
  }, [currentUser]);

  const getThreadMessages = useCallback((threadId: string) => {
    return messages.filter(message => message.threadId === threadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [messages]);

  const getThreadRepliesCount = useCallback((threadId: string) => {
    return messages.filter(message => message.threadId === threadId).length;
  }, [messages]);

  const selectDirectMessage = async (userId: string) => {
    console.log('[ChannelProvider] Selecting DM with user:', userId);
    
    if (!currentUser) {
      console.error('[ChannelProvider] No current user');
      throw new Error('Must be signed in to create a DM');
    }

    setCurrentChannel(null); // Clear channel when selecting DM
    
    // Find existing DM or create new one
    const existingDM = directMessages.find(dm => 
      dm.participants.includes(userId) && dm.participants.includes(currentUser.uid)
    );

    console.log('[ChannelProvider] DM selection:', {
      userId,
      currentUserId: currentUser.uid,
      existingDM,
      directMessagesCount: directMessages.length,
      directMessages: directMessages.map(dm => ({
        id: dm.id,
        participants: dm.participants
      }))
    });

    if (existingDM) {
      console.log('[ChannelProvider] Found existing DM:', existingDM);
      setCurrentDirectMessage(existingDM);
      return;
    }

    // Create new DM
    console.log('[ChannelProvider] Creating new DM between:', {
      currentUser: currentUser.uid,
      otherUser: userId
    });

    const newDM = {
      id: uuidv4(),
      participants: [currentUser.uid, userId],
      content: '',
      userId: currentUser.uid,
      createdAt: new Date(),
      reactions: {}
    };

    try {
      await setDoc(doc(db, 'directMessages', newDM.id), newDM);
      console.log('[ChannelProvider] Successfully created new DM:', newDM.id);
      setCurrentDirectMessage(newDM);
    } catch (error) {
      console.error('[ChannelProvider] Error creating DM:', error);
      throw error;
    }
  };

  const sendDirectMessage = async (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string): Promise<void> => {
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
  };

  const getAvailableUsers = useCallback(async () => {
    console.log('[ChannelProvider] Starting getAvailableUsers');
    if (!currentUser) {
      console.log('[ChannelProvider] No current user, cannot fetch users');
      return [];
    }

    try {
      console.log('[ChannelProvider] Current user:', {
        uid: currentUser.uid,
        email: currentUser.email
      });

      // Get all users from the database
      console.log('[ChannelProvider] Fetching users collection');
      const usersRef = collection(db, 'users');
      console.log('[ChannelProvider] Created users collection reference');
      
      const usersSnapshot = await getDocs(usersRef);
      console.log('[ChannelProvider] Got users snapshot, count:', usersSnapshot.size);
      
      if (usersSnapshot.empty) {
        console.log('[ChannelProvider] No users found in the database!');
        return [];
      }

      const allUsers: User[] = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        console.log('[ChannelProvider] Processing user document:', {
          id: doc.id,
          displayName: userData.displayName,
          email: userData.email
        });

        // Skip current user
        if (doc.id !== currentUser.uid) {
          const user = {
            uid: doc.id,
            displayName: userData.displayName,
            email: userData.email,
            photoURL: userData.photoURL
          } as User;
          console.log('[ChannelProvider] Adding user to results:', user);
          allUsers.push(user);
        } else {
          console.log('[ChannelProvider] Skipping current user:', doc.id);
        }
      });

      console.log('[ChannelProvider] Final users list:', {
        count: allUsers.length,
        users: allUsers.map(u => ({ uid: u.uid, displayName: u.displayName }))
      });
      return allUsers;
    } catch (error) {
      console.error('[ChannelProvider] Error fetching users:', error);
      // Log the full error details
      if (error instanceof Error) {
        console.error('[ChannelProvider] Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  }, [currentUser]);

  const searchMessages = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    // Search in messages collection for content or attachment names
    const messagesRef = collection(db, 'messages');
    const contentQuery = firestoreQuery(
      messagesRef,
      where('content', '>=', query),
      where('content', '<=', query + '\uf8ff')
    );

    const attachmentQuery = firestoreQuery(
      messagesRef,
      where('attachments', 'array-contains', {
        name: query
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
        attachments: data.attachments,
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
      if (data.attachments?.some((att: Attachment) => 
        att.name.toLowerCase().includes(query.toLowerCase())
      )) {
        await processDoc(doc);
      }
    }

    return results;
  }, [channels, directMessages, users, fetchUserData]);

  const value = {
    channels,
    messages,
    directMessages,
    currentChannel,
    currentDirectMessage,
    currentCharacter,
    users,
    isLoading,
    createChannel,
    selectChannel,
    selectDirectMessage,
    setCurrentCharacter,
    sendMessage,
    sendDirectMessage,
    addReaction,
    removeReaction,
    uploadFile,
    getThreadMessages,
    getThreadRepliesCount,
    getAvailableUsers,
    searchMessages
  };

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
} 