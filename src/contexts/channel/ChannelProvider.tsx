import React, { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { Channel, DirectMessage } from '../../types/channel';
import { User } from '../../types';
import { useAuth } from '../hooks/useAuth';
import { useChannels } from './hooks/useChannels';
import { useDirectMessages } from './hooks/useDirectMessages';
import { useCharacter } from './hooks/useCharacter';
import { useUsers } from './hooks/useUsers';
import { useMessageOperations } from './hooks/useMessageOperations';
import { useMessageSearch } from './hooks/useMessageSearch';
import { useChannelMessages } from './hooks/useChannelMessages';
import { ChannelContext } from './context';

export function ChannelProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [currentDirectMessage, setCurrentDirectMessage] = useState<DirectMessage | null>(null);

  const userObject = useMemo(() => {
    if (!currentUser) return null;
    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL
    } as User;
  }, [currentUser]);

  const {
    currentCharacter,
    setCurrentCharacter
  } = useCharacter({ 
    clearCurrentChat: () => {
      setCurrentChannel(null);
      setCurrentDirectMessage(null);
    }
  });

  const {
    messages,
    getThreadMessages,
    getThreadRepliesCount,
    addReaction,
    removeReaction
  } = useChannelMessages({
    currentUser: userObject,
    currentChannel,
    currentDirectMessage,
    currentCharacter,
    users,
    setUsers
  });

  const clearCurrentChat = useCallback(() => {
    console.log('[ChannelProvider] Clearing current chat state');
    setCurrentChannel(null);
    setCurrentDirectMessage(null);
    setCurrentCharacter(null);
  }, [setCurrentCharacter]);

  const {
    channels,
    createChannel,
    selectChannel,
    isLoading,
    deleteChannel
  } = useChannels({
    currentUser: userObject,
    currentDirectMessage,
    currentCharacter,
    currentChannel,
    setCurrentChannel,
    setCurrentDirectMessage,
    setCurrentCharacter,
    setMessages: () => {} // This is now handled by useChannelMessages
  });

  const {
    fetchUserData,
    getAvailableUsers
  } = useUsers({ currentUser: userObject });

  const {
    directMessages,
    selectDirectMessage,
    deleteDirectMessage
  } = useDirectMessages({
    currentUser: userObject,
    users,
    setUsers,
    clearCurrentChat: useCallback(() => {
      setCurrentChannel(null);
      setCurrentCharacter(null);
    }, [setCurrentChannel, setCurrentCharacter]),
    currentDirectMessage,
    setCurrentDirectMessage
  });

  const {
    sendMessage
  } = useMessageOperations({
    currentUser: userObject,
    currentChannel,
    currentDirectMessage,
    currentCharacter,
    setUsers
  });

  const { searchMessages } = useMessageSearch({
    channels,
    directMessages,
    users,
    fetchUserData
  });

  // Subscribe to messages
  useEffect(() => {
    if (!currentUser) {
      clearCurrentChat();
    }
  }, [currentUser, clearCurrentChat]);

  const value = useMemo(() => ({
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
    searchMessages,
    addReaction,
    removeReaction,
    getAvailableUsers,
    getThreadMessages,
    getThreadRepliesCount,
    deleteChannel,
    deleteDirectMessage
  }), [
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
    searchMessages,
    addReaction,
    removeReaction,
    getAvailableUsers,
    getThreadMessages,
    getThreadRepliesCount,
    deleteChannel,
    deleteDirectMessage
  ]);

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
} 