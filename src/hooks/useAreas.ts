import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import type { Area } from '../types';

type CreateAreaData = Pick<Area, 'name' | 'description' | 'color' | 'sharedWith'>;

export const useAreas = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const { getCollection, addDocument, updateDocument, deleteDocument } = useFirestore();

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const fetchedAreas = await getCollection<Area>('areas', [
        where('ownerId', '==', user?.uid)
      ]);
      setAreas(fetchedAreas);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAreas();
    }
  }, [user]);

  const createArea = async (data: CreateAreaData) => {
    try {
      await addDocument<Area>('areas', {
        ...data,
        ownerId: user?.uid || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      await fetchAreas();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const updateArea = async (areaId: string, data: Partial<Area>) => {
    try {
      await updateDocument<Area>('areas', areaId, data);
      await fetchAreas();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  const deleteArea = async (areaId: string) => {
    try {
      await deleteDocument('areas', areaId);
      await fetchAreas();
    } catch (err) {
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