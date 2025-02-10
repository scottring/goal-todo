import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { User } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  error: Error | undefined;
  syncError: Error | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, loading, error] = useAuthState(auth);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Sync user data with Firestore
  useEffect(() => {
    const syncUserData = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        try {
          const userDoc = await getDoc(userRef);
          
          const userData = {
            email: user.email,
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            lastLogin: serverTimestamp(),
          };

          if (!userDoc.exists()) {
            // Create new user document
            await setDoc(userRef, {
              ...userData,
              createdAt: serverTimestamp(),
              ownerId: user.uid,
              sharedWith: []
            });
          } else {
            // Update existing user document
            await setDoc(userRef, {
              ...userData,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }
          setSyncError(null);
        } catch (err) {
          console.error('Error syncing user data:', err);
          setSyncError(err as Error);
        }
      }
    };

    if (user && !loading) {
      syncUserData();
    }
  }, [user, loading]);

  return (
    <AuthContext.Provider value={{ user, loading, error, syncError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}