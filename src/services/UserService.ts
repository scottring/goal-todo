import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Timestamp as TimestampType } from '../types';
import { getAuth } from 'firebase/auth';

export class UserService {
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const userDoc = querySnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      } as UserProfile;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findUsersByIds(userIds: string[]): Promise<UserProfile[]> {
    try {
      if (!userIds.length) return [];
      
      // Firebase doesn't support array contains with more than 10 items
      // So we need to batch our requests if we have more than 10 IDs
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      const results: UserProfile[] = [];
      
      for (const batch of batches) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('__name__', 'in', batch));
        const querySnapshot = await getDocs(q);
        
        const batchResults = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as UserProfile));
        
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      console.error('Error finding users by IDs:', error);
      return [];
    }
  }

  async findAllUsers(): Promise<UserProfile[]> {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserProfile));
    } catch (error) {
      console.error('Error finding all users:', error);
      throw error;
    }
  }

  async createUserProfile(email: string, displayName?: string): Promise<UserProfile> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('Must be signed in to create user profiles');
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const timestamp = serverTimestamp();
      
      const newUser: Omit<UserProfile, 'id'> = {
        email: email.toLowerCase(),
        displayName: displayName || email.split('@')[0],
        createdAt: timestamp as unknown as TimestampType,
      };

      await setDoc(userRef, newUser);

      return {
        id: auth.currentUser.uid,
        ...newUser,
        createdAt: {
          seconds: Math.floor(Date.now() / 1000),
          nanoseconds: 0
        }
      } as UserProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
}

// Create singleton instance
let userService: UserService | null = null;

export const getUserService = (): UserService => {
  if (!userService) {
    userService = new UserService();
  }
  return userService;
}; 