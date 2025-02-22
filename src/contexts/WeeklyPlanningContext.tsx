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
  TaskPriority,
  RoutineSchedule
} from '../types';
import { useAuth } from './AuthContext';
import { useGoalsContext } from './GoalsContext';
import { 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameWeek, 
  isSunday,
  nextSunday,
  previousSunday,
  isAfter,
  isBefore,
  startOfDay,
  addWeeks,
  max
} from 'date-fns';
import { dateToTimestamp, timestampToDate, now } from '../utils/date';
import { toFirebaseTimestamp, fromFirebaseTimestamp, convertToFirebaseTimestamp, convertFromFirebaseTimestamp } from '../utils/firebase-adapter';
import { updateDocument, getDocument } from '../utils/firestore';
import { v4 as uuidv4 } from 'uuid';

export interface UnscheduledItem {
  id: string;
  type: 'task' | 'routine' | 'milestone';
  title: string;
  description?: string;
  goalId?: string;
  goalName?: string;
  priority?: string;
  suggestedDate?: Date;
}

export interface WeeklyPlanningContextType {
  currentSession: WeeklyPlanningSession | null;
  isLoading: boolean;
  error: string | null;
  unscheduledItems: UnscheduledItem[];
  startNewSession: (reviewStartDate?: Date) => Promise<void>;
  moveToReviewPhase: () => Promise<void>;
  moveToPlanningPhase: () => Promise<void>;
  completeSession: () => Promise<void>;
  updateTaskReview: (task: TaskReviewItem) => Promise<void>;
  updateLongTermGoalReview: (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => Promise<void>;
  updateSharedGoalReview: (goalId: string, completedTasks: string[], pendingTasks: string[]) => Promise<void>;
  sendTeamReminders: (goalId: string, userIds: string[]) => Promise<void>;
  syncWithCalendar: () => Promise<void>;
  updateSession: (session: WeeklyPlanningSession) => Promise<void>;
  addNextWeekTask: (taskId: string, priority: TaskPriority, date: Date, timeSlot?: { start: Date; end: Date }) => Promise<void>;
  scheduleRecurringTask: (routineId: string, frequency: string, schedule: RoutineSchedule) => Promise<void>;
  fetchUnscheduledItems: () => Promise<void>;
  getScheduleSuggestions: (item: UnscheduledItem) => Date[];
  getLastReviewDate: () => Promise<Date | null>;
  updateDateRanges: (reviewStart: Date, planningStart: Date, planningEnd: Date) => Promise<void>;
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

const getWeekBoundaries = (currentDate: Date = new Date()): { weekStart: Date; weekEnd: Date } => {
  const today = startOfDay(currentDate);
  const nextSundayDate = nextSunday(today);
  const prevSundayDate = previousSunday(today);
  
  // If today is Sunday, use today as start and next Sunday as end
  if (isSunday(today)) {
    return {
      weekStart: today,
      weekEnd: nextSundayDate
    };
  }
  
  // If we're within 3 days after the previous Sunday
  const threeDaysAfterPrevSunday = addDays(prevSundayDate, 3);
  if (isBefore(today, threeDaysAfterPrevSunday)) {
    return {
      weekStart: prevSundayDate,
      weekEnd: nextSundayDate
    };
  }
  
  // If we're within 3 days before next Sunday
  const threeDaysBeforeNextSunday = addDays(nextSundayDate, -3);
  if (isAfter(today, threeDaysBeforeNextSunday)) {
    return {
      weekStart: today,
      weekEnd: nextSundayDate
    };
  }
  
  // For days in the middle of the week, start from today
  return {
    weekStart: today,
    weekEnd: nextSundayDate
  };
};

export const WeeklyPlanningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<WeeklyPlanningSession | null>(null);
  const [unscheduledItems, setUnscheduledItems] = useState<UnscheduledItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { goals } = useGoalsContext();
  const { getCollection, addDocument, getDocument } = useFirestore();

  useEffect(() => {
    if (currentUser) {
      loadCurrentSession();
    }
  }, [currentUser]);

  const loadCurrentSession = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      const sessions = await getCollection<WeeklyPlanningSession>('weeklyPlanningSessions', [
        where('ownerId', '==', currentUser.uid),
        where('weekStartDate', '>=', Timestamp.fromDate(weekStart)),
        where('weekEndDate', '<=', Timestamp.fromDate(weekEnd))
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

  const getLastReviewDate = async (): Promise<Date | null> => {
    if (!currentUser) return null;
    
    try {
      const sessions = await getCollection<WeeklyPlanningSession>('weeklyPlanningSessions', [
        where('ownerId', '==', currentUser.uid),
        where('status', '==', 'completed')
      ]);
      
      if (sessions.length === 0) return null;
      
      // Find the most recent completed session
      const lastSession = sessions.reduce((latest, current) => {
        const currentDate = timestampToDate(current.weekEndDate);
        const latestDate = timestampToDate(latest.weekEndDate);
        return currentDate > latestDate ? current : latest;
      });
      
      return timestampToDate(lastSession.weekEndDate);
    } catch (err) {
      console.error('Error getting last review date:', err);
      return null;
    }
  };

  const getOptimalDateRanges = async (): Promise<{
    reviewStart: Date;
    planningStart: Date;
    planningEnd: Date;
  }> => {
    const today = startOfDay(new Date());
    const lastReviewDate = await getLastReviewDate();
    const nextSundayDate = nextSunday(today);
    
    // Review phase: start from last review or a week ago if no previous review
    const reviewStart = lastReviewDate 
      ? max([lastReviewDate, addWeeks(today, -1)])
      : addWeeks(today, -1);
    
    // Planning phase: start from current date, end on next Sunday
    const planningStart = today;
    const planningEnd = nextSundayDate;
    
    return {
      reviewStart,
      planningStart,
      planningEnd
    };
  };

  const startNewSession = async (reviewStartDate?: Date) => {
    if (!currentUser) {
      setError('User must be authenticated to start a session');
      return;
    }

    try {
      setIsLoading(true);
      const dateRanges = await getOptimalDateRanges();
      const reviewStart = reviewStartDate || dateRanges.reviewStart;
      
      const newSession: Omit<WeeklyPlanningSession, 'id'> = {
        ownerId: currentUser.uid,
        weekStartDate: Timestamp.fromDate(reviewStart),
        weekEndDate: Timestamp.fromDate(dateRanges.planningEnd),
        status: 'not_started',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        reviewPhase: {
          startDate: Timestamp.fromDate(reviewStart),
          endDate: Timestamp.fromDate(dateRanges.planningStart),
          completedTasks: [],
          missedTasks: [],
          partiallyCompletedTasks: [],
          taskReviews: [],
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
          startDate: Timestamp.fromDate(dateRanges.planningStart),
          endDate: Timestamp.fromDate(dateRanges.planningEnd),
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

  const updateTaskReview = async (task: TaskReviewItem) => {
    if (!currentSession) return;
    try {
      const updatedSession = { ...currentSession };
      const taskIndex = updatedSession.reviewPhase.taskReviews.findIndex(
        t => t.taskId === task.taskId
      );

      if (taskIndex === -1) {
        console.error('Task not found:', task.taskId);
        return;
      }

      // Convert any Firebase timestamps to our custom timestamps
      const taskToUpdate = {
        ...task,
        originalDueDate: 'toDate' in task.originalDueDate ? fromFirebaseTimestamp(task.originalDueDate as any) : task.originalDueDate,
        completedDate: task.completedDate && 'toDate' in task.completedDate ? fromFirebaseTimestamp(task.completedDate as any) : task.completedDate
      };

      updatedSession.reviewPhase.taskReviews[taskIndex] = {
        ...updatedSession.reviewPhase.taskReviews[taskIndex],
        status: taskToUpdate.status,
        action: taskToUpdate.action,
        completedDate: taskToUpdate.status === 'completed' ? now() : undefined,
        priority: taskToUpdate.priority || 'medium'
      };

      await updateSession(updatedSession);
    } catch (error) {
      console.error('Error updating task review:', error);
      throw error;
    }
  };

  const fetchUnscheduledItems = async () => {
    if (!currentSession) return;
    try {
      const items: UnscheduledItem[] = [];

      // Get unscheduled tasks from review phase:
      // 1. Tasks that haven't been actioned yet
      // 2. Tasks that were explicitly pushed forward
      const reviewTasks = currentSession.reviewPhase?.taskReviews
        ?.filter((t: TaskReviewItem) => {
          // Include tasks that either:
          // - Haven't been actioned and aren't completed
          // - Were explicitly pushed forward to next week
          return (!t.action && !t.completedDate) || t.action === 'push_forward';
        })
        .map((t: TaskReviewItem) => ({
          id: t.taskId,
          type: 'task' as const,
          title: t.title,
          priority: t.priority,
          description: t.action === 'push_forward' ? 'Pushed forward from last week' : undefined
        })) || [];
      
      items.push(...reviewTasks);

      // Get unscheduled routines that need scheduling
      if (goals) {
        goals.forEach(goal => {
          // Add only weekly routines without specific days assigned
          const weeklyRoutines = goal.routines
            .filter(routine => 
              'frequency' in routine && 
              routine.frequency === 'weekly' && 
              (!routine.schedule.daysOfWeek || routine.schedule.daysOfWeek.length === 0)
            )
            .map(routine => ({
              id: 'id' in routine ? routine.id : uuidv4(),
              type: 'routine' as const,
              title: routine.title,
              description: routine.description,
              goalId: goal.id,
              goalName: goal.name
            }));
          
          items.push(...weeklyRoutines);

          // Add milestones without specific dates or with dates in the upcoming week
          const unscheduledMilestones = goal.milestones
            .filter(milestone => 
              !milestone.targetDate || 
              (milestone.targetDate && isSameWeek(timestampToDate(milestone.targetDate), new Date()))
            )
            .map(milestone => ({
              id: milestone.id,
              type: 'milestone' as const,
              title: milestone.name,
              description: milestone.successCriteria,
              goalId: goal.id,
              goalName: goal.name
            }));
          
          items.push(...unscheduledMilestones);
        });
      }

      setUnscheduledItems(items);
    } catch (error) {
      console.error('Error fetching unscheduled items:', error);
      throw error;
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
    // TODO: Implement actual scheduling suggestions
    const suggestions: Date[] = [];
    const today = new Date();
    
    // Add some default suggestions
    for (let i = 0; i < 3; i++) {
      const suggestion = new Date(today);
      suggestion.setDate(today.getDate() + i);
      suggestion.setHours(9 + i * 2, 0, 0, 0); // Suggest 9am, 11am, 1pm
      suggestions.push(suggestion);
    }
    
    return suggestions;
  };

  const addNextWeekTask = async (
    taskId: string,
    priority: TaskPriority,
    date: Date,
    timeSlot?: { start: Date; end: Date }
  ) => {
    if (!currentSession) return;

    try {
      const updatedSession = { ...currentSession };
      
      // Initialize arrays if they don't exist
      if (!updatedSession.planningPhase) {
        updatedSession.planningPhase = {
          nextWeekTasks: [],
          sharedGoalAssignments: [],
          recurringTasks: [],
          calendarSyncStatus: { synced: false, syncedEvents: [] }
        };
      }

      // Add the task with our custom Timestamp
      updatedSession.planningPhase.nextWeekTasks.push({
        taskId,
        priority: priority as TaskPriority,
        dueDate: dateToTimestamp(date)
      });

      // Add calendar event if timeSlot is provided
      if (timeSlot) {
        const calendarEvent = {
          eventId: `task_${taskId}`,
          taskId,
          startTime: dateToTimestamp(timeSlot.start),
          endTime: dateToTimestamp(timeSlot.end)
        };
        updatedSession.planningPhase.calendarSyncStatus.syncedEvents.push(calendarEvent);
      }

      // Convert timestamps before saving to Firestore
      const sessionToSave = {
        ...updatedSession,
        planningPhase: {
          ...updatedSession.planningPhase,
          nextWeekTasks: updatedSession.planningPhase.nextWeekTasks.map(t => ({
            ...t,
            dueDate: toFirebaseTimestamp(t.dueDate)
          })),
          calendarSyncStatus: {
            ...updatedSession.planningPhase.calendarSyncStatus,
            syncedEvents: updatedSession.planningPhase.calendarSyncStatus.syncedEvents.map(e => ({
              ...e,
              startTime: toFirebaseTimestamp(e.startTime),
              endTime: toFirebaseTimestamp(e.endTime)
            }))
          }
        }
      };

      await updateSession(sessionToSave);
    } catch (error) {
      console.error('Error adding next week task:', error);
      throw error;
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

  const updateSession = async (session: WeeklyPlanningSession) => {
    if (!session) return;

    try {
      // Convert our custom Timestamps to Firebase Timestamps before saving
      const sessionToSave = {
        ...session,
        reviewPhase: session.reviewPhase ? {
          ...session.reviewPhase,
          taskReviews: session.reviewPhase.taskReviews?.map((t: TaskReviewItem) => ({
            taskId: t.taskId,
            title: t.title,
            status: t.status,
            originalDueDate: convertToFirebaseTimestamp(t.originalDueDate),
            action: t.action,
            completedDate: t.completedDate ? convertToFirebaseTimestamp(t.completedDate) : null,
            priority: t.priority
          })).filter(t => t.taskId && t.title && t.status && t.originalDueDate && t.priority)
        } : null,
        planningPhase: session.planningPhase ? {
          ...session.planningPhase,
          nextWeekTasks: session.planningPhase.nextWeekTasks?.map((t: any) => ({
            taskId: t.taskId,
            priority: t.priority,
            dueDate: convertToFirebaseTimestamp(t.dueDate)
          })).filter(t => t.taskId && t.priority && t.dueDate),
          calendarSyncStatus: session.planningPhase.calendarSyncStatus ? {
            ...session.planningPhase.calendarSyncStatus,
            lastSyncedAt: session.planningPhase.calendarSyncStatus.lastSyncedAt ? 
              convertToFirebaseTimestamp(session.planningPhase.calendarSyncStatus.lastSyncedAt) : null,
            syncedEvents: session.planningPhase.calendarSyncStatus.syncedEvents?.map((e: any) => ({
              eventId: e.eventId,
              taskId: e.taskId,
              startTime: convertToFirebaseTimestamp(e.startTime),
              endTime: convertToFirebaseTimestamp(e.endTime)
            })).filter(e => e.eventId && e.taskId && e.startTime && e.endTime)
          } : null
        } : null
      };

      // Remove any null or undefined values
      const cleanedSession = JSON.parse(JSON.stringify(sessionToSave));

      await updateDocument('weeklyPlanningSessions', session.id, cleanedSession);
      setCurrentSession(session);
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  };

  const updateSharedGoalReview = async (goalId: string, completedTasks: string[], pendingTasks: string[]) => {
    try {
      setIsLoading(true);
      if (!currentSession) throw new Error('No active session');

      const updatedSession = { ...currentSession };
      const sharedGoalReview = updatedSession.reviewPhase.sharedGoalReviews.find(
        review => review.goalId === goalId
      );

      if (sharedGoalReview) {
        sharedGoalReview.completedTasks = completedTasks;
        sharedGoalReview.pendingTasks = pendingTasks;
        await updateSession(updatedSession);
      }
    } catch (error) {
      console.error('Error updating shared goal review:', error);
      setError('Failed to update shared goal review');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateDateRanges = async (
    reviewStart: Date,
    planningStart: Date,
    planningEnd: Date
  ) => {
    if (!currentSession) return;

    try {
      const updatedSession = {
        ...currentSession,
        reviewPhase: {
          ...currentSession.reviewPhase,
          startDate: Timestamp.fromDate(reviewStart),
          endDate: Timestamp.fromDate(planningStart)
        },
        planningPhase: {
          ...currentSession.planningPhase,
          startDate: Timestamp.fromDate(planningStart),
          endDate: Timestamp.fromDate(planningEnd)
        }
      };

      await updateSession(updatedSession);
    } catch (err) {
      console.error('Error updating date ranges:', err);
      setError('Failed to update date ranges');
    }
  };

  const value: WeeklyPlanningContextType = {
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
    updateSharedGoalReview,
    sendTeamReminders: async () => {}, // TODO: Implement
    syncWithCalendar: async () => {}, // TODO: Implement
    updateSession,
    addNextWeekTask,
    scheduleRecurringTask: async () => {}, // TODO: Implement
    fetchUnscheduledItems,
    getScheduleSuggestions,
    getLastReviewDate,
    updateDateRanges
  };

  return (
    <WeeklyPlanningContext.Provider value={value}>
      {children}
    </WeeklyPlanningContext.Provider>
  );
};

export const useWeeklyPlanning = () => {
  const context = useContext(WeeklyPlanningContext);
  if (!context) {
    throw new Error('useWeeklyPlanning must be used within a WeeklyPlanningProvider');
  }
  return context;
}; 