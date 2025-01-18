import React from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useAuth } from '../../contexts/hooks/useAuth';
import { usePresence } from '../../hooks/usePresence';
import { CHARACTERS } from '../../types/character';

interface ChatHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
}

export default function ChatHeader({
  searchQuery,
  setSearchQuery,
  handleSearch
}: ChatHeaderProps) {
  const { 
    currentChannel,
    currentCharacter,
    currentDirectMessage,
    users
  } = useChannel();
  const { currentUser } = useAuth();
  const { isUserOnline, getUserStatus, getLastSeen } = usePresence();

  const getStatusDisplay = (userId: string) => {
    const status = getUserStatus(userId);
    const lastSeen = getLastSeen(userId);
    const timeAgo = Math.floor((Date.now() - lastSeen) / 1000 / 60); // minutes

    if (status === 'online') return 'Active now';
    if (status === 'away') return 'Away';
    if (status === 'dnd') return 'Do not disturb';
    
    if (timeAgo < 60) return `Last seen ${timeAgo}m ago`;
    if (timeAgo < 1440) return `Last seen ${Math.floor(timeAgo / 60)}h ago`;
    return `Last seen ${Math.floor(timeAgo / 1440)}d ago`;
  };

  const renderChannelHeader = () => (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">#{currentChannel?.name}</span>
      </div>
      {currentChannel?.description && (
        <p className="text-sm text-base-content/60 mt-1">
          {currentChannel.description}
        </p>
      )}
    </div>
  );

  const renderDMHeader = () => {
    const otherUserId = currentDirectMessage?.participants.find(id => id !== currentUser?.uid) || '';
    const otherUser = users[otherUserId];
    
    return (
      <div>
        <div className="flex items-center gap-2">
          <div className="avatar">
            <div className="w-10 rounded-full relative">
              <img 
                src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${otherUser?.displayName || 'User'}`}
                alt={otherUser?.displayName || 'User avatar'}
              />
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base-100 ${
                isUserOnline(otherUserId) ? 'bg-success' : 'bg-base-content/20'
              }`} />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold">
              {otherUser?.displayName || 'Unknown User'}
            </div>
            <div className="text-sm text-base-content/60">
              {getStatusDisplay(otherUserId)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAICharacterHeader = () => (
    <div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-base-200 flex items-center justify-center text-2xl">
          {CHARACTERS[currentCharacter || ''].emoji}
        </div>
        <div>
          <div className="text-xl font-bold">
            {CHARACTERS[currentCharacter || ''].name}
          </div>
          <div className="text-sm text-base-content/60">
            {CHARACTERS[currentCharacter || ''].description || 'AI Character'}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="border-b border-base-300 p-4 flex justify-between items-center">
      <div>
        {currentChannel ? renderChannelHeader() 
          : currentDirectMessage ? renderDMHeader()
          : currentCharacter ? renderAICharacterHeader()
          : null}
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
  );
} 