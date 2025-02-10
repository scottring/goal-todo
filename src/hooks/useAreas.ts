import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestoreContext } from '../contexts/FirestoreContext';
import { useAuth } from '../contexts/AuthContext';
import type { Area } from '../types';

type CreateAreaData = Pick<Area, 'name' | 'description' | 'color' | 'sharedWith'>;

export const useAreas = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { getCollection, addDocument, updateDocument, deleteDocument } = useFirestoreContext();

  const fetchAreas = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const fetchedAreas = await getCollection<Area>('areas', [
        where('ownerId', '==', user.uid)
      ]);
      setAreas(fetchedAreas);
      setError(null);
    } catch (err) {
      console.error('Error fetching areas:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAreas();
    } else {
      setAreas([]);
    }
  }, [user]);

  const createArea = async (data: CreateAreaData) => {
    if (!user) throw new Error('User must be authenticated to create an area');

    try {
      await addDocument<Area>('areas', {
        ...data,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      await fetchAreas();
    } catch (err) {
      console.error('Error creating area:', err);
      setError(err as Error);
      throw err;
    }
  };

  const updateArea = async (areaId: string, data: Partial<Area>) => {
    if (!user) throw new Error('User must be authenticated to update an area');

    try {
      await updateDocument<Area>('areas', areaId, data);
      await fetchAreas();
    } catch (err) {
      console.error('Error updating area:', err);
      setError(err as Error);
      throw err;
    }
  };

  const deleteArea = async (areaId: string) => {
    if (!user) throw new Error('User must be authenticated to delete an area');

    try {
      await deleteDocument('areas', areaId);
      await fetchAreas();
    } catch (err) {
      console.error('Error deleting area:', err);
      setError(err as Error);
      throw err;
    }
  };

  return {
    areas,
    loading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refreshAreas: fetchAreas
  };
}; 