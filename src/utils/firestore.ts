import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const updateDocument = async (collection: string, documentId: string, data: any) => {
  const docRef = doc(db, collection, documentId);
  await updateDoc(docRef, data);
}; 