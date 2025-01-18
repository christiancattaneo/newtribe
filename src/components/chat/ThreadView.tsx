import React, { useState } from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useThread } from '../../contexts/channel/hooks/useThread';
import { Message } from '../../types/channel';
import { CHARACTERS } from '../../types/character';
import MessageInput from './MessageInput';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useAuth } from '../../contexts/hooks/useAuth';

interface EmojiPickerResult {
  native: string;
}

interface ThreadViewProps {
  selectedThread: Message;
  onClose: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  isGeneratingAudio: boolean;
  setIsGeneratingAudio: (value: boolean) => void;
}

export default function ThreadView({
  selectedThread,
  onClose,
  showEmojiPicker,
  setShowEmojiPicker,
  isGeneratingAudio,
  setIsGeneratingAudio
}: ThreadViewProps) {
  const { users, currentCharacter, addReaction, removeReaction } = useChannel();
  const { currentUser } = useAuth();
  const { getThreadMessages } = useThread();
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const threadMessages = getThreadMessages(selectedThread.id);

  const handleReactionSelect = async (messageId: string, emoji: EmojiPickerResult) => {
    await addReaction(messageId, emoji.native);
    setShowReactionPicker(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="p-4 border-b border-base-300 flex justify-between items-center">
        <h3 className="text-lg font-bold">Thread</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
      </div>

      {/* Original Message */}
      <div className="p-4 border-b border-base-300">
        <div className={`chat chat-start`}>
          <div className="chat-image avatar">
            {selectedThread.userId.startsWith('ai-') && currentCharacter ? (
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-base-200">
                <div className="flex items-center justify-center w-full h-full -mt-0.5">
                  {CHARACTERS[currentCharacter].emoji}
                </div>
              </div>
            ) : (
              <div className="w-10 rounded-full">
                <img 
                  src={users[selectedThread.userId]?.photoURL || `https://ui-avatars.com/api/?name=${users[selectedThread.userId]?.displayName || 'User'}`}
                  alt={users[selectedThread.userId]?.displayName || 'User'} 
                />
              </div>
            )}
          </div>
          <div className="chat-header">
            {selectedThread.userId.startsWith('ai-') && currentCharacter 
              ? CHARACTERS[currentCharacter].name
              : users[selectedThread.userId]?.displayName || 'User'}
            <time className="text-xs opacity-50 ml-2">
              {new Date(selectedThread.createdAt).toLocaleTimeString()}
            </time>
          </div>
          <div className="chat-bubble">{selectedThread.content}</div>
          {selectedThread.attachments && selectedThread.attachments.length > 0 && (
            <div className="chat-attachments mt-2 space-y-2">
              {selectedThread.attachments.map((attachment, index) => (
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
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {threadMessages.map((message) => (
          <div key={message.id} className={`chat chat-start`}>
            <div className="chat-image avatar">
              {message.userId.startsWith('ai-') && currentCharacter ? (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-base-200">
                  <div className="flex items-center justify-center w-full h-full -mt-0.5">
                    {CHARACTERS[currentCharacter].emoji}
                  </div>
                </div>
              ) : (
                <div className="w-10 rounded-full">
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
            <div className="chat-bubble">{message.content}</div>
            {message.attachments && message.attachments.length > 0 && (
              <div className="chat-attachments mt-2 space-y-2">
                {message.attachments.map((attachment, index) => (
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
            <div className="chat-footer flex gap-1 mt-1">
              <div className="opacity-50">
                {Object.entries(message.reactions || {})
                  .filter(([, userList]) => (userList as string[]).length > 0)
                  .map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      if (!currentUser) return;
                      if ((users as string[]).includes(currentUser.uid)) {
                        removeReaction(message.id, emoji);
                      } else {
                        addReaction(message.id, emoji);
                      }
                    }}
                    className={`btn btn-xs ${currentUser && (users as string[]).includes(currentUser.uid) ? 'btn-primary' : 'btn-ghost'}`}
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
            </div>
          </div>
        ))}
      </div>

      {/* Thread Input */}
      <div className="border-t border-base-300">
        <MessageInput
          isGeneratingAudio={isGeneratingAudio}
          setIsGeneratingAudio={setIsGeneratingAudio}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          parentMessageId={selectedThread.id}
        />
      </div>
    </div>
  );
} 