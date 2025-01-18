import React, { useState } from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import CreateChannelModal from './CreateChannelModal';
import UserProfile from '../profile/UserProfile';
import { Message } from '../../types/channel';
import MessageList from './MessageList';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import ThreadView from './ThreadView';
import ChatSidebar from './ChatSidebar';

export default function ChatView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showUserProfile] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);

  const {
    currentChannel,
    currentDirectMessage,
    currentCharacter,
    searchMessages,
  } = useChannel();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMessages(searchQuery);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <ChatSidebar onCreateChannel={() => setShowCreateChannelModal(true)} />

      {/* Main Chat Area with Thread */}
      <div className="flex-1 flex">
        {/* Main Chat Column */}
        <div className="flex-1 flex flex-col bg-base-100">
          {/* Header */}
          <ChatHeader 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            handleSearch={handleSearch}
          />

          {/* Messages */}
          <MessageList 
            showReactionPicker={showReactionPicker}
            setShowReactionPicker={setShowReactionPicker}
            setSelectedThread={setSelectedThread}
          />

          {/* Message Input */}
          {!selectedThread && (currentChannel || currentDirectMessage || currentCharacter) && (
            <MessageInput
              isGeneratingAudio={false}
              setIsGeneratingAudio={() => {}}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
            />
          )}
        </div>

        {/* Thread Sidebar */}
        {selectedThread && (
          <div className="w-96 bg-base-200 flex flex-col border-l">
            <ThreadView
              selectedThread={selectedThread}
              onClose={() => setSelectedThread(null)}
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              isGeneratingAudio={false}
              setIsGeneratingAudio={() => {}}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateChannelModal && (
        <CreateChannelModal isOpen={true} onClose={() => setShowCreateChannelModal(false)} />
      )}
      {showUserProfile && (
        <UserProfile />
      )}
    </div>
  );
} 