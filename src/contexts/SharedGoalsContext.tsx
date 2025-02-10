import { createContext, useContext, ReactNode } from 'react';
import { useSharedGoals } from '../hooks/useSharedGoals';
import type { SharedGoal, UserGoal } from '../types';

interface SharedGoalsContextType {
  sharedGoals: SharedGoal[];
  userGoals: UserGoal[];
  loading: boolean;
  error: Error | null;
  createSharedGoal: (data: {
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
  }) => Promise<void>;
  updateSharedGoal: (goalId: string, data: Partial<SharedGoal>) => Promise<void>;
  updateUserGoal: (goalId: string, data: Partial<UserGoal>) => Promise<void>;
  deleteSharedGoal: (goalId: string) => Promise<void>;
  updatePermissions: (goalId: string, userId: string, permissions: {
    edit: boolean;
    view: boolean;
    invite: boolean;
  }) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const SharedGoalsContext = createContext<SharedGoalsContextType | undefined>(undefined);

export function SharedGoalsProvider({ children }: { children: ReactNode }) {
  const {
    sharedGoals,
    userGoals,
    loading,
    error,
    createSharedGoal,
    updateSharedGoal,
    updateUserGoal,
    deleteSharedGoal,
    updatePermissions,
    refreshGoals
  } = useSharedGoals();

  return (
    <SharedGoalsContext.Provider
      value={{
        sharedGoals,
        userGoals,
        loading,
        error,
        createSharedGoal,
        updateSharedGoal,
        updateUserGoal,
        deleteSharedGoal,
        updatePermissions,
        refreshGoals
      }}
    >
      {children}
    </SharedGoalsContext.Provider>
  );
}

export function useSharedGoalsContext() {
  const context = useContext(SharedGoalsContext);
  if (context === undefined) {
    throw new Error('useSharedGoalsContext must be used within a SharedGoalsProvider');
  }
  return context;
} 