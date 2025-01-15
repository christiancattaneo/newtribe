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
              try {
                await setDoc(userDocRef, {
                  displayName: user.displayName || user.email?.split('@')[0],
                  email: user.email,
                  photoURL: user.photoURL,
                  createdAt: serverTimestamp()
                });
                console.log('[AuthProvider] User document created successfully');
              } catch (error) {
                console.error('[AuthProvider] Error creating user document:', error);
              }
            } else {
              console.log('[AuthProvider] User document exists:', userDoc.data());
            }
          } catch (error: unknown) {
            // If we get a permission error, the document probably doesn't exist
            if (error instanceof FirebaseError && error.code === 'permission-denied') {
              console.log('[AuthProvider] Permission denied reading user document, attempting to create');
              try {
                await setDoc(userDocRef, {
                  displayName: user.displayName || user.email?.split('@')[0],
                  email: user.email,
                  photoURL: user.photoURL,
                  createdAt: serverTimestamp()
                });
                console.log('[AuthProvider] User document created successfully after permission error');
              } catch (createError) {
                console.error('[AuthProvider] Error creating user document after permission error:', createError);
              }
            } else {
              console.error('[AuthProvider] Error checking user document:', error);
            }
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Error in auth state change:', error);
      }
      setCurrentUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
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
      
      try {
        await updateProfile(userCredential.user, { displayName });
        console.log('[AuthProvider] Profile updated with displayName:', displayName);
      } catch (error) {
        console.error('[AuthProvider] Error updating profile:', error);
      }
      
      // Create user document in Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      console.log('[AuthProvider] Creating user document in Firestore');
      try {
        await setDoc(userDocRef, {
          displayName,
          email,
          photoURL: null,
          createdAt: serverTimestamp()
        });
        console.log('[AuthProvider] User document created successfully');
      } catch (error) {
        console.error('[AuthProvider] Error creating user document:', error);
        // Try to read the document to see if it exists
        try {
          const docSnap = await getDoc(userDocRef);
          console.log('[AuthProvider] Document exists?', docSnap.exists(), docSnap.data());
        } catch (error) {
          console.error('[AuthProvider] Error reading user document:', error);
        }
      }

      return userCredential.user;
    } catch (error) {
      console.error('[AuthProvider] Error in signUp:', error);
      throw error;
    }
  };

  const signOut = () => firebaseSignOut(auth);

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

  const value = {
    currentUser,
    signIn,
    signUp,
    signOut,
    resetPassword,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 