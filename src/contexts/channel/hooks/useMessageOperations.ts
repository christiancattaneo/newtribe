import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { Message, Channel, DirectMessage } from '../../../types/channel';
import { User } from '../../../types';
import { v4 as uuidv4 } from 'uuid';
import { Dispatch, SetStateAction } from 'react';
import { CharacterAIService } from '../../../services/characterAI';
import { CHARACTERS } from '../../../types/character';

interface UseMessageOperationsProps {
  currentUser: User | null;
  currentChannel: Channel | null;
  currentDirectMessage: DirectMessage | null;
  currentCharacter: string | null;
  setUsers: Dispatch<SetStateAction<Record<string, User>>>;
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

  const sendMessage = async (content: string, attachments: { url: string; type: string; name: string }[] = [], parentMessageId?: string, overrideUser?: { displayName: string; photoURL: string; uid: string }): Promise<void> => {
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
      isEdited: false,
      attachments
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

        // Generate message ID first
        const aiMessageId = uuidv4();

        // Generate speech for the AI response
        console.log('[useMessageOperations] Generating speech for AI response');
        const audioUrl = await characterService.generateSpeech(aiResponse, character.id);
        
        // Upload audio to Firebase Storage
        const audioBlob = await fetch(audioUrl).then(r => r.blob());
        const audioRef = ref(storage, `audio/${character.id}/${aiMessageId}.mp3`);
        await uploadBytes(audioRef, audioBlob);
        const storedAudioUrl = await getDownloadURL(audioRef);

        // Send AI response as a new message
        const aiMessageRef = doc(db, 'messages', aiMessageId);
        
        const aiMessage: MessageInput = {
          id: aiMessageId,
          content: aiResponse,
          userId: `ai-${currentCharacter}`,
          createdAt: serverTimestamp() as unknown as Timestamp,
          updatedAt: serverTimestamp() as unknown as Timestamp,
          reactions: {},
          isEdited: false,
          attachments: [{
            url: storedAudioUrl,
            type: 'audio/mp3',
            name: `${character.name}_${aiMessageId}.mp3`
          }],
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

  const uploadFile = async (file: File) => {
    const storageRef = ref(storage, `uploads/${file.name}-${Date.now()}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return {
      url,
      type: file.type,
      name: file.name
    };
  };

  return {
    sendMessage,
    uploadFile
  };
} 