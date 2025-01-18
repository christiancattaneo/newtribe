import React, { useState } from 'react';
import { useChannel } from '../../contexts/channel/useChannel';
import { useAuth } from '../../contexts/hooks/useAuth';
import { CHARACTERS } from '../../types/character';
import { Channel, DirectMessage } from '../../types/channel';
import { User } from '../../types';
import UserSelectionDialog from './UserSelectionDialog';
import UserProfile from '../profile/UserProfile';

interface ChatSidebarProps {
  onCreateChannel: () => void;
}

export default function ChatSidebar({ onCreateChannel }: ChatSidebarProps) {
  const { 
    channels, 
    directMessages, 
    users, 
    currentChannel,
    currentDirectMessage,
    currentCharacter,
    selectChannel,
    selectDirectMessage,
    setCurrentCharacter,
    getAvailableUsers,
    deleteChannel,
    deleteDirectMessage
  } = useChannel();
  const { currentUser } = useAuth();
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  const [hoveredDMId, setHoveredDMId] = useState<string | null>(null);

  const handleCreateDM = async () => {
    const users = await getAvailableUsers();
    setAvailableUsers(users);
    setShowUserDialog(true);
  };

  const handleCharacterSelect = async (characterId: string) => {
    if (currentCharacter === characterId) {
      await setCurrentCharacter(null);
    } else {
      await setCurrentCharacter(characterId);
    }
  };

  return (
    <div className="w-64 bg-base-200 flex flex-col h-full">
      {/* Channels Section */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">Channels</h2>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={onCreateChannel}
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          {channels.map((channel: Channel) => (
            <div
              key={channel.id}
              className="relative group"
              onMouseEnter={() => setHoveredChannelId(channel.id)}
              onMouseLeave={() => setHoveredChannelId(null)}
            >
              <button
                className={`w-full text-left px-2 py-1 rounded hover:bg-base-300 ${
                  currentChannel?.id === channel.id ? 'bg-base-300' : ''
                }`}
                onClick={() => selectChannel(channel.id)}
              >
                # {channel.name}
              </button>
              {hoveredChannelId === channel.id && channel.createdBy === currentUser?.uid && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChannel(channel.id);
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Direct Messages Section */}
      <div className="p-4 border-t border-base-300">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">Direct Messages</h2>
          <button 
            className="btn btn-ghost btn-sm"
            onClick={handleCreateDM}
          >
            +
          </button>
        </div>
        <div className="space-y-1">
          {directMessages.map((dm: DirectMessage) => {
            const otherUser = users[dm.participants.find(id => id !== currentUser?.uid) || ''];
            return (
              <div
                key={dm.id}
                className="relative group"
                onMouseEnter={() => setHoveredDMId(dm.id)}
                onMouseLeave={() => setHoveredDMId(null)}
              >
                <button
                  className={`w-full text-left px-2 py-1 rounded hover:bg-base-300 ${
                    currentDirectMessage?.id === dm.id ? 'bg-base-300' : ''
                  }`}
                  onClick={() => selectDirectMessage(otherUser.uid)}
                >
                  @ {otherUser?.displayName || 'Unknown User'}
                </button>
                {hoveredDMId === dm.id && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDirectMessage(dm.id);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Characters Section */}
      <div className="p-4 border-t border-base-300">
        <h2 className="text-lg font-bold mb-2">AI Characters</h2>
        <div className="space-y-1">
          {Object.entries(CHARACTERS).map(([id, character]) => (
            <button
              key={id}
              className={`w-full text-left px-2 py-1 rounded hover:bg-base-300 flex items-center gap-2 ${
                currentCharacter === id ? 'bg-base-300' : ''
              }`}
              onClick={() => handleCharacterSelect(id)}
            >
              <span className="text-2xl">{character.emoji}</span>
              <span>{character.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User Selection Dialog */}
      <UserSelectionDialog
        isOpen={showUserDialog}
        onClose={() => setShowUserDialog(false)}
        users={availableUsers}
        onSelectUser={selectDirectMessage}
      />

      {/* User Profile Section */}
      <div className="mt-auto">
        <UserProfile />
      </div>
    </div>
  );
} 