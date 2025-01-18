import { Channel, Message, DirectMessage } from '../../types/channel';
import { User } from '../../types';

export interface SearchResult {
  message: Message;
  channel?: Channel;
  directMessage?: DirectMessage;
}

export interface ChannelContextType {
  channels: Channel[];
  messages: Message[];
  directMessages: DirectMessage[];
  currentChannel: Channel | null;
  currentDirectMessage: DirectMessage | null;
  users: Record<string, User>;
  isLoading: boolean;
  selectChannel: (channelId: string) => Promise<void>;
  createChannel: (name: string, description?: string) => Promise<void>;
  sendMessage: (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string) => Promise<void>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  getThreadMessages: (threadId: string) => Message[];
  getThreadRepliesCount: (threadId: string) => number;
  selectDirectMessage: (userId: string) => Promise<void>;
  sendDirectMessage: (content: string, attachments?: { url: string; type: string; name: string }[]) => Promise<void>;
  getAvailableUsers: () => Promise<User[]>;
  searchMessages: (query: string) => Promise<SearchResult[]>;
  updateCurrentCharacter: (characterId: string | null) => Promise<void>;
} 