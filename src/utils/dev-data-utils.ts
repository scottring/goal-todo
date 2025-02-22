import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { populateDevData } from '../../scripts/populate-dev-data';

const DEV_COLLECTIONS = [
  'dev_areas',
  'dev_activities',
  'dev_routines',
  'dev_weeklyPlanningSessions',
  'dev_shared_goals'
];

export async function clearDevData(userId: string): Promise<void> {
  try {
    for (const collectionName of DEV_COLLECTIONS) {
      const collectionRef = collection(db, collectionName);
      const q = query(collectionRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);
      
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }
    console.log('Development data cleared successfully');
  } catch (error) {
    console.error('Error clearing development data:', error);
    throw error;
  }
}

export async function repopulateDevData(userId: string): Promise<void> {
  try {
    // First clear existing data
    await clearDevData(userId);
    
    // Then populate with new data
    await populateDevData(userId);
    
    console.log('Development data repopulated successfully');
  } catch (error) {
    console.error('Error repopulating development data:', error);
    throw error;
  }
} 