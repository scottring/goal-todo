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
  QueryConstraint,
  where
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
    try {
      // Make sure user is authenticated
      if (authLoading) {
        console.log('Authentication is still loading, delaying query');
        return [] as T[];
      }
      
      if (!currentUser) {
        console.error('User not authenticated');
        return [] as T[];
      }
      
      const prefixedCollection = getPrefixedCollection(collectionName);
      console.log(`Fetching from collection: ${prefixedCollection}`);
      
      // Add ownerId constraint if not already present
      let hasOwnerIdConstraint = false;
      for (const constraint of constraints) {
        if (constraint.toString().includes('ownerId')) {
          hasOwnerIdConstraint = true;
          break;
        }
      }
      
      if (!hasOwnerIdConstraint && currentUser) {
        console.log(`Adding ownerId constraint for user: ${currentUser.uid}`);
        constraints.push(where('ownerId', '==', currentUser.uid));
      }
      
      const collectionRef = collection(db, prefixedCollection);
      const q = query(collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      console.log(`Retrieved ${querySnapshot.docs.length} documents from ${prefixedCollection}`);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
      // Add more detailed error information
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      return [] as T[]; // Return empty array instead of throwing to prevent app crashes
    }
  };

  const getDocument = async <T = DocumentData>(
    collectionName: string,
    documentId: string
  ) => {
    try {
      // Make sure user is authenticated
      if (authLoading) {
        console.log('Authentication is still loading, delaying query');
        return null;
      }
      
      if (!currentUser) {
        console.error('User not authenticated');
        return null;
      }
      
      const prefixedCollection = getPrefixedCollection(collectionName);
      console.log(`Fetching document: ${documentId} from collection: ${prefixedCollection}`);
      
      const docRef = doc(db, prefixedCollection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Check if the document belongs to the current user or is shared with them
        if (data.ownerId === currentUser.uid || 
            (data.sharedWith && data.sharedWith.includes(currentUser.uid)) ||
            (data.permissions && data.permissions[currentUser.uid] && 
             (data.permissions[currentUser.uid].view || data.permissions[currentUser.uid].edit))) {
          
          console.log(`Successfully retrieved document: ${documentId}`);
          return {
            id: docSnap.id,
            ...data
          } as T;
        } else {
          console.error(`Permission denied for document: ${documentId}`);
          return null;
        }
      }
      
      console.log(`Document not found: ${documentId}`);
      return null;
    } catch (error) {
      console.error(`Error fetching document from ${collectionName}:`, error);
      // Add more detailed error information
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      return null; // Return null instead of throwing to prevent app crashes
    }
  };

  const addDocument = async <T = DocumentData>(
    collectionName: string,
    data: Omit<T, 'id'>
  ) => {
    try {
      // Make sure user is authenticated
      if (authLoading) {
        console.log('Authentication is still loading, delaying operation');
        throw new Error('Authentication is still loading');
      }
      
      if (!currentUser) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }
      
      const prefixedCollection = getPrefixedCollection(collectionName);
      console.log(`Adding document to collection: ${prefixedCollection}`);
      
      const collectionRef = collection(db, prefixedCollection);
      const docData = {
        ...data,
        ownerId: currentUser.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Ensure permissions field exists and has current user permissions
      // Use type assertion to handle dynamic properties
      const typedDocData = docData as any;
      
      if (!typedDocData.permissions) {
        typedDocData.permissions = {};
      }
      
      if (!typedDocData.permissions[currentUser.uid]) {
        typedDocData.permissions[currentUser.uid] = {
          edit: true,
          view: true
        };
      }
      
      // Ensure sharedWith field exists
      if (!typedDocData.sharedWith) {
        typedDocData.sharedWith = [];
      }
      
      const docRef = await addDoc(collectionRef, typedDocData);
      console.log(`Document added successfully with ID: ${docRef.id}`);
      
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      // Add more detailed error information
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  };

  const updateDocument = async <T = DocumentData>(
    collectionName: string,
    documentId: string,
    data: Partial<T>
  ) => {
    try {
      // Make sure user is authenticated
      if (authLoading) {
        console.log('Authentication is still loading, delaying operation');
        throw new Error('Authentication is still loading');
      }
      
      if (!currentUser) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }
      
      const prefixedCollection = getPrefixedCollection(collectionName);
      console.log(`Updating document: ${documentId} in collection: ${prefixedCollection}`);
      
      // First check if the user has permission to update this document
      const docRef = doc(db, prefixedCollection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error(`Document not found: ${documentId}`);
        throw new Error(`Document not found: ${documentId}`);
      }
      
      const docData = docSnap.data();
      
      // Check if the user has edit permission
      const hasPermission = 
        docData.ownerId === currentUser.uid || 
        (docData.permissions && 
         docData.permissions[currentUser.uid] && 
         docData.permissions[currentUser.uid].edit);
      
      if (!hasPermission) {
        console.error(`Permission denied for updating document: ${documentId}`);
        throw new Error(`Permission denied for updating document: ${documentId}`);
      }

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
      
      console.log(`Document updated successfully: ${documentId}`);
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      // Add more detailed error information
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      throw error;
    }
  };

  const deleteDocument = async (
    collectionName: string,
    documentId: string
  ) => {
    try {
      // Make sure user is authenticated
      if (authLoading) {
        console.log('Authentication is still loading, delaying operation');
        throw new Error('Authentication is still loading');
      }
      
      if (!currentUser) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }
      
      const prefixedCollection = getPrefixedCollection(collectionName);
      console.log(`Deleting document: ${documentId} from collection: ${prefixedCollection}`);
      
      // First check if the user has permission to delete this document
      const docRef = doc(db, prefixedCollection, documentId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error(`Document not found: ${documentId}`);
        throw new Error(`Document not found: ${documentId}`);
      }
      
      const docData = docSnap.data();
      
      // Only the owner can delete a document
      if (docData.ownerId !== currentUser.uid) {
        console.error(`Permission denied for deleting document: ${documentId}`);
        throw new Error(`Permission denied for deleting document: ${documentId}`);
      }
      
      await deleteDoc(docRef);
      console.log(`Document deleted successfully: ${documentId}`);
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      // Add more detailed error information
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
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
