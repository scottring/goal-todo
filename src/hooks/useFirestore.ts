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

export const useFirestore = () => {
  const { user } = useAuth();

  const getCollection = async <T = DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ) => {
    try {
      const collectionRef = collection(db, collectionName);
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
    try {
      const docRef = doc(db, collectionName, documentId);
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
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        ownerId: user?.uid,
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
    try {
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        ...data,
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
    try {
      const docRef = doc(db, collectionName, documentId);
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