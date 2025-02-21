import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestoreContext } from '../contexts/FirestoreContext';
import { useAuth } from '../contexts/AuthContext';
import type { SourceActivity } from '../types';

type CreateGoalData = Omit<SourceActivity, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>;

export const useGoals = () => {
  const [goals, setGoals] = useState<SourceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser } = useAuth();
  const { getCollection, addDocument, updateDocument, deleteDocument } = useFirestoreContext();

  const fetchGoals = async () => {
    if (!currentUser) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch goals where user is owner
      const ownedGoals = await getCollection<SourceActivity>('activities', [
        where('ownerId', '==', currentUser.uid)
      ]);
      
      // Fetch goals shared with the user
      const sharedGoals = await getCollection<SourceActivity>('activities', [
        where('sharedWith', 'array-contains', currentUser.uid)
      ]);
      
      // Combine and deduplicate goals
      const allGoals = [...ownedGoals];
      sharedGoals.forEach(goal => {
        if (!allGoals.some(g => g.id === goal.id)) {
          allGoals.push(goal);
        }
      });

      console.log('fetchedGoals:', allGoals);
      
      // Ensure tasks and routines are arrays
      const processedGoals = allGoals.map(goal => ({
        ...goal,
        tasks: Array.isArray(goal.tasks) ? goal.tasks : [],
        routines: Array.isArray(goal.routines) ? goal.routines : []
      }));
      
      setGoals(processedGoals);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchGoals();
    } else {
      setGoals([]);
    }
  }, [currentUser]);

  const createGoal = async (data: CreateGoalData) => {
    if (!currentUser) throw new Error('User must be authenticated to create a goal');

    try {
      await addDocument<SourceActivity>('activities', {
        ...data,
        ownerId: currentUser.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      await fetchGoals();
    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err as Error);
      throw err;
    }
  };

  const updateGoal = async (goalId: string, data: Partial<SourceActivity>) => {
    if (!currentUser) throw new Error('User must be authenticated to update a goal');

    try {
      await updateDocument<SourceActivity>('activities', goalId, {
        ...data,
        updatedAt: Timestamp.now()
      });
      await fetchGoals();
    } catch (err) {
      console.error('Error updating goal:', err);
      setError(err as Error);
      throw err;
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!currentUser) throw new Error('User must be authenticated to delete a goal');

    try {
      await deleteDocument('activities', goalId);
      await fetchGoals();
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError(err as Error);
      throw err;
    }
  };

  return {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoals: fetchGoals
  };
}; 