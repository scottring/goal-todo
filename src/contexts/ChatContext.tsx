import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAIService } from '../services/AIService';
import { getPrefixedCollection } from '../utils/environment';

interface ChatContextType {
  apiKey: string | null;
  setApiKey: (key: string) => Promise<void>;
  isReady: boolean;
  clearApiKey: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load API key from user settings or localStorage
  useEffect(() => {
    const loadApiKey = async () => {
      // First try to load from localStorage as fallback
      const savedKey = localStorage.getItem('openai_api_key');

      if (!user) {
        if (savedKey) {
          // If we have a key in localStorage but no user, still use it
          setApiKeyState(savedKey);
          getAIService({ apiKey: savedKey });
          setIsReady(true);
        } else {
          setApiKeyState(null);
          setIsReady(false);
        }
        return;
      }

      try {
        // Try to get from main user document first (simpler approach)
        const userCollection = getPrefixedCollection('users');
        const userDocRef = doc(db, userCollection, user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.apiKey) {
            setApiKeyState(userData.apiKey);
            getAIService({ apiKey: userData.apiKey });
            setIsReady(true);
            return;
          }
        }

        // If we have a key in localStorage, use it
        if (savedKey) {
          setApiKeyState(savedKey);
          getAIService({ apiKey: savedKey });
          setIsReady(true);
        } else {
          setApiKeyState(null);
          setIsReady(false);
        }
      } catch (error) {
        console.error('Error loading API key:', error);

        // If Firestore fails but we have localStorage, use that
        if (savedKey) {
          setApiKeyState(savedKey);
          getAIService({ apiKey: savedKey });
          setIsReady(true);
        }
      }
    };

    loadApiKey();
  }, [user]);

  // Save API key to user settings
  const setApiKey = async (key: string) => {
    if (!user) return;

    try {
      // First try local storage as fallback
      localStorage.setItem('openai_api_key', key);

      try {
        const userCollection = getPrefixedCollection('users');
        const userDocRef = doc(db, userCollection, user.uid);

        // First create or ensure the user document exists
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || 'User',
          createdAt: new Date(),
          updatedAt: new Date(),
          sharedWith: [],
          apiKey: key // Add API key to the main document for simplicity
        }, { merge: true });

        // Update local state
        setApiKeyState(key);
        getAIService({ apiKey: key });
        setIsReady(true);
      } catch (firestoreError) {
        console.error('Error saving to Firestore - using localStorage only:', firestoreError);
        // Even if Firestore fails, we have localStorage as backup
        // Update local state
        setApiKeyState(key);
        getAIService({ apiKey: key });
        setIsReady(true);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      throw error;
    }
  };

  const clearApiKey = async () => {
    // Always clear from localStorage
    localStorage.removeItem('openai_api_key');

    if (!user) {
      setApiKeyState(null);
      setIsReady(false);
      return;
    }

    try {
      const userCollection = getPrefixedCollection('users');
      const userDocRef = doc(db, userCollection, user.uid);

      // Update the main user document
      await setDoc(userDocRef, {
        apiKey: null,
        updatedAt: new Date()
      }, { merge: true });

      setApiKeyState(null);
      setIsReady(false);
    } catch (error) {
      console.error('Error clearing API key from Firestore:', error);
      // Even if Firestore fails, we've cleared localStorage
      setApiKeyState(null);
      setIsReady(false);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        apiKey,
        setApiKey,
        isReady,
        clearApiKey
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};