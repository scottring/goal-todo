import { useState, useEffect, useCallback } from 'react';
import { where, query, collection, getDocs, or, Timestamp } from 'firebase/firestore';
import { useFirestoreContext } from '../contexts/FirestoreContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import type { Area } from '../types';

type CreateAreaData = {
  name: string;
  description?: string;
  color?: string;
  sharedWith: string[];
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
};

export const useAreas = () => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser } = useAuth();
  const { addDocument, updateDocument, deleteDocument, getDocument } = useFirestoreContext();

  const fetchAreas = useCallback(async () => {
    if (!currentUser) {
      console.log('No current user, skipping area fetch');
      setAreas([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Starting area fetch for user:', currentUser.uid);
      
      // Create a query that matches either:
      // 1. Areas where the user is the owner
      // 2. Areas where the user is in the sharedWith array
      const areasQuery = query(
        collection(db, 'areas'),
        or(
          where('ownerId', '==', currentUser.uid),
          where('sharedWith', 'array-contains', currentUser.uid)
        )
      );

      console.log('Executing areas query...');
      const querySnapshot = await getDocs(areasQuery);
      console.log('Query complete. Number of results:', querySnapshot.size);
      
      const fetchedAreas = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Processing area:', {
          id: doc.id,
          ownerId: data.ownerId,
          name: data.name,
          sharedWith: data.sharedWith
        });
        return {
          id: doc.id,
          ...data
        };
      }) as Area[];

      console.log('Areas processing complete. Total areas:', fetchedAreas.length);
      setAreas(fetchedAreas);
      setError(null);
    } catch (err) {
      console.error('Error fetching areas:', err);
      setError(err as Error);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    console.log('useAreas effect triggered, currentUser:', currentUser?.uid);
    
    if (currentUser) {
      console.log('Initiating area fetch for user:', currentUser.uid);
      fetchAreas();
    } else {
      console.log('No current user, clearing areas');
      setAreas([]);
      setLoading(false);
      setError(null);
    }
  }, [currentUser?.uid, fetchAreas]);

  const createArea = async (data: CreateAreaData) => {
    if (!currentUser) throw new Error('User must be authenticated to create an area');

    try {
      setLoading(true);
      console.log('Creating area with data:', {
        ...data,
        ownerId: currentUser.uid,
      });
      
      const newArea = {
        ...data,
        ownerId: currentUser.uid,
        sharedWith: data.sharedWith || [],
        permissions: data.permissions || {},
        createdAt: Timestamp.now()
      };

      await addDocument<Area>('areas', newArea);
      console.log('Area created successfully');
      await fetchAreas();
    } catch (err) {
      console.error('Error creating area:', err);
      setError(err as Error);
      throw err;
    }
  };

  const updateArea = async (areaId: string, data: Partial<Area>) => {
    if (!currentUser) throw new Error('User must be authenticated to update an area');

    try {
      setLoading(true);
      await updateDocument<Area>('areas', areaId, data);
      await fetchAreas();
    } catch (err) {
      console.error('Error updating area:', err);
      setError(err as Error);
      throw err;
    }
  };

  const deleteArea = async (areaId: string) => {
    if (!currentUser) throw new Error('User must be authenticated to delete an area');

    try {
      setLoading(true);
      await deleteDocument('areas', areaId);
      await fetchAreas();
    } catch (err) {
      console.error('Error deleting area:', err);
      setError(err as Error);
      throw err;
    }
  };

  const getAreaById = useCallback(async (areaId: string) => {
    if (!currentUser) throw new Error('User must be authenticated to get an area');
    try {
      console.log('Fetching area with ID:', areaId);
      const area = await getDocument<Area>('areas', areaId);
      console.log('Fetched area data:', area);
      return area;
    } catch (error) {
      console.error("Error fetching area:", error);
      throw error;
    }
  }, [currentUser, getDocument]);

  return {
    areas,
    loading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refreshAreas: fetchAreas,
    getAreaById
  };
};
