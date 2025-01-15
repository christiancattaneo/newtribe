export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSeen?: Date;
  status?: 'online' | 'offline' | 'away' | 'dnd';
  bio?: string;
  role?: 'admin' | 'user';
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  channelId: string;
  timestamp: Date;
  attachments?: Attachment[];
  reactions?: { [key: string]: string[] }; // emoji: userIds[]
  threadId?: string;
  parentMessageId?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface DirectMessage extends Omit<Message, 'channelId'> {
  participants: string[];
} 