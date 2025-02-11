import React, { createContext, useContext, useState, useEffect } from 'react';
import { Timestamp, where, query, collection, getDocs } from 'firebase/firestore';
import { useFirestore } from '../hooks/useFirestore';
import { 
  WeeklyPlanningSession, 
  TaskReviewItem, 
  Task, 
  Routine,
  RoutineWithoutSystemFields,
  SourceActivity,
  TaskPriority 
} from '../types';
import { useAuth } from './AuthContext';
import { useGoalsContext } from './GoalsContext';
import { startOfWeek, endOfWeek, addDays } from 'date-fns';

interface UnscheduledItem {
  id: string;
  type: 'task' | 'routine';
  title: string;
  description?: string;
  goalId?: string;
  goalName?: string;
  priority?: string;
  suggestedDate?: Date;
}

interface WeeklyPlanningContextType {
  currentSession: WeeklyPlanningSession | null;
  isLoading: boolean;
  error: string | null;
  unscheduledItems: UnscheduledItem[];
  startNewSession: () => Promise<void>;
  moveToReviewPhase: () => Promise<void>;
  moveToPlanningPhase: () => Promise<void>;
  completeSession: () => Promise<void>;
  updateTaskReview: (taskReview: TaskReviewItem) => Promise<void>;
  updateLongTermGoalReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => Promise<void>;
  updateSharedGoalReview: (goalId: string, completedTasks: string[], pendingTasks: string[]) => Promise<void>;
  sendTeamReminders: (goalId: string, userIds: string[]) => Promise<void>;
  addNextWeekTask: (taskId: string, priority: string, dueDate: Date, timeSlot?: { start: Date; end: Date }) => Promise<void>;
  assignSharedGoalTask: (goalId: string, taskId: string, assignedTo: string, dueDate: Date) => Promise<void>;
  scheduleRecurringTask: (routineId: string, frequency: string, schedule: any) => Promise<void>;
  syncWithCalendar: () => Promise<void>;
  fetchUnscheduledItems: () => Promise<void>;
  getScheduleSuggestions: (item: UnscheduledItem) => Date[];
}

const WeeklyPlanningContext = createContext<WeeklyPlanningContextType | undefined>(undefined);

const removeUndefinedFields = (obj: any): any => {
  const cleanObj = { ...obj };
  Object.keys(cleanObj).forEach(key => {
    if (cleanObj[key] === undefined) {
      delete cleanObj[key];
    } else if (typeof cleanObj[key] === 'object' && cleanObj[key] !== null) {
      cleanObj[key] = removeUndefinedFields(cleanObj[key]);
      if (Object.keys(cleanObj[key]).length === 0) {
        delete cleanObj[key];
      }
    }
  });
  return cleanObj;
};

