import React, { useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { AuthContext } from './auth/context';
import { FirebaseError } from '@firebase/app';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthProvider] Auth state changed:', user?.uid);
      setCurrentUser(user);
      
      try {
        if (user) {
          // Check if user document exists
          const userDocRef = doc(db, 'users', user.uid);
          console.log('[AuthProvider] Checking for user document:', user.uid);
          
          try {
            const userDoc = await getDoc(userDocRef);
            
            // If user document doesn't exist, create it
            if (!userDoc.exists()) {
              console.log('[AuthProvider] No user document found, creating one');
              const userData = {
                displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                email: user.email,
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                role: 'user'
              };
              
              await setDoc(userDocRef, userData);
              console.log('[AuthProvider] User document created successfully:', userData);
            } else {
              console.log('[AuthProvider] User document exists:', userDoc.data());
            }
          } catch (error) {
            console.error('[AuthProvider] Error handling user document:', error);
            // Attempt to create the document one more time
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
              try {
                const userData = {
                  displayName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                  email: user.email,
                  photoURL: user.photoURL,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  role: 'user'
                };
                
                await setDoc(userDocRef, userData);
                console.log('[AuthProvider] User document created after error:', userData);
              } catch (retryError) {
                console.error('[AuthProvider] Failed to create user document after retry:', retryError);
              }
            }
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Error in auth state change handler:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      console.log('[AuthProvider] Starting user signup for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AuthProvider] User created in Auth:', userCredential.user.uid);
      
      await updateProfile(userCredential.user, { displayName });
      console.log('[AuthProvider] Profile updated with displayName:', displayName);
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      console.log('[AuthProvider] Creating user document in Firestore');
      
      const userData = {
        displayName,
        email,
        photoURL: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: 'user'
      };
      
      await setDoc(userDocRef, userData);
      console.log('[AuthProvider] User document created successfully:', userData);

      return userCredential.user;
    } catch (error) {
      console.error('[AuthProvider] Error in signUp:', error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    currentUser,
    signIn,
    signUp,
    signOut,
    isLoading,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 