import React, { useState, useEffect } from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useAuth } from '../../contexts/hooks/useAuth';
import { useToast } from '../../contexts/useToast';
import { usePresence } from '../../hooks/usePresence';
import { CharacterAIService } from '../../services/characterAI';
import { CHARACTERS } from '../../types/character';
import CreateChannelModal from './CreateChannelModal';
import UserProfile from '../profile/UserProfile';
import { Message } from '../../types/channel';
import { SearchResult } from '../../contexts/channel/types';
import { User } from '../../types';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { audioService } from '../../services/audioService';
import { AudioPlayer } from './AudioPlayer';

interface EmojiPickerResult {
  native: string;
  id: string;
  name: string;
  unified: string;
}

export default function ChatView() {
  const { 
    channels, 
    currentChannel, 
    selectChannel, 
    messages, 
    sendMessage, 
    users, 
    addReaction, 
    removeReaction, 
    uploadFile, 
    directMessages,
    currentDirectMessage,
    selectDirectMessage,
    sendDirectMessage,
    getAvailableUsers,
    searchMessages,
    currentCharacter,
    setCurrentCharacter
  } = useChannel();
  const { isUserOnline } = usePresence();
  const [newMessage, setNewMessage] = useState('');
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [isCreateDMModalOpen, setIsCreateDMModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showThreadEmojiPicker, setShowThreadEmojiPicker] = useState(false);
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [threadReply, setThreadReply] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [aiService] = useState(() => new CharacterAIService());
  const [audioPlayingMessageId, setAudioPlayingMessageId] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateDMModalOpen) {
      setIsLoadingUsers(true);
      getAvailableUsers()
        .then(users => {
          setAvailableUsers(users);
          setIsLoadingUsers(false);
        })
        .catch(() => {
          showToast('Failed to load users', 'error');
          setIsLoadingUsers(false);
        });
    }
  }, [isCreateDMModalOpen, getAvailableUsers, showToast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => {
          return await uploadFile(file);
        })
      );

      if (currentCharacter) {
        console.log('[ChatView] Sending message to AI character:', {
          character: CHARACTERS[currentCharacter],
          message: newMessage.trim()
        });
        
        if (!currentUser) {
          showToast('You must be logged in to send messages', 'error');
          return;
        }
        
        // Send user message
        await sendMessage(newMessage.trim(), attachments, undefined, {
          displayName: currentUser.displayName || 'User',
          photoURL: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}`,
          uid: currentUser.uid
        });
        
        // Get character and generate AI response
        const character = CHARACTERS[currentCharacter];
        try {
          // Show typing indicator
          showToast(`${character.name} is typing...`, 'info');
          
          console.log('[ChatView] Generating AI response');
          const response = await aiService.generateResponse(character, newMessage.trim());
          console.log('[ChatView] AI response generated:', response);
          
          if (response) {
            console.log('[ChatView] Sending AI response as message');
            // Send AI response
            await sendMessage(response, [], undefined, {
              displayName: character.name,
              photoURL: character.avatarUrl,
              uid: `ai-${character.id}`
            });
          }
        } catch (error) {
          console.error('[ChatView] Error generating AI response:', error);
          showToast('Failed to generate AI response', 'error');
        }
      } else if (currentDirectMessage && !currentChannel) {
        await sendDirectMessage(newMessage.trim(), attachments);
      } else if (currentChannel) {
        await sendMessage(newMessage.trim(), attachments);
      } else {
        showToast('No active channel or chat selected', 'error');
        return;
      }
      
      setNewMessage('');
      setSelectedFiles([]);
    } catch (err) {
      console.error('[ChatView] Error in handleSubmit:', err);
      showToast('Failed to send message', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleEmojiSelect = (emoji: EmojiPickerResult) => {
    setNewMessage(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchMessages(searchQuery);
      setSearchResults(results);
      setShowSearchModal(true);
    } catch {
      showToast('Failed to search messages', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleReactionSelect = async (messageId: string, emoji: EmojiPickerResult) => {
    await addReaction(messageId, emoji.native);
    setShowReactionPicker(null);
  };

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!threadReply.trim() && selectedFiles.length === 0) || !selectedThread) return;

    try {
      setIsUploading(true);
      const attachments = await Promise.all(
        selectedFiles.map(async (file) => {
          return await uploadFile(file);
        })
      );

      await sendMessage(threadReply.trim(), attachments, selectedThread.id);
      setThreadReply('');
      setSelectedFiles([]);
    } catch {
      showToast('Failed to send reply', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCharacterSelect = async (characterId: string) => {
    try {
      console.log('[ChatView] Character selected:', {
        characterId,
        character: CHARACTERS[characterId]
      });
      
      setCurrentCharacter(characterId);
      console.log('[ChatView] Current character set:', characterId);
      
      await aiService.loadCharacterDialogues(characterId);
      console.log('[ChatView] Character dialogues loaded');
      
      // Reset any channel selection
      if (currentChannel) {
        console.log('[ChatView] Resetting channel selection');
        await selectChannel('');
      }
      
      // Reset any direct message selection
      if (currentDirectMessage) {
        console.log('[ChatView] Resetting DM selection');
        await selectDirectMessage('');
      }

      console.log('[ChatView] Character chat ready');
    } catch (err) {
      console.error('[ChatView] Error in handleCharacterSelect:', err);
      showToast('Failed to load character dialogues', 'error');
    }
  };

  const handlePlayMessage = async (messageId: string, messageContent: string) => {
    try {
      if (!currentCharacter) {
        console.log('[ChatView] No character selected');
        return;
      }
      
      console.log('[ChatView] Playing message:', { 
        messageContent: messageContent.substring(0, 50), 
        currentCharacter,
        characterDetails: CHARACTERS[currentCharacter],
        characterExists: !!CHARACTERS[currentCharacter],
        availableCharacters: Object.keys(CHARACTERS)
      });
      
      setIsGeneratingAudio(messageId);
      const audioUrl = await audioService.generateSpeech(messageContent, currentCharacter);
      console.log('[ChatView] Audio URL received:', audioUrl);
      setAudioPlayingMessageId(messageId);
      setIsGeneratingAudio(null);
      audioService.playAudio(audioUrl);
    } catch (error) {
      console.error('[ChatView] Error playing message:', error);
      showToast('Failed to play message', 'error');
      setIsGeneratingAudio(null);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-64 bg-base-200 flex flex-col">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Channels</h2>
            <button
              onClick={() => setIsCreateChannelModalOpen(true)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              +
            </button>
          </div>
        
          <div className="space-y-1">
            {channels
              .filter(channel => 
                !channel.id.startsWith('ai-chat-') && 
                !channel.name.includes('AI Assistant') && 
                !channel.name.includes('Patrick Bateman') &&
                !channel.name.includes('Tyler Durden') &&
                !channel.name.includes('Bruce Wayne') &&
                !channel.name.includes('Bane') &&
                !channel.name.includes('Joker')
              )
              .map(channel => (
              <button
                key={channel.id}
                onClick={() => selectChannel(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  currentChannel?.id === channel.id 
                    ? 'bg-primary text-primary-content'
                    : 'hover:bg-base-300'
                }`}
              >
                # {channel.name}
              </button>
            ))}
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Your AI</h2>
            </div>

            <div className="space-y-1">
              {Object.values(CHARACTERS).map(character => (
                <button
                  key={character.id}
                  onClick={() => handleCharacterSelect(character.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    currentCharacter === character.id
                      ? 'bg-primary text-primary-content'
                      : 'hover:bg-base-300'
                  }`}
                >
                  <span className="text-2xl">{character.emoji}</span>
                  <span>{character.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Direct Messages</h2>
              <button
                onClick={() => setIsCreateDMModalOpen(true)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                +
              </button>
            </div>
          
            <div className="space-y-1">
              {directMessages.map(dm => {
                const otherUser = dm.participants.find(id => id !== currentUser?.uid);
                const user = users[otherUser || ''];
                return (
                  <button
                    key={dm.id}
                    onClick={() => selectDirectMessage(otherUser || '')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      currentDirectMessage?.id === dm.id 
                        ? 'bg-primary text-primary-content'
                        : 'hover:bg-base-300'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isUserOnline(otherUser || '') ? 'bg-success' : 'bg-base-content/20'}`} />
                    {user?.displayName || 'Unknown User'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <UserProfile />
      </div>

      {/* Main Chat Area with Thread */}
      <div className="flex-1 flex">
        {/* Main Chat Column */}
        <div className="flex-1 flex flex-col bg-base-100">
        {/* Header */}
          <div className="border-b border-base-300 p-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">
                {currentChannel ? (
                  `#${currentChannel.name}`
                ) : currentDirectMessage ? (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isUserOnline(currentDirectMessage.participants.find(id => id !== currentUser?.uid) || '') ? 'bg-success' : 'bg-base-content/20'}`} />
                    {users[currentDirectMessage.participants.find(id => id !== currentUser?.uid) || '']?.displayName}
                  </div>
                ) : currentCharacter ? (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{CHARACTERS[currentCharacter].emoji}</span>
                    {CHARACTERS[currentCharacter].name}
                  </div>
                ) : ''}
              </h1>
              {currentChannel?.description && (
                <p className="text-sm text-base-content/60">{currentChannel.description}</p>
              )}
              {currentCharacter && (
                <p className="text-sm text-base-content/60">
                  {CHARACTERS[currentCharacter].description || 'AI Character'}
                </p>
              )}
            </div>
            
            <div className="join">
              <input
                type="text"
                placeholder="Search messages..."
                className="input input-bordered join-item"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="btn join-item"
                onClick={handleSearch}
              >
                Search
              </button>
            </div>
          </div>

        {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-16rem)]">
            {!currentChannel && !currentDirectMessage && !currentCharacter ? (
              <div className="h-full flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold mb-2">Welcome to Tribe</h1>
                <p className="text-base-content/60">Select a Channel, DM, or Avatar</p>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`chat ${message.userId === currentUser?.uid ? 'chat-end' : 'chat-start'}`}>
                  <div className="chat-image avatar">
                    {message.userId.startsWith('ai-') && currentCharacter ? (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl bg-base-200">
                        <div className="flex items-center justify-center w-full h-full -mt-0.5">{CHARACTERS[currentCharacter].emoji}</div>
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
                  <div className="chat-bubble">{message.content}</div>
                  {message.userId.startsWith('ai-') && (
                    <div className="chat-footer opacity-50 hover:opacity-100 transition-opacity">
                      {isGeneratingAudio === message.id ? (
                        <div className="loading loading-spinner loading-xs"></div>
                      ) : audioPlayingMessageId === message.id ? (
                        <AudioPlayer 
                          audioUrl={audioService.getCurrentAudioUrl() || ''}
                          onClose={() => {
                            audioService.stopAudio();
                            setAudioPlayingMessageId(null);
                          }}
                        />
                      ) : (
                        <button 
                          className="btn btn-circle btn-ghost btn-xs" 
                          title="Play message"
                          onClick={() => handlePlayMessage(message.id, message.content)}
                        >
                          <span className="text-lg">▶️</span>
                        </button>
                      )}
                    </div>
                  )}
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
                </div>
              ))
            )}
          </div>

          {/* Message Input - Only show if we have an active channel, DM, or character and no thread is selected */}
          {!selectedThread && (currentChannel || currentDirectMessage || currentCharacter) && (
            <form onSubmit={handleSubmit} className="border-t border-base-300 px-2 py-3 bg-base-100">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="badge badge-primary gap-2">
                          {file.name}
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                            className="btn btn-ghost btn-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                </div>
              )}
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="textarea textarea-bordered w-full resize-none h-20 min-h-[5rem] py-2"
              />
                </div>
                <div className="flex gap-2">
                  <div className="dropdown dropdown-top dropdown-end relative">
                    <button 
                      type="button"
                      className="btn btn-circle btn-ghost"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      😊
                    </button>
                    {showEmojiPicker && (
                      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-base-100 rounded-lg shadow-xl">
                          <Picker
                            data={data}
                            onEmojiSelect={handleEmojiSelect}
                            theme="light"
                            previewPosition="top"
                            skinTonePosition="none"
              />
            </div>
                      </div>
                    )}
                  </div>
                  <label className="btn btn-circle btn-ghost">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    📎
                  </label>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isUploading || (!newMessage.trim() && selectedFiles.length === 0)}
            >
              {isUploading ? (
                      <span className="loading loading-spinner" />
              ) : (
                'Send'
              )}
            </button>
                </div>
              </div>
          </form>
          )}
        </div>

        {/* Thread Sidebar */}
        {selectedThread && (
          <div className="w-96 bg-base-200 flex flex-col border-l">
            <div className="p-4 border-b border-base-300 flex justify-between items-center">
              <h3 className="font-bold">Thread</h3>
              <button 
                onClick={() => setSelectedThread(null)}
                className="btn btn-ghost btn-sm btn-circle"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Parent Message */}
              <div className={`chat ${selectedThread.userId === currentUser?.uid ? 'chat-end' : 'chat-start'}`}>
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full cursor-pointer"
                       onClick={(e) => {
                         e.stopPropagation();
                         if (selectedThread.userId !== currentUser?.uid && !selectedThread.userId.startsWith('ai-')) {
                           selectDirectMessage(selectedThread.userId);
                         }
                       }}>
                    <img 
                      src={users[selectedThread.userId]?.photoURL || `https://ui-avatars.com/api/?name=${users[selectedThread.userId]?.displayName || 'Unknown'}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="chat-header">
                  {users[selectedThread.userId]?.displayName}
                  <time className="text-xs opacity-50 ml-2">
                    {new Date(selectedThread.createdAt).toLocaleTimeString()}
                  </time>
                </div>
                <div className="chat-bubble chat-bubble-primary">
                  {selectedThread.content}
                  {selectedThread.attachments?.map((attachment, index) => (
                    <div key={index} className="mt-2">
                      {attachment.type.startsWith('image/') ? (
                        <img src={attachment.url} alt={attachment.name} className="max-w-xs rounded-lg" />
                      ) : (
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="link link-primary">
                          {attachment.name}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <div className="chat-footer flex gap-1 mt-1">
                  <div className="opacity-50">
                    {Object.entries(selectedThread.reactions || {})
                      .filter(([, userList]) => (userList as string[]).length > 0)
                      .map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          if ((users as string[]).includes(currentUser?.uid)) {
                            removeReaction(selectedThread.id, emoji);
                          } else {
                            addReaction(selectedThread.id, emoji);
                          }
                        }}
                        className={`btn btn-xs ${(users as string[]).includes(currentUser?.uid) ? 'btn-primary' : 'btn-ghost'}`}
                      >
                        {emoji} {(users as string[]).length}
                      </button>
                    ))}
                  </div>
                  <div className="dropdown dropdown-top relative">
                    <button 
                      className="btn btn-xs btn-ghost opacity-50 hover:opacity-100"
                      onClick={() => {
                        if (showReactionPicker === selectedThread.id) {
                          setShowReactionPicker(null);
                        } else {
                          setShowReactionPicker(selectedThread.id);
                        }
                      }}
                    >
                      +
                    </button>
                    {showReactionPicker === selectedThread.id && (
                      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
                        <div className="bg-base-100 rounded-lg shadow-xl">
                          <Picker
                            data={data}
                            onEmojiSelect={(emoji: EmojiPickerResult) => handleReactionSelect(selectedThread.id, emoji)}
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

              {/* Thread Replies */}
              {messages
                .filter(m => m.threadId === selectedThread.id)
                .map(message => (
                  <div key={message.id} className={`chat ${message.userId === currentUser?.uid ? 'chat-end' : 'chat-start'}`}>
                    <div className="chat-image avatar">
                      <div className="w-10 rounded-full cursor-pointer"
                           onClick={(e) => {
                             e.stopPropagation();
                             if (message.userId !== currentUser?.uid && !message.userId.startsWith('ai-')) {
                               selectDirectMessage(message.userId);
                             }
                           }}>
                        <img 
                          src={users[message.userId]?.photoURL || `https://ui-avatars.com/api/?name=${users[message.userId]?.displayName || 'Unknown'}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="chat-header">
                      {users[message.userId]?.displayName}
                      <time className="text-xs opacity-50 ml-2">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </time>
                    </div>
                    <div className="chat-bubble">
                      {message.content}
                      {message.attachments?.map((attachment, index) => (
                        <div key={index} className="mt-2">
                          {attachment.type.startsWith('image/') ? (
                            <img src={attachment.url} alt={attachment.name} className="max-w-xs rounded-lg" />
                          ) : (
                            <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="link link-primary">
                              {attachment.name}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="chat-footer flex gap-1 mt-1">
                      <div className="opacity-50">
                        {Object.entries(message.reactions || {})
                          .filter(([, userList]) => (userList as string[]).length > 0)
                          .map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if ((users as string[]).includes(currentUser?.uid)) {
                                removeReaction(message.id, emoji);
                              } else {
                                addReaction(message.id, emoji);
                              }
                            }}
                            className={`btn btn-xs ${(users as string[]).includes(currentUser?.uid) ? 'btn-primary' : 'btn-ghost'}`}
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
            {/* Thread Reply Input */}
            <form onSubmit={handleSendThreadReply} className="border-t border-base-300 p-4 bg-base-100">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="badge badge-primary gap-2">
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                        className="btn btn-ghost btn-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <div className="relative flex items-end gap-2 bg-base-200 rounded-xl p-2">
                  <textarea
                    value={threadReply}
                    onChange={(e) => setThreadReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendThreadReply(e);
                      }
                    }}
                    placeholder="Reply to thread..."
                    className="textarea textarea-ghost flex-1 min-h-[2.5rem] max-h-[10rem] resize-none bg-transparent px-2 py-1"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowThreadEmojiPicker(!showThreadEmojiPicker)}
                      className="btn btn-ghost btn-sm btn-circle"
                    >
                      😊
                    </button>
                    <label className="btn btn-ghost btn-sm btn-circle">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      📎
                    </label>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={isUploading || (!threadReply.trim() && selectedFiles.length === 0)}
                    >
                      {isUploading ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        'Reply'
                      )}
                    </button>
                  </div>
                </div>
                {showThreadEmojiPicker && (
                  <div className="absolute bottom-16 right-0 z-50">
                    <div className="bg-base-100 rounded-lg shadow-xl p-1">
                      <div className="relative">
                        <button 
                          className="btn btn-ghost btn-xs btn-circle absolute top-1 right-1 z-10"
                          onClick={() => setShowThreadEmojiPicker(false)}
                        >
                          ×
                        </button>
                        <Picker
                          data={data}
                          onEmojiSelect={(emoji: EmojiPickerResult) => {
                            setThreadReply(prev => prev + emoji.native);
                            setShowThreadEmojiPicker(false);
                          }}
                          theme="light"
                          previewPosition="none"
                          skinTonePosition="none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}
        </div>

      {/* Modals */}
      {isCreateChannelModalOpen && (
        <CreateChannelModal
          isOpen={true}
          onClose={() => setIsCreateChannelModalOpen(false)}
        />
      )}

      {isCreateDMModalOpen && (
        <dialog open className="modal">
        <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Start a Conversation</h3>
            <div className="space-y-4">
          {isLoadingUsers ? (
            <div className="flex justify-center">
                  <span className="loading loading-spinner" />
            </div>
          ) : (
                availableUsers.map(user => (
                <button
                  key={user.uid}
                  onClick={() => {
                      selectDirectMessage(user.uid);
                    setIsCreateDMModalOpen(false);
                  }}
                    className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="text-left">
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-base-content/60">{user.email}</div>
                  </div>
                </button>
                ))
              )}
            </div>
          <div className="modal-action">
            <button
                onClick={() => setIsCreateDMModalOpen(false)}
              className="btn"
            >
              Close
            </button>
          </div>
        </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsCreateDMModalOpen(false)}>close</button>
          </form>
      </dialog>
      )}

      {showSearchModal && (
        <dialog open className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Search Results</h3>
          <div className="space-y-4">
              {isSearching ? (
                <div className="flex justify-center">
                  <span className="loading loading-spinner" />
                </div>
              ) : (
                searchResults.map(result => (
                  <button
                    key={result.message.id}
                    onClick={() => {
                      if (result.channel) {
                        selectChannel(result.channel.id);
                      } else if (result.directMessage) {
                        const otherUserId = result.directMessage.participants.find(id => id !== currentUser?.uid);
                        if (otherUserId) {
                          selectDirectMessage(otherUserId);
                        }
                      }
                      // If the message is a thread reply, open the thread
                      if (result.message.threadId) {
                        const parentMessage = messages.find(m => m.id === result.message.threadId);
                        if (parentMessage) {
                          setSelectedThread(parentMessage);
                        }
                      } else {
                        // If the message is a parent message with thread replies, open its thread
                        const hasThreadReplies = messages.some(m => m.threadId === result.message.id);
                        if (hasThreadReplies) {
                          setSelectedThread(result.message);
                        }
                      }
                      setShowSearchModal(false);
                    }}
                    className="w-full text-left p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={users[result.message.userId]?.photoURL || `https://ui-avatars.com/api/?name=${users[result.message.userId]?.displayName}`}
                        alt={users[result.message.userId]?.displayName}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="font-medium">{users[result.message.userId]?.displayName}</span>
                      <span className="text-sm text-base-content/60">
                        {new Date(result.message.createdAt).toLocaleString()}
                      </span>
                      {result.channel && (
                        <span className="badge badge-sm">#{result.channel.name}</span>
                      )}
                      {result.directMessage && (
                        <span className="badge badge-sm">DM</span>
                      )}
                      {result.message.threadId && (
                        <span className="badge badge-sm">Thread Reply</span>
                      )}
                    </div>
                    <p>{result.message.content}</p>
                    {result.message.attachments && result.message.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {result.message.attachments.map((attachment, index) => (
                          <div key={index} className="badge badge-neutral gap-2">
                            {attachment.type.startsWith('image/') ? '📷' : '📎'} {attachment.name}
                </div>
            ))}
                      </div>
                    )}
                  </button>
                ))
              )}
          </div>
          <div className="modal-action">
            <button
                onClick={() => setShowSearchModal(false)}
              className="btn"
            >
              Close
            </button>
          </div>
        </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowSearchModal(false)}>close</button>
          </form>
      </dialog>
      )}
    </div>
  );
} 