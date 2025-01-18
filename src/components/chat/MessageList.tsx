import React from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useThread } from '../../contexts/channel/hooks/useThread';
import { useAuth } from '../../contexts/hooks/useAuth';
import { Message } from '../../types/channel';
import { CHARACTERS } from '../../types/character';
import { CharacterAIService } from '../../services/characterAI';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerResult {
  native: string;
  id: string;
  name: string;
  unified: string;
}

interface MessageListProps {
  showReactionPicker: string | null;
  setShowReactionPicker: (messageId: string | null) => void;
  setSelectedThread: (message: Message | null) => void;
}

export default function MessageList({
  showReactionPicker,
  setShowReactionPicker,
  setSelectedThread
}: MessageListProps) {
  const { 
    currentChannel,
    currentCharacter,
    currentDirectMessage,
    users,
    addReaction,
    removeReaction,
    selectDirectMessage
  } = useChannel();
  const { getThreadRepliesCount, getMainMessages } = useThread();
  const { currentUser } = useAuth();
  const characterService = new CharacterAIService();
  const [isGeneratingAudio, setIsGeneratingAudio] = React.useState<string | null>(null);

  const messages = getMainMessages();

  const handleReactionSelect = async (messageId: string, emoji: EmojiPickerResult) => {
    await addReaction(messageId, emoji.native);
    setShowReactionPicker(null);
  };

  const handleGenerateAudio = async (message: Message) => {
    if (!currentCharacter || isGeneratingAudio) return;
    
    setIsGeneratingAudio(message.id);
    try {
      const audioUrl = await characterService.generateSpeech(message.content, currentCharacter);
      if (!audioUrl) throw new Error('Failed to generate audio');
      
      // Extract base64 data from data URL
      const base64Data = audioUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/mp3' });
      
      // Play the audio directly from the blob
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Error generating audio:', error);
    } finally {
      setIsGeneratingAudio(null);
    }
  };

  if (!currentChannel && !currentDirectMessage && !currentCharacter) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-2">Welcome to Tribe</h1>
        <p className="text-base-content/60">Select a Channel, DM, or Avatar</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-16rem)]">
      {messages.map((message) => (
        <div key={message.id} className={`chat ${message.userId === currentUser?.uid ? 'chat-end' : 'chat-start'}`}>
          <div className="chat-image avatar">
            {message.userId.startsWith('ai-') && currentCharacter ? (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-base-200">
                <div className="flex items-center justify-center w-full h-full">
                  {CHARACTERS[currentCharacter].emoji}
                </div>
              </div>
            ) : (
              <div className="w-10 rounded-full cursor-pointer" 
                   onClick={(e) => {
                     e.stopPropagation();
                     if (message.userId !== currentUser?.uid && !message.userId.startsWith('ai-')) {
                       selectDirectMessage(message.userId);
                     }
                   }}>
                <img 
                  src={users[message.userId]?.photoURL || `https://ui-avatars.com/api/?name=${users[message.userId]?.displayName || 'User'}`}
                  alt={users[message.userId]?.displayName || 'User'} 
                />
              </div>
            )}
          </div>
          <div className="chat-header">
            {message.userId.startsWith('ai-') && currentCharacter 
              ? CHARACTERS[currentCharacter].name
              : users[message.userId]?.displayName || 'User'}
            <time className="text-xs opacity-50 ml-2">
              {new Date(message.createdAt).toLocaleTimeString()}
            </time>
          </div>
          <div className="chat-bubble">
            {message.content}
          </div>
          {currentCharacter && message.userId.startsWith('ai-') && (
            <div className="chat-footer flex items-center gap-2 mt-2">
              {isGeneratingAudio === message.id ? (
                <button 
                  className="btn btn-sm btn-ghost loading"
                  disabled
                >
                  Generating...
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => handleGenerateAudio(message)}
                  disabled={isGeneratingAudio !== null}
                >
                  🔊 Generate Speech
                </button>
              )}
            </div>
          )}
          {/* Only show reactions and threads for non-AI chats */}
          {!currentCharacter && (
            <div className="chat-footer flex gap-1 mt-1">
              <div className="opacity-50">
                {Object.entries(message.reactions || {})
                  .filter(([, userList]) => (userList as string[]).length > 0)
                  .map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (!currentUser?.uid) return;
                      if ((users as string[]).includes(currentUser.uid)) {
                        removeReaction(message.id, emoji);
                      } else {
                        addReaction(message.id, emoji);
                      }
                    }}
                    className={`btn btn-xs ${!currentUser?.uid ? 'btn-ghost' : (users as string[]).includes(currentUser.uid) ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {emoji} {(users as string[]).length}
                  </button>
                ))}
              </div>
              <div className="dropdown dropdown-top relative">
                <button 
                  className="btn btn-xs btn-ghost opacity-50 hover:opacity-100"
                  onClick={() => {
                    if (showReactionPicker === message.id) {
                      setShowReactionPicker(null);
                    } else {
                      setShowReactionPicker(message.id);
                    }
                  }}
                >
                  +
                </button>
                {showReactionPicker === message.id && (
                  <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-base-100 rounded-lg shadow-xl">
                      <Picker
                        data={data}
                        onEmojiSelect={(emoji: EmojiPickerResult) => handleReactionSelect(message.id, emoji)}
                        theme="light"
                        previewPosition="top"
                        skinTonePosition="none"
                      />
                    </div>
                  </div>
                )}
              </div>
              <button
                className="btn btn-xs btn-ghost opacity-50 hover:opacity-100"
                onClick={() => setSelectedThread(message)}
              >
                💬 {getThreadRepliesCount(message.id) > 0 ? getThreadRepliesCount(message.id) : ''}
              </button>
            </div>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className="chat-attachments mt-2 space-y-2">
              {message.attachments
                .filter(attachment => !attachment.type.startsWith('audio/'))
                .map((attachment, index) => (
                <div key={index}>
                  {attachment.type.startsWith('image/') ? (
                    <img 
                      src={attachment.url} 
                      alt="attachment" 
                      className="max-w-sm rounded-lg shadow-lg"
                    />
                  ) : (
                    <a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="link link-primary"
                    >
                      {attachment.name}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 