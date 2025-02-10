import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { SourceActivity } from '../types';

type CreateGoalData = Pick<SourceActivity, 'name' | 'description' | 'deadline' | 'areaId' | 'milestones' | 'sharedWith'>;

export const useGoals = () => {
  const [goals, setGoals] = useState<SourceActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { getCollection, addDocument, updateDocument, deleteDocument } = useFirestore();

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const fetchedGoals = await getCollection<SourceActivity>('activities', [
        where('ownerId', '==', user?.uid)
      ]);
      setGoals(fetchedGoals);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const createGoal = async (data: CreateGoalData) => {
    try {
      await addDocument<SourceActivity>('activities', {
        ...data,
        ownerId: user?.uid || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tasks: [],
        routines: []
      });
      await fetchGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateGoal = async (goalId: string, data: Partial<SourceActivity>) => {
    try {
      await updateDocument<SourceActivity>('activities', goalId, data);
      await fetchGoals();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      await deleteDocument('activities', goalId);
      await fetchGoals();
    } catch (err) {
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