import React, { createContext, useContext, useState, useEffect } from 'react';
import { Timestamp, where } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { WeeklyPlanningSession, TaskReviewItem } from '../types';
import { useAuth } from './AuthContext';

interface WeeklyPlanningContextType {
  currentSession: WeeklyPlanningSession | null;
  isLoading: boolean;
  error: string | null;
  startNewSession: () => Promise<void>;
  moveToReviewPhase: () => Promise<void>;
  moveToPlanningPhase: () => Promise<void>;
  completeSession: () => Promise<void>;
  updateTaskReview: (taskReview: TaskReviewItem) => Promise<void>;
  updateLongTermGoalReview: (goalId: string, madeProgress: boolean, adjustments?: string) => Promise<void>;
  updateSharedGoalReview: (goalId: string, completedTasks: string[], pendingTasks: string[]) => Promise<void>;
  sendTeamReminders: (goalId: string, userIds: string[]) => Promise<void>;
  addNextWeekTask: (taskId: string, priority: string, dueDate: Date) => Promise<void>;
  assignSharedGoalTask: (goalId: string, taskId: string, assignedTo: string, dueDate: Date) => Promise<void>;
  scheduleRecurringTask: (routineId: string, frequency: string, schedule: any) => Promise<void>;
  syncWithCalendar: () => Promise<void>;
}

const WeeklyPlanningContext = createContext<WeeklyPlanningContextType | undefined>(undefined);

export const WeeklyPlanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<WeeklyPlanningSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { getCollection, addDocument, updateDocument, getDocument } = useFirestore();

  useEffect(() => {
    if (user) {
      loadCurrentSession();
    }
  }, [user]);

  const loadCurrentSession = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

      const sessions = await getCollection<WeeklyPlanningSession>('weeklyPlanningSessions', [
        where('ownerId', '==', user?.uid),
        where('weekStartDate', '>=', Timestamp.fromDate(startOfWeek)),
        where('weekEndDate', '<=', Timestamp.fromDate(endOfWeek))
      ]);

      if (sessions.length > 0) {
        setCurrentSession(sessions[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewSession = async () => {
    try {
      setIsLoading(true);
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));

      const newSession: Omit<WeeklyPlanningSession, 'id'> = {
        ownerId: user!.uid,
        weekStartDate: Timestamp.fromDate(startOfWeek),
        weekEndDate: Timestamp.fromDate(endOfWeek),
        status: 'not_started',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        reviewPhase: {
          completedTasks: [],
          missedTasks: [],
          partiallyCompletedTasks: [],
          longTermGoalReviews: [],
          sharedGoalReviews: [],
          summary: {
            totalCompleted: 0,
            totalPushedForward: 0,
            totalMissed: 0,
            totalArchived: 0,
            totalClosed: 0
          }
        },
        planningPhase: {
          nextWeekTasks: [],
          sharedGoalAssignments: [],
          recurringTasks: [],
          calendarSyncStatus: {
            synced: false,
            syncedEvents: []
          }
        }
      };

      const sessionId = await addDocument('weeklyPlanningSessions', newSession);
      const session = await getDocument('weeklyPlanningSessions', sessionId);
      setCurrentSession(session as WeeklyPlanningSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const moveToReviewPhase = async () => {
    if (!currentSession) return;
    try {
      await updateDocument('weeklyPlanningSessions', currentSession.id, {
        status: 'review_phase',
        updatedAt: Timestamp.now()
      });
      setCurrentSession({ ...currentSession, status: 'review_phase' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const moveToPlanningPhase = async () => {
    if (!currentSession) return;
    try {
      await updateDocument('weeklyPlanningSessions', currentSession.id, {
        status: 'planning_phase',
        updatedAt: Timestamp.now()
      });
      setCurrentSession({ ...currentSession, status: 'planning_phase' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const completeSession = async () => {
    if (!currentSession) return;
    try {
      await updateDocument('weeklyPlanningSessions', currentSession.id, {
        status: 'completed',
        updatedAt: Timestamp.now()
      });
      setCurrentSession({ ...currentSession, status: 'completed' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateTaskReview = async (taskReview: TaskReviewItem) => {
    if (!currentSession) return;
    try {
      const updatedSession = { ...currentSession };
      // Implementation details for updating task review
      await updateDocument('weeklyPlanningSessions', currentSession.id, updatedSession);
      setCurrentSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Additional implementation methods...

  const value = {
    currentSession,
    isLoading,
    error,
    startNewSession,
    moveToReviewPhase,
    moveToPlanningPhase,
    completeSession,
    updateTaskReview,
    updateLongTermGoalReview: async () => {}, // TODO: Implement
    updateSharedGoalReview: async () => {}, // TODO: Implement
    sendTeamReminders: async () => {}, // TODO: Implement
    addNextWeekTask: async () => {}, // TODO: Implement
    assignSharedGoalTask: async () => {}, // TODO: Implement
    scheduleRecurringTask: async () => {}, // TODO: Implement
    syncWithCalendar: async () => {} // TODO: Implement
  };

  return (
    <WeeklyPlanningContext.Provider value={value}>
      {children}
    </WeeklyPlanningContext.Provider>
  );
};

export const useWeeklyPlanning = () => {
  const context = useContext(WeeklyPlanningContext);
  if (context === undefined) {
    throw new Error('useWeeklyPlanning must be used within a WeeklyPlanningProvider');
  }
  return context;
}; 