import { createContext } from 'react';
import { User } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, displayName: string) => Promise<User>;
  signOut: () => Promise<void>;
  isLoading: boolean;
  resetPassword: (email: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null); 