import { useCallback } from 'react';
import { Message } from '../../../types/channel';
import { useChannel } from '../useChannel';

export function useThread() {
  const { messages } = useChannel();

  const getThreadMessages = useCallback((threadId: string): Message[] => {
    // Get all messages that belong to this thread
    return messages
      .filter(message => 
        message.threadId === threadId || message.parentMessageId === threadId
      )
      .sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeA - timeB;
      });
  }, [messages]);

  const getMainMessages = useCallback((): Message[] => {
    // Get only messages that are not part of any thread
    return messages
      .filter(message => 
        !message.threadId && !message.parentMessageId
      )
      .sort((a, b) => {
        const timeA = a.createdAt?.getTime() || 0;
        const timeB = b.createdAt?.getTime() || 0;
        return timeA - timeB;
      });
  }, [messages]);

  const getThreadRepliesCount = useCallback((threadId: string): number => {
    return messages.filter(message => 
      message.threadId === threadId || message.parentMessageId === threadId
    ).length;
  }, [messages]);

  return {
    getThreadMessages,
    getMainMessages,
    getThreadRepliesCount
  };
} 