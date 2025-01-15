import { useState } from 'react';
import { useAuth } from '../../contexts/hooks/useAuth';
import { usePresence, UserStatusType } from '../../hooks/usePresence';
import { useToast } from '../../contexts/useToast';
import ProfileSettings from './ProfileSettings';

export default function UserProfile() {
  const { currentUser, signOut } = useAuth();
  const { getUserStatus, setUserStatus } = usePresence();
  const { showToast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!currentUser) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully', 'success');
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Failed to sign out', 'error');
    }
  };

  const handleStatusChange = async (status: UserStatusType) => {
    try {
      await setUserStatus(status);
      setIsDropdownOpen(false);
      showToast(`Status updated to ${status}`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const currentStatus = getUserStatus(currentUser.uid);

  const getStatusColor = (status: UserStatusType) => {
    switch (status) {
      case 'online':
        return 'badge-success';
      case 'away':
        return 'badge-warning';
      case 'dnd':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  const getStatusLabel = (status: UserStatusType) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'dnd':
        return 'Do Not Disturb';
      default:
        return 'Offline';
    }
  };

  return (
    <>
      <div className="p-4 border-t border-base-300 bg-base-200">
        <div className="dropdown dropdown-top w-full">
          <div 
            role="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 w-full cursor-pointer"
          >
            {/* Avatar with status indicator */}
            <div className="avatar relative">
              <div className="w-12 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img 
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}`}
                  alt={currentUser.displayName || 'User avatar'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base-100 ${getStatusColor(currentStatus)}`} />
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {currentUser.displayName || 'Anonymous User'}
              </div>
              <div className="text-sm text-base-content/60 truncate flex items-center gap-2">
                <div className={`badge badge-xs ${getStatusColor(currentStatus)}`} />
                {getStatusLabel(currentStatus)}
              </div>
            </div>

            {/* Dropdown toggle */}
            <button className="btn btn-ghost btn-sm btn-circle">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Dropdown menu */}
          <ul className={`dropdown-content menu menu-sm bg-base-200 w-full rounded-box shadow-xl ${isDropdownOpen ? '' : 'hidden'}`}>
            {/* Status Section */}
            <li className="menu-title">
              <span>Set Status</span>
            </li>
            <li>
              <button 
                className={`gap-2 ${currentStatus === 'online' ? 'active' : ''}`}
                onClick={() => handleStatusChange('online')}
              >
                <div className="badge badge-success badge-xs"></div>
                Online
              </button>
            </li>
            <li>
              <button 
                className={`gap-2 ${currentStatus === 'away' ? 'active' : ''}`}
                onClick={() => handleStatusChange('away')}
              >
                <div className="badge badge-warning badge-xs"></div>
                Away
              </button>
            </li>
            <li>
              <button 
                className={`gap-2 ${currentStatus === 'dnd' ? 'active' : ''}`}
                onClick={() => handleStatusChange('dnd')}
              >
                <div className="badge badge-error badge-xs"></div>
                Do Not Disturb
              </button>
            </li>
            
            <li className="menu-title">
              <span>Options</span>
            </li>
            <li>
              <button onClick={() => {
                setIsDropdownOpen(false);
                setIsSettingsOpen(true);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Profile Settings
              </button>
            </li>
            <li>
              <button onClick={handleSignOut} className="text-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
} 