import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp, getDoc, Timestamp, deleteDoc } from 'firebase/firestore';
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
    if (!userIds.length) return [];

    try {
      const users: UserProfile[] = [];

      // Fetch each document directly by ID
      for (const userId of userIds) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          users.push({
            id: userDoc.id,
            ...userDoc.data()
          } as UserProfile);
        }
      }

      return users;
    } catch (error) {
      console.error('Error finding users by IDs:', error);
      throw error;
    }
  }

  async createUserProfile(email: string, displayName?: string): Promise<UserProfile> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('Must be signed in to create user profiles');
      }

      // First check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        return existingUser;
      }

      // Clean up any pending invites for this email
      const pendingInvitesRef = collection(db, 'pendingHouseholdMembers');
      const pendingQuery = query(
        pendingInvitesRef,
        where('email', '==', email.toLowerCase())
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      
      // Get all users who have pending invites for this email
      const usersToUpdate = new Set<string>();
      pendingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.invitedBy) {
          usersToUpdate.add(data.invitedBy);
        }
      });

      // Delete all pending invites for this email
      const pendingDeletes = pendingSnapshot.docs.map(doc => deleteDoc(doc.ref));

      // Update all users who had pending invites for this email
      const userUpdates = Array.from(usersToUpdate).map(async userId => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          await updateDoc(userRef, {
            pendingInvites: (userData.pendingInvites || []).filter(
              (invite: { email: string }) => invite.email.toLowerCase() !== email.toLowerCase()
            )
          });
        }
      });

      // Create new user document with user's UID as the document ID
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const timestamp = serverTimestamp();
      
      const newUser: Omit<UserProfile, 'id'> = {
        email: email.toLowerCase(),
        displayName: displayName || email.split('@')[0],
        sharedWith: [],
        sharedAreas: [],
        sharedGoals: [],
        sharedTasks: [],
        createdAt: timestamp as unknown as TimestampType,
        ownerId: auth.currentUser.uid,
        permissions: {
          [auth.currentUser.uid]: {
            edit: true,
            view: true
          }
        }
      };

      // Execute all operations
      await Promise.all([
        setDoc(userRef, newUser),
        ...pendingDeletes,
        ...userUpdates
      ]);

      // Return the user with the actual timestamp
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

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('Must be signed in to update user profiles');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data() as UserProfile;
      
      // Check if current user has permission to update this profile
      if (auth.currentUser.uid !== userId && !userData.sharedWith.includes(auth.currentUser.uid)) {
        throw new Error('You do not have permission to update this profile');
      }

      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async addHouseholdMember(currentUserEmail: string, memberEmail: string, memberDisplayName?: string): Promise<void> {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('Must be signed in to add household members');
      }

      // Get current user's profile first
      let currentUser = await this.findUserByEmail(currentUserEmail);
      if (!currentUser) {
        // Create current user's profile if it doesn't exist
        currentUser = await this.createUserProfile(currentUserEmail);
      }

      // Check if member already has a profile
      const memberUser = await this.findUserByEmail(memberEmail);
      if (memberUser) {
        // If member exists, update the sharing relationship
        const updates: Promise<void>[] = [];

        // Update current user's profile
        if (!currentUser.sharedWith.includes(memberUser.id)) {
          const currentUserUpdates = {
            sharedWith: [...currentUser.sharedWith, memberUser.id],
            permissions: {
              ...currentUser.permissions,
              [memberUser.id]: { edit: true, view: true }
            }
          };
          updates.push(this.updateUserProfile(currentUser.id, currentUserUpdates));
        }

        // Update member's profile
        if (!memberUser.sharedWith.includes(currentUser.id)) {
          const memberUpdates = {
            sharedWith: [...memberUser.sharedWith, currentUser.id],
            permissions: {
              ...memberUser.permissions,
              [currentUser.id]: { edit: true, view: true }
            }
          };
          updates.push(this.updateUserProfile(memberUser.id, memberUpdates));
        }

        await Promise.all(updates);
      } else {
        // Store pending invitation in a separate collection
        const pendingMemberRef = doc(collection(db, 'pendingHouseholdMembers'));
        await setDoc(pendingMemberRef, {
          email: memberEmail.toLowerCase(),
          displayName: memberDisplayName || memberEmail.split('@')[0],
          invitedBy: currentUser.id,
          invitedByEmail: currentUserEmail,
          createdAt: serverTimestamp(),
          status: 'pending'
        });

        // Create a regular timestamp for the array
        const now = Timestamp.now();

        // Update current user's pending invites
        await updateDoc(doc(db, 'users', currentUser.id), {
          pendingInvites: [...(currentUser.pendingInvites || []), {
            email: memberEmail.toLowerCase(),
            invitedAt: now
          }]
        });
      }
    } catch (error) {
      console.error('Error adding household member:', error);
      throw error;
    }
  }

  async acceptHouseholdInvitation(inviterEmail: string): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('Must be signed in to accept invitations');
    }

    try {
      console.log('Finding pending invitation...');
      // Find the pending invitation
      const pendingInvitesRef = collection(db, 'pendingHouseholdMembers');
      const q = query(
        pendingInvitesRef,
        where('email', '==', auth.currentUser.email?.toLowerCase()),
        where('invitedByEmail', '==', inviterEmail.toLowerCase())
      );
      
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        throw new Error('Invitation not found');
      }

      const invitation = querySnapshot.docs[0];
      const invitationData = invitation.data();

      console.log('Getting user profiles...');
      // Get or create profiles for both users
      const inviter = await this.findUserByEmail(inviterEmail);
      if (!inviter) {
        throw new Error('Inviter not found');
      }

      let currentUser = await this.findUserByEmail(auth.currentUser.email || '');
      if (!currentUser) {
        currentUser = await this.createUserProfile(auth.currentUser.email || '');
      }

      console.log('Updating sharing relationships...');
      // Update sharing relationship
      const updates: Promise<void>[] = [];

      // Update inviter's profile
      if (!inviter.sharedWith.includes(currentUser.id)) {
        const inviterUpdates = {
          sharedWith: [...inviter.sharedWith, currentUser.id],
          permissions: {
            ...inviter.permissions,
            [currentUser.id]: { edit: true, view: true }
          },
          // Remove the pending invite from inviter's pendingInvites array
          pendingInvites: (inviter.pendingInvites || []).filter(
            invite => invite.email.toLowerCase() !== auth.currentUser?.email?.toLowerCase()
          )
        };
        updates.push(this.updateUserProfile(inviter.id, inviterUpdates));
      }

      // Update current user's profile
      if (!currentUser.sharedWith.includes(inviter.id)) {
        const currentUserUpdates = {
          sharedWith: [...currentUser.sharedWith, inviter.id],
          permissions: {
            ...currentUser.permissions,
            [inviter.id]: { edit: true, view: true }
          }
        };
        updates.push(this.updateUserProfile(currentUser.id, currentUserUpdates));
      }

      // Share existing goals and tasks
      console.log('Sharing existing goals and tasks...');
      
      // Get inviter's goals
      const goalsRef = collection(db, 'activities');
      const goalsQuery = query(goalsRef, where('ownerId', '==', inviter.id));
      const goalsSnapshot = await getDocs(goalsQuery);
      
      // Share each goal with the new member
      const goalUpdates = goalsSnapshot.docs.map(goalDoc => {
        const goalData = goalDoc.data();
        return updateDoc(goalDoc.ref, {
          sharedWith: [...(goalData.sharedWith || []), currentUser.id],
          permissions: {
            ...(goalData.permissions || {}),
            [currentUser.id]: { edit: true, view: true }
          }
        });
      });

      // Get tasks associated with these goals
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('ownerId', '==', inviter.id));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      // Share each task with the new member
      const taskUpdates = tasksSnapshot.docs.map(taskDoc => {
        const taskData = taskDoc.data();
        return updateDoc(taskDoc.ref, {
          sharedWith: [...(taskData.sharedWith || []), currentUser.id],
          permissions: {
            ...(taskData.permissions || {}),
            [currentUser.id]: { edit: true, view: true }
          }
        });
      });

      // Delete the pending invitation
      console.log('Deleting pending invitation...');
      await deleteDoc(invitation.ref);

      // Execute all updates
      console.log('Executing all updates...');
      await Promise.all([...updates, ...goalUpdates, ...taskUpdates]);
      
      console.log('Invitation accepted successfully');
    } catch (error) {
      console.error('Error accepting household invitation:', error);
      throw error;
    }
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