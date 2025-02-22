import { 
  collection,
  doc,
  query,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getPrefixedCollection } from '../utils/environment';

export const useFirestore = () => {
  const { currentUser, loading: authLoading } = useAuth();

  const checkAuth = () => {
    if (authLoading) {
      throw new Error('Authentication is still initializing');
    }
    if (!currentUser) {
      throw new Error('User must be authenticated to access Firestore');
    }
  };

  const getCollection = async <T = DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ) => {
    checkAuth();
    try {
      const prefixedCollection = getPrefixedCollection(collectionName);
      const collectionRef = collection(db, prefixedCollection);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      throw error;
    }
  };

  const getDocument = async <T = DocumentData>(
    collectionName: string,
    documentId: string
  ) => {
    checkAuth();
    try {
      const prefixedCollection = getPrefixedCollection(collectionName);
      const docRef = doc(db, prefixedCollection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as T;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching document from ${collectionName}:`, error);
      throw error;
    }
  };

  const addDocument = async <T = DocumentData>(
    collectionName: string,
    data: Omit<T, 'id'>
  ) => {
    checkAuth();
    try {
      const prefixedCollection = getPrefixedCollection(collectionName);
      const collectionRef = collection(db, prefixedCollection);
      const docRef = await addDoc(collectionRef, {
        ...data,
        ownerId: currentUser!.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  };

  const updateDocument = async <T = DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ) => {
    checkAuth();
    try {
      const prefixedCollection = getPrefixedCollection(collectionName);
      const docRef = doc(db, prefixedCollection, documentId);

      // Recursively remove undefined values
      function clean(obj: any): any {
        if (Array.isArray(obj)) {
          return obj.map(clean).filter(value => value !== undefined);
        } else if (typeof obj === 'object' && obj !== null) {
          return Object.entries(obj).reduce((acc, [key, value]) => {
            const cleanedValue = clean(value);
            if (cleanedValue !== undefined) {
              acc[key] = cleanedValue;
            }
            return acc;
          }, {} as Record<string, any>);
        } else if (obj !== undefined) {
          return obj;
        } else {
          return undefined;
        }
      }

      const cleanData = clean(data);

      await updateDoc(docRef, {
        ...cleanData,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  };

  const deleteDocument = async (
    collectionName: string,
    documentId: string
  ) => {
    checkAuth();
    try {
      const prefixedCollection = getPrefixedCollection(collectionName);
      const docRef = doc(db, prefixedCollection, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  };

  return {
    getCollection,
    getDocument,
    addDocument,
    updateDocument,
    deleteDocument
  };
};
