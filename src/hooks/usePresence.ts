import { useEffect, useState } from 'react';
import { ref, onDisconnect, set, onValue, serverTimestamp } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { useAuth } from '../contexts/hooks/useAuth';

export type UserStatusType = 'online' | 'away' | 'dnd' | 'offline';

interface UserStatus {
  state: UserStatusType;
  lastSeen: number | { seconds: number } | { _seconds: number };
  customStatus?: string;
}

export function usePresence() {
  const { currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Record<string, UserStatusType>>({});
  const [lastSeenTimestamps, setLastSeenTimestamps] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUser) return;

    console.log('[usePresence] Setting up presence for user:', currentUser.uid);
    
    // Reference to the current user's presence
    const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    // When the client's connection state changes
    const unsubConnected = onValue(connectedRef, (snapshot) => {
      console.log('[usePresence] Connection state changed:', snapshot.val());
      if (snapshot.val() === false) {
        return;
      }

      // When this device disconnects, remove it
      onDisconnect(userStatusRef)
        .set({
          state: 'offline',
          lastSeen: serverTimestamp(),
        })
        .then(() => {
          // When this device connects, update the status and lastSeen
          set(userStatusRef, {
            state: 'online',
            lastSeen: serverTimestamp(),
          });
        });
    });

    // Set initial online status when component mounts
    console.log('[usePresence] Setting initial online status');
    set(userStatusRef, {
      state: 'online',
      lastSeen: serverTimestamp(),
    }).then(() => {
      console.log('[usePresence] Successfully wrote initial online status');
    }).catch(error => {
      console.error('[usePresence] Failed to write initial status:', error);
    });

    // Listen to all users' statuses
    const allStatusRef = ref(rtdb, '/status');
    const unsubStatus = onValue(allStatusRef, (snapshot) => {
      console.log('[usePresence] Status snapshot exists:', snapshot.exists());
      console.log('[usePresence] Status snapshot key:', snapshot.key);
      
      const rawData = snapshot.val();
      console.log('[usePresence] Raw status data:', rawData);
      
      const statuses: Record<string, UserStatusType> = {};
      const timestamps: Record<string, number> = {};
      
      snapshot.forEach((child) => {
        const userId = child.key;
        const statusData = child.val() as UserStatus;
        if (!userId) return;
        
        console.log('[usePresence] Processing status for user:', userId, statusData);
        statuses[userId] = statusData.state;
        
        if (statusData.lastSeen) {
          console.log('[usePresence] Raw lastSeen:', statusData.lastSeen);
          
          if (typeof statusData.lastSeen === 'object' && '_seconds' in statusData.lastSeen) {
            timestamps[userId] = statusData.lastSeen._seconds * 1000;
          } else if (typeof statusData.lastSeen === 'object' && 'seconds' in statusData.lastSeen) {
            timestamps[userId] = statusData.lastSeen.seconds * 1000;
          } else if (typeof statusData.lastSeen === 'number') {
            timestamps[userId] = statusData.lastSeen;
          }
          console.log('[usePresence] Processed timestamp for', userId, new Date(timestamps[userId]).toLocaleString());
        }
      });
      
      console.log('[usePresence] Final maps:', { statuses, timestamps });
      setOnlineUsers(statuses);
      setLastSeenTimestamps(timestamps);
    });

    return () => {
      console.log('[usePresence] Cleaning up presence');
      unsubConnected();
      unsubStatus();
      set(userStatusRef, {
        state: 'offline',
        lastSeen: serverTimestamp(),
      }).then(() => {
        console.log('[usePresence] Successfully wrote offline status on cleanup');
      }).catch(error => {
        console.error('[usePresence] Failed to write offline status:', error);
      });
    };
  }, [currentUser]);

  const getUserStatus = (userId: string): UserStatusType => {
    return onlineUsers[userId] || 'offline';
  };

  const isUserOnline = (userId: string): boolean => {
    const status = getUserStatus(userId);
    return status !== 'offline';
  };

  const getLastSeen = (userId: string) => {
    if (isUserOnline(userId)) {
      return Date.now();
    }
    
    const timestamp = lastSeenTimestamps[userId];
    console.log('[usePresence] Getting last seen for user:', userId, {
      timestamp,
      hasTimestamp: !!timestamp,
      formattedDate: timestamp ? new Date(timestamp).toLocaleString() : 'none'
    });
    
    if (!timestamp) {
      console.log('[usePresence] No timestamp found for user:', userId);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(12, 0, 0, 0);
      return yesterday.getTime();
    }
    
    return timestamp;
  };

  const setUserStatus = async (status: UserStatusType) => {
    if (!currentUser) return;

    const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
    await set(userStatusRef, {
      state: status,
      lastSeen: serverTimestamp(),
    });
  };

  return { isUserOnline, getLastSeen, getUserStatus, setUserStatus };
} 