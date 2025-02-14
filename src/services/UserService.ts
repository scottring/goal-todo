import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export class UserService {
  async findUserByEmail(email: string): Promise<UserProfile | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    } as UserProfile;
  }

  async findUsersByIds(userIds: string[]): Promise<UserProfile[]> {
    if (!userIds.length) return [];

    const usersRef = collection(db, 'users');
    const chunks = this.chunkArray(userIds, 10); // Firestore limits in queries
    const users: UserProfile[] = [];

    for (const chunk of chunks) {
      const q = query(usersRef, where('id', 'in', chunk));
      const querySnapshot = await getDocs(q);
      users.push(...querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserProfile)));
    }

    return users;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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