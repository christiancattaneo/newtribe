import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Message, Channel, DirectMessage } from '../../../types/channel';
import { User } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { CharacterAIService } from '../../../services/characterAI';
import { CHARACTERS } from '../../../types/character';

interface UseMessageOperationsProps {
  currentUser: User | null;
  currentChannel: Channel | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  setUsers: (users: Record<string, User> | ((prev: Record<string, User>) => Record<string, User>)) => void;
}

type MessageInput = Omit<Message, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  channelId?: string;
  directMessageId?: string;
  chatId?: string;
};

export function useMessageOperations({
  currentUser,
  currentChannel,
  currentDirectMessage,
  currentCharacter,
  setUsers
}: UseMessageOperationsProps) {
  const characterService = new CharacterAIService();

  const sendMessage = async (content: string, parentMessageId?: string, overrideUser?: { displayName: string; photoURL: string; uid: string }): Promise<void> => {
    if (!currentUser && !overrideUser) return;

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

    const messageId = uuidv4();
    let messageRef;

    const newMessage: MessageInput = {
      id: messageId,
      content,
      userId: overrideUser?.uid || currentUser!.uid,
      createdAt: serverTimestamp() as unknown as Timestamp,
      updatedAt: serverTimestamp() as unknown as Timestamp,
      reactions: {},
      isEdited: false
    };

    if (parentMessageId) {
      newMessage.parentMessageId = parentMessageId;
    }

    if (currentChannel) {
      messageRef = doc(db, 'channels', currentChannel.id, 'messages', messageId);
      newMessage.channelId = currentChannel.id;
    } else if (currentDirectMessage) {
      messageRef = doc(db, 'messages', messageId);
      newMessage.directMessageId = currentDirectMessage.id;
    } else if (currentCharacter && currentUser) {
      messageRef = doc(db, 'messages', messageId);
      newMessage.chatId = `ai-chat-${currentUser.uid}-${currentCharacter}`;
    } else {
      throw new Error('No active chat selected');
    }

    await setDoc(messageRef, newMessage);

    // Generate and send AI response if this is a character chat
    if (currentCharacter && currentUser) {
      try {
        // Get character data
        const character = CHARACTERS[currentCharacter];
        if (!character) {
          throw new Error('Character not found');
        }

        // Generate AI response
        const aiResponse = await characterService.generateResponse(character, content);

        // Send AI response as a new message
        const aiMessageId = uuidv4();
        const aiMessageRef = doc(db, 'messages', aiMessageId);
        
        const aiMessage: MessageInput = {
          id: aiMessageId,
          content: aiResponse,
          userId: `ai-${currentCharacter}`,
          createdAt: serverTimestamp() as unknown as Timestamp,
          updatedAt: serverTimestamp() as unknown as Timestamp,
          reactions: {},
          isEdited: false,
          chatId: `ai-chat-${currentUser.uid}-${currentCharacter}`
        };

        await setDoc(aiMessageRef, aiMessage);

        // Add AI character to users record
        setUsers(prev => ({
          ...prev,
          [`ai-${currentCharacter}`]: {
            uid: `ai-${currentCharacter}`,
            displayName: character.name,
            photoURL: character.photoURL
          } as User
        }));
      } catch (error) {
        console.error('[useMessageOperations] Error generating AI response:', error);
      }
    }
  };

  return {
    sendMessage
  };
} 