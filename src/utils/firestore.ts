import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getPrefixedCollection } from './environment';

export const updateDocument = async (collection: string, documentId: string, data: any) => {
  const prefixedCollection = getPrefixedCollection(collection);
  const docRef = doc(db, prefixedCollection, documentId);
  await updateDoc(docRef, data);
}; 