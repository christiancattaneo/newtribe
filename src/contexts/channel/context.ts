import { createContext } from 'react';
import { Channel, DirectMessage, Message } from '../../types/channel';
import { User } from '../../types';
import { SearchResult } from './types';

export interface ChannelContextType {
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
  setCurrentCharacter: (characterId: string | null) => Promise<void>;
  sendMessage: (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string) => Promise<void>;
  uploadFile: (file: File) => Promise<{ url: string; type: string; name: string }>;
  searchMessages: (query: string) => Promise<SearchResult[]>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  getAvailableUsers: () => Promise<User[]>;
}

export const ChannelContext = createContext<ChannelContextType | null>(null); 