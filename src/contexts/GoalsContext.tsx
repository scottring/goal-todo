import { createContext, useContext, ReactNode } from 'react';
import { useGoals } from '../hooks/useGoals';
import type { SourceActivity } from '../types';

interface GoalsContextType {
  goals: SourceActivity[];
  loading: boolean;
  error: Error | null;
  createGoal: (data: Omit<SourceActivity, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (goalId: string, data: Partial<SourceActivity>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function GoalsProvider({ children }: { children: ReactNode }) {
  const {
    goals,
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    refreshGoals
  } = useGoals();

  return (
    <GoalsContext.Provider
      value={{
        goals,
        loading,
        error,
        createGoal,
        updateGoal,
        deleteGoal,
        refreshGoals
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoalsContext() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error('useGoalsContext must be used within a GoalsProvider');
  }
  return context;
} 