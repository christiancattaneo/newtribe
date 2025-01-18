import { Channel, DirectMessage, Message } from '../../types/channel';
import { User } from '../../types';

export interface ChannelContextType {
  channels: Channel[];
  messages: Message[];
  directMessages: DirectMessage[];
  currentChannel: Channel | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  users: Record<string, User>;
  isLoading: boolean;
  createChannel: (name: string, description: string) => Promise<void>;
  selectChannel: (channelId: string) => void;
  selectDirectMessage: (userId: string) => void;
  setCurrentCharacter: (characterId: string | null) => void;
  sendMessage: (content: string, attachments?: { url: string; type: string; name: string }[], parentMessageId?: string, overrideUser?: { displayName: string; photoURL: string; uid: string }) => Promise<void>;
  searchMessages: (query: string) => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  getAvailableUsers: () => Promise<User[]>;
  getThreadMessages: (threadId: string) => Message[];
  getThreadRepliesCount: (threadId: string) => number;
  deleteChannel: (channelId: string) => Promise<void>;
  deleteDirectMessage: (dmId: string) => Promise<void>;
} 