import React, { useState, useRef, FormEvent, useMemo } from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useAuth } from '../../contexts/hooks/useAuth';
import { useToast } from '../../contexts/useToast';
import { Character } from '../../types/character';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { CharacterAIService } from '../../services/characterAI';

interface MessageInputProps {
  isGeneratingAudio: boolean;
  setIsGeneratingAudio: (value: boolean) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (value: boolean) => void;
  parentMessageId?: string;
}

interface EmojiPickerResult {
  native: string;
}

export default function MessageInput({
  isGeneratingAudio,
  setIsGeneratingAudio,
  showEmojiPicker,
  setShowEmojiPicker,
  parentMessageId
}: MessageInputProps) {
  const { currentUser } = useAuth();
  const { currentChannel, currentDirectMessage, currentCharacter, sendMessage } = useChannel();
  const { showToast } = useToast();
  const characterService = useMemo(() => new CharacterAIService(), []);
  
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      showToast('You must be logged in to send messages', 'error');
      return;
    }

    if (!message.trim() && !selectedFile) {
      return;
    }

    try {
      if (parentMessageId) {
        await sendMessage(message, parentMessageId);
      } else {
        await sendMessage(message);
      }
      
      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('File size must be less than 5MB', 'error');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleEmojiSelect = (emoji: EmojiPickerResult) => {
    setMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleGenerateAudio = async () => {
    if (!message.trim() || !currentCharacter) return;
    
    setIsGeneratingAudio(true);
    try {
      const characterId = typeof currentCharacter === 'string' ? currentCharacter : (currentCharacter as Character).id;
      const audioUrl = await characterService.generateSpeech(message, characterId);
      if (!audioUrl) throw new Error('Failed to generate audio');
      
      const audio = new Audio(audioUrl);
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(audio.src);
    } catch (error) {
      console.error('Error generating audio:', error);
      showToast('Failed to generate audio', 'error');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  if (!currentChannel && !currentDirectMessage && !currentCharacter) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-base-300 px-2 py-3 bg-base-100">
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col gap-2">
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm">
              <span>{selectedFile.name}</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setSelectedFile(null)}
              >
                Remove
              </button>
            </div>
          )}
          
          <div className="join w-full">
            <input
              type="text"
              placeholder="Type a message..."
              className="input input-bordered join-item flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            
            <div className="join-item flex">
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,audio/*"
              />
              
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
              >
                📎
              </button>
              
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                😊
              </button>
              
              {currentCharacter && (
                <button
                  type="button"
                  className={`btn btn-ghost ${isGeneratingAudio ? 'loading' : ''}`}
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio || !message.trim()}
                >
                  🔊
                </button>
              )}
            </div>
          </div>
        </div>
        
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!message.trim() && !selectedFile}
        >
          Send
        </button>
      </div>

      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4">
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="dark"
          />
        </div>
      )}
    </form>
  );
} 