import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'member';
  isPending: boolean;
}

interface HouseholdContextType {
  householdMembers: HouseholdMember[];
  loading: boolean;
  error: Error | null;
}

const HouseholdContext = createContext<HouseholdContextType>({
  householdMembers: [],
  loading: true,
  error: null
});

export const useHouseholdContext = () => useContext(HouseholdContext);

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      setHouseholdMembers([]);
      setLoading(false);
      return;
    }

    const householdQuery = query(
      collection(db, 'households'),
      where('members', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      householdQuery,
      (snapshot) => {
        const members: HouseholdMember[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          members.push({
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            role: data.role || 'member',
            isPending: data.isPending || false
          });
        });
        setHouseholdMembers(members);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching household members:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <HouseholdContext.Provider value={{ householdMembers, loading, error }}>
      {children}
    </HouseholdContext.Provider>
  );
}; 