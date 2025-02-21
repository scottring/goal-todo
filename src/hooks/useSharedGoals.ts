import { useState, useEffect } from 'react';
import { where, Timestamp, query, collection, getDocs } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import type { SharedGoal, UserGoal } from '../types';

interface CreateSharedGoalData {
  name: string;
  description: string;
  areaId: string;
  sharedWith: string[];
  deadline?: Date;
  permissions?: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
      invite: boolean;
    }
  };
}

export const useSharedGoals = () => {
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { getCollection, addDocument, updateDocument, deleteDocument } = useFirestore();

  const fetchSharedGoals = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch goals where user is owner
      const ownerQuery = query(
        collection(db, 'shared_goals'),
        where('ownerId', '==', user.uid)
      );
      const ownerSnapshot = await getDocs(ownerQuery);
      const ownedGoals = ownerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SharedGoal[];

      // Fetch goals shared with user
      const sharedQuery = query(
        collection(db, 'shared_goals'),
        where('sharedWith', 'array-contains', user.uid)
      );
      const sharedSnapshot = await getDocs(sharedQuery);
      const sharedGoals = sharedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SharedGoal[];

      // Combine and deduplicate goals
      const allGoals = [...ownedGoals];
      sharedGoals.forEach(goal => {
        if (!allGoals.some(g => g.id === goal.id)) {
          allGoals.push(goal);
        }
      });
      
      setSharedGoals(allGoals);

      // Fetch user's personal goal instances
      const fetchedUserGoals = await getCollection<UserGoal>('user_goals', [
        where('ownerId', '==', user.uid)
      ]);
      setUserGoals(fetchedUserGoals);
      
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching shared goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSharedGoals();
    }
  }, [user]);

  const createSharedGoal = async (data: CreateSharedGoalData) => {
    if (!user) return;

    try {
      const sharedGoalData: Omit<SharedGoal, 'id'> = {
        ...data,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'active',
        deadline: data.deadline ? Timestamp.fromDate(data.deadline) : undefined,
        participants: {
          [user.uid]: {
            joinedAt: Timestamp.now(),
            role: 'owner',
            permissions: {
              edit: true,
              view: true,
              invite: true
            }
          },
          ...Object.fromEntries(
            data.sharedWith.map(userId => [
              userId,
              {
                joinedAt: Timestamp.now(),
                role: 'collaborator',
                permissions: data.permissions?.[userId] || {
                  edit: false,
                  view: true,
                  invite: false
                }
              }
            ])
          )
        }
      };

      const sharedGoalId = await addDocument<SharedGoal>('shared_goals', sharedGoalData);

      // Create user's personal goal instance
      const userGoalData: Omit<UserGoal, 'id'> = {
        parentGoalId: sharedGoalId,
        name: data.name,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        specificAction: '',
        measurableMetric: 'custom',
        achievabilityCheck: 'yes',
        relevance: '',
        timeTracking: {
          type: 'recurring_review',
          reviewCycle: 'monthly',
          nextReviewDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
          reviewStatus: {
            lastReviewDate: Timestamp.now(),
            nextReviewDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
            completedReviews: []
          }
        },
        milestones: [],
        tasks: [],
        routines: [],
        areaId: data.areaId
      };

      await addDocument<UserGoal>('user_goals', userGoalData);

      // Update user profiles
      await Promise.all([
        updateDocument('users', user.uid, {
          sharedGoals: [...(user.sharedGoals || []), sharedGoalId]
        }),
        ...data.sharedWith.map(userId =>
          updateDocument('users', userId, {
            sharedGoals: [...(user.sharedGoals || []), sharedGoalId]
          })
        )
      ]);

      await fetchSharedGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateSharedGoal = async (goalId: string, data: Partial<SharedGoal>) => {
    try {
      await updateDocument<SharedGoal>('shared_goals', goalId, {
        ...data,
        updatedAt: Timestamp.now()
      });
      await fetchSharedGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateUserGoal = async (goalId: string, data: Partial<UserGoal>) => {
    try {
      await updateDocument<UserGoal>('user_goals', goalId, {
        ...data,
        updatedAt: Timestamp.now()
      });
      await fetchSharedGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteSharedGoal = async (goalId: string) => {
    try {
      const goal = sharedGoals.find(g => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      // Delete the shared goal
      await deleteDocument('shared_goals', goalId);
      
      // Delete all associated user goals
      const userGoalsToDelete = userGoals.filter(ug => ug.parentGoalId === goalId);
      await Promise.all(
        userGoalsToDelete.map(ug => deleteDocument('user_goals', ug.id))
      );

      // Update user profiles
      await Promise.all([
        updateDocument('users', user.uid, {
          sharedGoals: (user.sharedGoals || []).filter(id => id !== goalId)
        }),
        ...goal.sharedWith.map(userId =>
          updateDocument('users', userId, {
            sharedGoals: (user.sharedGoals || []).filter(id => id !== goalId)
          })
        )
      ]);
      
      await fetchSharedGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updatePermissions = async (goalId: string, userId: string, permissions: {
    edit: boolean;
    view: boolean;
    invite: boolean;
  }) => {
    try {
      const goal = sharedGoals.find(g => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      const updatedParticipants = {
        ...goal.participants,
        [userId]: {
          ...goal.participants[userId],
          permissions
        }
      };

      await updateDocument<SharedGoal>('shared_goals', goalId, {
        participants: updatedParticipants,
        updatedAt: Timestamp.now()
      });

      await fetchSharedGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    sharedGoals,
    userGoals,
    loading,
    error,
    createSharedGoal,
    updateSharedGoal,
    updateUserGoal,
    deleteSharedGoal,
    updatePermissions,
    refreshGoals: fetchSharedGoals
  };
}; 