import React from 'react';
import { User } from '../../types';

interface UserSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSelectUser: (userId: string) => void;
}

export default function UserSelectionDialog({ 
  isOpen, 
  onClose, 
  users,
  onSelectUser 
}: UserSelectionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Start a Direct Message</h3>
        <div className="space-y-2">
          {users.map(user => (
            <button
              key={user.uid}
              className="w-full text-left px-4 py-2 rounded hover:bg-base-300 flex items-center gap-3"
              onClick={() => {
                onSelectUser(user.uid);
                onClose();
              }}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                  alt={user.displayName} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-medium">{user.displayName}</div>
                {user.email && (
                  <div className="text-sm text-base-content/60">{user.email}</div>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}>
        <button className="cursor-default">close</button>
      </div>
    </div>
  );
} 