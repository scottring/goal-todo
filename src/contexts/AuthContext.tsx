import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { getAuthService } from '../services/AuthService';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  error: null,
  signIn: async () => { throw new Error('AuthContext not initialized'); },
  signUp: async () => { throw new Error('AuthContext not initialized'); },
  signInWithGoogle: async () => { throw new Error('AuthContext not initialized'); },
  signOut: async () => { throw new Error('AuthContext not initialized'); },
  resetPassword: async () => { throw new Error('AuthContext not initialized'); }
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const authService = getAuthService();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      await authService.signInWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in'));
      throw err;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      await authService.signUpWithEmail(email, password, displayName);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign up'));
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await authService.signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign in with Google'));
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to sign out'));
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await authService.resetPassword(email);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reset password'));
      throw err;
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
