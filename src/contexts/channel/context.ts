import { createContext } from 'react';
import { Channel, Message, DirectMessage } from '../../types/channel';
import { User } from '../../types';
import { SearchResult } from './types';

interface ChannelContextType {
  channels: Channel[];
  messages: Message[];
  directMessages: DirectMessage[];
  currentChannel: Channel | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  users: Record<string, User>;
  isLoading: boolean;
  createChannel: (name: string, description?: string) => Promise<Channel>;
  selectChannel: (channelId: string) => Promise<void>;
  selectDirectMessage: (userId: string) => Promise<void>;
  setCurrentCharacter: (characterId: string | null) => void;
  sendMessage: (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string, overrideUser?: { displayName: string; photoURL: string; uid: string }) => Promise<void>;
  sendDirectMessage: (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  uploadFile: (file: File) => Promise<{ url: string; type: string; name: string }>;
  getThreadMessages: (threadId: string) => Message[];
  getThreadRepliesCount: (threadId: string) => number;
  getAvailableUsers: () => Promise<User[]>;
  searchMessages: (query: string) => Promise<SearchResult[]>;
}

export const ChannelContext = createContext<ChannelContextType>({
  channels: [],
  messages: [],
  directMessages: [],
  currentChannel: null,
  currentDirectMessage: null,
  currentCharacter: null,
  users: {},
  isLoading: true,
  createChannel: async () => ({ id: '', name: '', description: '', createdAt: new Date(), createdBy: '' }),
  selectChannel: async () => {},
  selectDirectMessage: async () => {},
  setCurrentCharacter: () => {},
  sendMessage: async () => {},
  sendDirectMessage: async () => {},
  addReaction: async () => {},
  removeReaction: async () => {},
  uploadFile: async () => ({ url: '', type: '', name: '' }),
  getThreadMessages: () => [],
  getThreadRepliesCount: () => 0,
  getAvailableUsers: async () => [],
  searchMessages: async () => []
}); 