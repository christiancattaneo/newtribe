import { useState, useCallback } from 'react';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { User } from '../../../types';

interface UseUsersProps {
  currentUser: User | null;
}

export function useUsers({ currentUser }: UseUsersProps) {
  const [users, setUsers] = useState<Record<string, User>>({});

  const fetchUserData = useCallback(async (userId: string) => {
    if (!users[userId]) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUsers(prev => ({
            ...prev,
            [userId]: { uid: userDoc.id, ...userDoc.data() } as User
          }));
        }
      } catch (error) {
        console.error('[useUsers] Error fetching user:', error);
      }
    }
  }, [users]);

  const fetchMessageUsers = useCallback(async (userIds: Set<string>) => {
    const userPromises = Array.from(userIds).map(async (userId) => {
      if (!users[userId]) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUsers(prev => ({
            ...prev,
            [userId]: { uid: userDoc.id, ...userDoc.data() } as User
          }));
        }
      }
    });
    return Promise.all(userPromises);
  }, [users]);

  const getAvailableUsers = useCallback(async () => {
    console.log('[useUsers] Starting getAvailableUsers');
    if (!currentUser) {
      console.log('[useUsers] No current user, cannot fetch users');
      return [];
    }

    try {
      // Get all users from the database
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef);
      const usersSnapshot = await getDocs(usersQuery);
      
      if (usersSnapshot.empty) {
        console.log('[useUsers] No users found in the database!');
        return [];
      }

      const allUsers: User[] = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        // Skip current user
        if (doc.id !== currentUser.uid) {
          const user = {
            uid: doc.id,
            displayName: userData.displayName,
            email: userData.email,
            photoURL: userData.photoURL
          } as User;
          allUsers.push(user);
        }
      });

      return allUsers;
    } catch (error) {
      console.error('[useUsers] Error fetching users:', error);
      return [];
    }
  }, [currentUser]);

  return {
    users,
    setUsers,
    fetchUserData,
    fetchMessageUsers,
    getAvailableUsers
  };
} 