export const WeeklyPlanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<WeeklyPlanningSession | null>(null);
  const [unscheduledItems, setUnscheduledItems] = useState<UnscheduledItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { goals } = useGoalsContext();
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

      // Get all tasks from goals
      const tasksToReview: TaskReviewItem[] = goals.flatMap(goal => 
        (Array.isArray(goal.tasks) ? goal.tasks : []).map(task => ({
          taskId: task.id,
          title: task.title,
          status: task.completed ? 'completed' : 'needs_review',
          originalDueDate: task.dueDate || Timestamp.now()
        }))
      );

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
          taskReviews: tasksToReview,  // Add tasks to review
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
      const taskIndex = updatedSession.reviewPhase.taskReviews.findIndex(
        t => t.taskId === taskReview.taskId
      );

      if (taskIndex === -1) return;

      // Update the task review with the new status and action
      updatedSession.reviewPhase.taskReviews[taskIndex] = {
        ...updatedSession.reviewPhase.taskReviews[taskIndex],
        status: taskReview.status,
        action: taskReview.action,
        completedDate: taskReview.status === 'completed' ? Timestamp.now() : undefined
      };

      // Update the summary counts
      const summary = updatedSession.reviewPhase.summary;
      switch (taskReview.action) {
        case 'mark_completed':
          summary.totalCompleted++;
          break;
        case 'push_forward':
          summary.totalPushedForward++;
          break;
        case 'mark_missed':
          summary.totalMissed++;
          break;
        case 'archive':
          summary.totalArchived++;
          break;
      }

      // Update the appropriate task lists
      switch (taskReview.action) {
        case 'mark_completed':
          updatedSession.reviewPhase.completedTasks.push(taskReview.taskId);
          break;
        case 'mark_missed':
          updatedSession.reviewPhase.missedTasks.push(taskReview.taskId);
          break;
        case 'push_forward':
          updatedSession.reviewPhase.partiallyCompletedTasks.push(taskReview.taskId);
          break;
      }

      // Clean the object before updating Firestore
      const cleanedSession = removeUndefinedFields(updatedSession);
      await updateDocument('weeklyPlanningSessions', currentSession.id, cleanedSession);
      setCurrentSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err; // Propagate error for UI handling
    }
  };

  const fetchUnscheduledItems = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const items: UnscheduledItem[] = [];

      // Fetch tasks from goals that don't have a dueDate
      for (const goal of goals) {
        const unscheduledTasks = goal.tasks
          .filter(task => !task.dueDate && !task.completed)
          .map(task => ({
            id: task.id,
            type: 'task' as const,
            title: task.title,
            description: task.description,
            goalId: goal.id,
            goalName: goal.name,
            priority: task.priority,
            suggestedDate: getSuggestedDateForTask(task, goal)
          }));
        
        items.push(...unscheduledTasks);

        // Get unscheduled routines
        const unscheduledRoutines = goal.routines
          .filter(routine => {
            const r = routine as Routine | RoutineWithoutSystemFields;
            return !r.schedule || !r.schedule.daysOfWeek?.length;
          })
          .map(routine => {
            const r = routine as Routine | RoutineWithoutSystemFields;
            return {
              id: 'id' in r ? r.id : `temp_${Math.random()}`,
              type: 'routine' as const,
              title: r.title,
              description: r.description,
              goalId: goal.id,
              goalName: goal.name,
              suggestedDate: getSuggestedDateForRoutine(r as Routine)
            };
          });

        items.push(...unscheduledRoutines);
      }

      setUnscheduledItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getSuggestedDateForTask = (task: Task, goal: SourceActivity): Date => {
    // Implementation for suggesting dates based on:
    // - Goal deadline if it exists
    // - Task dependencies
    // - Available time slots
    // - Task priority
    return new Date(); // Placeholder
  };

  const getSuggestedDateForRoutine = (routine: Routine): Date => {
    // Implementation for suggesting dates based on:
    // - Routine frequency
    // - Previous completion dates
    // - Available time slots
    return new Date(); // Placeholder
  };

  const getScheduleSuggestions = (item: UnscheduledItem): Date[] => {
    // Implementation for getting multiple date suggestions
    // based on item type, priority, and available slots
    return [new Date()]; // Placeholder
  };

  const addNextWeekTask = async (
    taskId: string,
    priority: string,
    dueDate: Date,
    timeSlot?: { start: Date; end: Date }
  ) => {
    if (!currentSession) return;

    try {
      const updatedSession = { ...currentSession };
      updatedSession.planningPhase.nextWeekTasks.push({
        taskId,
        priority: priority as TaskPriority,
        dueDate: Timestamp.fromDate(dueDate)
      });

      if (timeSlot) {
        updatedSession.planningPhase.calendarSyncStatus.syncedEvents.push({
          eventId: `task_${taskId}`,
          taskId,
          startTime: Timestamp.fromDate(timeSlot.start),
          endTime: Timestamp.fromDate(timeSlot.end)
        });
      }

      await updateDocument('weeklyPlanningSessions', currentSession.id, updatedSession);
      setCurrentSession(updatedSession);

      // Update the unscheduled items list
      setUnscheduledItems(prev => prev.filter(item => item.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updateLongTermGoalReview = async (
    goalId: string,
    madeProgress: boolean,
    adjustments?: string,
    nextReviewDate?: Date
  ) => {
    if (!currentSession) return;
    try {
      const updatedSession = { ...currentSession };
      const goalReviewIndex = updatedSession.reviewPhase.longTermGoalReviews.findIndex(
        review => review.goalId === goalId
      );

      const reviewData = {
        goalId,
        madeProgress,
        adjustments,
        nextReviewDate: nextReviewDate ? Timestamp.fromDate(nextReviewDate) : undefined
      };

      if (goalReviewIndex === -1) {
        updatedSession.reviewPhase.longTermGoalReviews.push(reviewData);
      } else {
        updatedSession.reviewPhase.longTermGoalReviews[goalReviewIndex] = reviewData;
      }

      const cleanedSession = removeUndefinedFields(updatedSession);
      await updateDocument('weeklyPlanningSessions', currentSession.id, cleanedSession);
      setCurrentSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const value = {
    currentSession,
    isLoading,
    error,
    unscheduledItems,
    startNewSession,
    moveToReviewPhase,
    moveToPlanningPhase,
    completeSession,
    updateTaskReview,
    updateLongTermGoalReview,
    updateSharedGoalReview: async () => {}, // TODO: Implement
    sendTeamReminders: async () => {}, // TODO: Implement
    addNextWeekTask,
    assignSharedGoalTask: async () => {}, // TODO: Implement
    scheduleRecurringTask: async () => {}, // TODO: Implement
    syncWithCalendar: async () => {}, // TODO: Implement
    fetchUnscheduledItems,
    getScheduleSuggestions
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