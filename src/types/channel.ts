import { FieldValue } from 'firebase/firestore';

export interface Channel {
  id: string;
  name: string;
  description: string;
  createdAt: Date | FieldValue;
  createdBy: string;
  isAIChannel?: boolean;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
  reactions: Record<string, string[]>;
  threadId?: string;
  parentMessageId?: string;
  attachments?: { url: string; type: string; name: string }[];
  isEdited?: boolean;
}

export interface DirectMessage extends Message {
  participants: string[];
} 