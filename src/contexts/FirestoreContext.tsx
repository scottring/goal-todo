import { createContext, useContext, ReactNode } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import type { DocumentData, QueryConstraint } from 'firebase/firestore';

interface FirestoreContextType {
  getCollection: <T = DocumentData>(
    collectionName: string,
    constraints?: QueryConstraint[]
  ) => Promise<T[]>;
  getDocument: <T = DocumentData>(
    collectionName: string,
    documentId: string
  ) => Promise<T | null>;
  addDocument: <T = DocumentData>(
    collectionName: string,
    data: Omit<T, 'id'>
  ) => Promise<string>;
  updateDocument: <T = DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ) => Promise<void>;
  deleteDocument: (
    collectionName: string,
    documentId: string
  ) => Promise<void>;
}

const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

export function FirestoreProvider({ children }: { children: ReactNode }) {
  const firestoreUtils = useFirestore();

  return (
    <FirestoreContext.Provider value={firestoreUtils}>
      {children}
    </FirestoreContext.Provider>
  );
}

export function useFirestoreContext() {
  const context = useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error('useFirestoreContext must be used within a FirestoreProvider');
  }
  return context;
} 