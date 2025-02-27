import { useState, useEffect } from 'react';
import { where, Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { timestampToDate } from '../utils/date';
import { getPrefixedCollection } from '../utils/environment';
import type { 
  Task, 
  Routine, 
  UserGoal, 
  SharedGoal, 
  RoutineWithoutSystemFields,
  DayOfWeek,
  DaySchedule,
  Timestamp,
  TaskDependency
} from '../types';

// Collection names using the utility function
const COLLECTIONS = {
  AREAS: 'areas',
  ACTIVITIES: 'activities',
  ROUTINES: 'routines',
  USER_GOALS: 'user_goals',
  SHARED_GOALS: 'shared_goals'
};

export interface ScheduledTask extends Task {
  source: {
    type: 'goal' | 'routine' | 'habit' | 'milestone' | 'standalone_task';
    goalName?: string;
    routineName?: string;
    milestoneName?: string;
  };
  isRoutine?: boolean;
  routineCompletionDate?: Timestamp;
  dependencies?: TaskDependency[];
  dependentTasks?: string[];
  complexity?: { level: 'high' | 'medium' | 'low' };
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval: number;
    daysOfWeek?: DaySchedule[];
    dayOfMonth?: number;
    skipDates?: Timestamp[];
    lastCompleted?: Timestamp;
    nextDue?: Timestamp;
  };
  progress?: {
    percentComplete: number;
    lastUpdated: Timestamp;
    status: 'not_started' | 'in_progress' | 'completed';
  };
}

const DAY_TO_NUMBER: Record<DayOfWeek, number> = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

const getDateFromTimestamp = (timestamp: Timestamp | FirebaseTimestamp | undefined): Date | null => {
  if (!timestamp) return null;
  
  // If it's a Firebase Timestamp (has toDate method)
  if ('toDate' in timestamp) {
    return timestamp.toDate();
  }
  
  // If it's our custom Timestamp
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
};

export const useScheduledTasks = () => {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { currentUser } = useAuth();
  const { goals } = useGoalsContext();
  const { userGoals } = useSharedGoalsContext();
  const { getCollection, updateDocument } = useFirestore();

  const generateRoutineTasks = (
    routines: (Routine | RoutineWithoutSystemFields | string)[],
    goalName?: string,
    milestoneName?: string
  ): ScheduledTask[] => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
    const todayTimestamp = FirebaseTimestamp.fromDate(today);

    return routines.flatMap(routineOrId => {
      // If routine is just an ID string, skip it
      if (typeof routineOrId === 'string') {
        return [];
      }

      const routine = routineOrId as Routine | RoutineWithoutSystemFields;

      // Skip if routine doesn't have required fields
      if (!routine.title || !routine.frequency || !routine.schedule) {
        return [];
      }

      // Skip if routine has an end date that's passed
      if (routine.endDate) {
        const endDate = getDateFromTimestamp(routine.endDate);
        if (endDate && endDate < today) {
          return [];
        }
      }

      // Get completions for this week
      const completionsThisWeek = (routine.completionDates || []).filter(date => {
        const completionDate = getDateFromTimestamp(date);
        return completionDate && completionDate >= weekStart && completionDate <= weekEnd;
      }).length;

      // Check if routine should be scheduled based on frequency
      let scheduledDays: Date[] = [];
      const dayOfWeek = today.getDay();
      const dayOfMonth = today.getDate();
      const month = today.getMonth();

      // Handle skipped dates
      const isDateSkipped = (date: Date) => {
        const skipDates = 'skipDates' in routine ? routine.skipDates : undefined;
        return skipDates?.some((skipDate: Timestamp) => {
          const skippedDate = getDateFromTimestamp(skipDate);
          return skippedDate && 
            skippedDate.getDate() === date.getDate() &&
            skippedDate.getMonth() === date.getMonth() &&
            skippedDate.getFullYear() === date.getFullYear();
        });
      };

      // Get the next due date based on pattern
      const getNextDueDate = (): Date | null => {
        if (!routine.schedule) return null;

        const lastCompleted = (routine.completionDates || [])[routine.completionDates?.length - 1];
        const lastCompletedDate = lastCompleted ? getDateFromTimestamp(lastCompleted) : null;

        switch (routine.frequency) {
          case 'daily':
            return today;
          case 'weekly':
            if (routine.schedule.daysOfWeek && routine.schedule.daysOfWeek.length > 0) {
              // Find the next scheduled day that hasn't been completed
              const nextDay = routine.schedule.daysOfWeek.find(ds => {
                const dayNum = DAY_TO_NUMBER[ds.day];
                if (dayNum < dayOfWeek) return false;
                if (dayNum === dayOfWeek) {
                  // If it's today, check if it's already been completed
                  return !lastCompletedDate || 
                    lastCompletedDate.getDate() !== today.getDate() ||
                    lastCompletedDate.getMonth() !== today.getMonth() ||
                    lastCompletedDate.getFullYear() !== today.getFullYear();
                }
                return true;
              });
              if (nextDay) {
                const nextDate = new Date(today);
                nextDate.setDate(today.getDate() + (DAY_TO_NUMBER[nextDay.day] - dayOfWeek));
                return nextDate;
              }
            }
            return null;
          case 'monthly':
            if (routine.schedule.dayOfMonth) {
              const nextDate = new Date(today);
              if (dayOfMonth <= routine.schedule.dayOfMonth) {
                nextDate.setDate(routine.schedule.dayOfMonth);
              } else {
                nextDate.setMonth(nextDate.getMonth() + 1);
                nextDate.setDate(routine.schedule.dayOfMonth);
              }
              return nextDate;
            }
            return null;
          default:
            return null;
        }
      };

      // Determine if we should show the task today
      const nextDueDate = getNextDueDate();
      if (!nextDueDate || isDateSkipped(nextDueDate)) return [];

      // Only add to scheduledDays if it's due today
      if (
        nextDueDate.getDate() === today.getDate() &&
        nextDueDate.getMonth() === today.getMonth() &&
        nextDueDate.getFullYear() === today.getFullYear()
      ) {
        scheduledDays.push(nextDueDate);
      }

      // Generate tasks for each scheduled day
      return scheduledDays.map(date => ({
        id: `${('id' in routine ? routine.id : crypto.randomUUID())}-${FirebaseTimestamp.fromDate(date).seconds}`,
        title: routine.title,
        description: routine.description || '',
        completed: false,
        priority: 'medium',
        status: 'not_started',
        ownerId: 'ownerId' in routine ? routine.ownerId : currentUser?.uid || '',
        createdAt: FirebaseTimestamp.fromDate(date),
        updatedAt: FirebaseTimestamp.fromDate(date),
        source: {
          type: milestoneName ? 'milestone' : 'routine',
          goalName,
          routineName: routine.title,
          milestoneName
        },
        isRoutine: true,
        routineCompletionDate: todayTimestamp,
        recurrence: {
          pattern: routine.frequency,
          interval: routine.schedule.targetCount,
          daysOfWeek: routine.schedule.daysOfWeek,
          dayOfMonth: routine.schedule.dayOfMonth,
          skipDates: 'skipDates' in routine ? routine.skipDates : undefined,
          lastCompleted: (routine.completionDates || [])[routine.completionDates?.length - 1],
          nextDue: nextDueDate ? FirebaseTimestamp.fromDate(nextDueDate) : undefined
        },
        progress: {
          percentComplete: 0,
          lastUpdated: todayTimestamp,
          status: 'not_started'
        },
        sharedWith: [],
        permissions: {}
      }));
    });
  };

  const fetchScheduledTasks = async () => {
    if (!currentUser) {
      console.log('No current user, skipping task fetch');
      setScheduledTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching scheduled tasks for user:', currentUser.uid);
      
      // Combine tasks from all sources
      const allTasks: ScheduledTask[] = [];
      
      // Process both regular goals and user goals
      const allGoals = [...goals, ...userGoals];
      console.log(`Processing ${allGoals.length} goals`);
      
      allGoals.forEach((goal) => {
        console.log(`Processing goal: ${goal.name}`);
        
        // Process tasks from milestones first
        if (goal.milestones && Array.isArray(goal.milestones)) {
          goal.milestones.forEach((milestone) => {
            console.log(`Processing milestone: ${milestone.name}`);
            
            // Add milestone tasks
            if (goal.tasks && Array.isArray(goal.tasks)) {
              const milestoneTasks = goal.tasks
                .filter((task: Task) => task.milestoneId === milestone.id)
                .map((task: Task) => ({
                  ...task,
                  source: {
                    type: 'milestone' as const,
                    goalName: goal.name,
                    milestoneName: milestone.name
                  }
                }));
              console.log(`Added ${milestoneTasks.length} milestone tasks`);
              allTasks.push(...milestoneTasks);
            }

            // Add milestone routines if they exist
            if (milestone.routines) {
              const milestoneRoutineTasks = generateRoutineTasks(
                milestone.routines as (Routine | RoutineWithoutSystemFields | string)[],
                goal.name,
                milestone.name
              );
              console.log(`Added ${milestoneRoutineTasks.length} milestone routine tasks`);
              allTasks.push(...milestoneRoutineTasks);
            }
          });
        }

        // Add independent tasks
        if (goal.tasks && Array.isArray(goal.tasks)) {
          const independentTasks = goal.tasks
            .filter((task: Task) => !task.milestoneId)
            .map((task: Task) => ({
              ...task,
              source: {
                type: 'goal' as const,
                goalName: goal.name
              }
            }));
          console.log(`Added ${independentTasks.length} independent tasks`);
          allTasks.push(...independentTasks);
        }

        // Add routine-generated tasks
        if (goal.routines && Array.isArray(goal.routines)) {
          const routineTasks = generateRoutineTasks(goal.routines, goal.name);
          console.log(`Added ${routineTasks.length} routine tasks`);
          allTasks.push(...routineTasks);
        }
      });

      // Fetch standalone tasks from activities collection
      try {
        const activitiesCollection = getPrefixedCollection(COLLECTIONS.ACTIVITIES);
        console.log('Fetching standalone tasks from collection:', activitiesCollection);
        const standaloneActivities = await getCollection(COLLECTIONS.ACTIVITIES, [
          where('type', '==', 'standalone_task'),
          where('ownerId', '==', currentUser.uid)
        ]);
        
        console.log('Standalone activities fetched:', standaloneActivities.length);

        // Convert standalone activities to scheduled tasks
        const standaloneTasks = standaloneActivities.map(activity => {
          return {
            id: activity.id,
            title: activity.name,
            description: activity.description || '',
            completed: activity.completed || false,
            priority: activity.priority || 'medium',
            status: activity.status || 'not_started',
            dueDate: activity.dueDate,
            createdAt: activity.createdAt,
            updatedAt: activity.updatedAt,
            ownerId: activity.ownerId,
            sharedWith: activity.sharedWith || [],
            permissions: activity.permissions || {},
            source: {
              type: 'standalone_task' as const
            }
          } as ScheduledTask;
        });

        console.log('Processed standalone tasks:', standaloneTasks.length);
        allTasks.push(...standaloneTasks);
      } catch (err) {
        console.error('Error fetching standalone tasks:', err);
        // Continue with other tasks even if standalone tasks fail
      }

      // Process dependencies
      allTasks.forEach((task: ScheduledTask) => {
        if (task.dependencies) {
          // Find all tasks that depend on this task
          const dependentTasks = allTasks
            .filter((t: ScheduledTask) => t.dependencies?.some((d: TaskDependency) => d.taskId === task.id))
            .map(t => t.id);
          task.dependentTasks = dependentTasks;
        }
      });

      console.log(`Total tasks processed: ${allTasks.length}`);
      setScheduledTasks(allTasks);
      setError(null);
    } catch (err) {
      console.error('Error fetching scheduled tasks:', err);
      setError(err as Error);
      // Don't clear existing tasks on error to maintain UI state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchScheduledTasks();
    } else {
      setScheduledTasks([]);
      setLoading(false);
      setError(null);
    }
  }, [currentUser, goals, userGoals]);

  const completeTask = async (taskId: string): Promise<void> => {
    if (!currentUser) throw new Error('User must be authenticated to complete a task');

    try {
      console.log('Completing task:', taskId);
      
      setLoading(true);
      const task = scheduledTasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      console.log('Found task:', task);

      if (task.isRoutine) {
        console.log('Completing routine task');
        // For routines, update the completion dates array
        const goal = goals.find(g => g.routines.some((r: Routine) => r.title === task.source.routineName)) ||
                    userGoals.find(g => g.routines.some((r: Routine) => r.title === task.source.routineName));
        
        if (!goal) {
          console.error('Goal not found for routine:', task.source.routineName);
          return;
        }
        
        const routine = goal.routines.find((r: Routine) => r.title === task.source.routineName);
        if (!routine) {
          console.error('Routine not found in goal:', task.source.routineName);
          return;
        }

        console.log('Found routine:', routine);
        console.log('Current completion dates:', routine.completionDates || []);
        
        // Ensure completionDates is an array
        const currentCompletionDates = Array.isArray(routine.completionDates) ? routine.completionDates : [];
        
        const updatedRoutine = {
          ...routine,
          completionDates: [...currentCompletionDates, task.routineCompletionDate!]
        };

        console.log('Updated completion dates:', updatedRoutine.completionDates);

        const updatedRoutines = goal.routines.map((r: Routine) =>
          r.title === task.source.routineName ? updatedRoutine : r
        );

        if ('parentGoalId' in goal) {
          console.log('Updating user goal routine');
          await updateDocument(getPrefixedCollection(COLLECTIONS.USER_GOALS), goal.id, { routines: updatedRoutines });
        } else {
          console.log('Updating activity routine');
          await updateDocument(getPrefixedCollection(COLLECTIONS.ACTIVITIES), goal.id, { routines: updatedRoutines });
        }
      } else {
        console.log('Completing regular task');
        // For regular tasks, update the task's completed status
        const goal = goals.find(g => g.tasks.some((t: Task) => t.id === taskId)) ||
                    userGoals.find(g => g.tasks.some((t: Task) => t.id === taskId));
        
        if (!goal) {
          console.error('Goal not found for task:', taskId);
          return;
        }

        console.log('Found goal:', goal.name);
        
        // Find the existing task to preserve its notes
        const existingTask = goal.tasks.find((t: Task) => t.id === taskId);
        if (!existingTask) {
          console.error('Task not found in goal:', taskId);
          return;
        }
        
        console.log('Existing task:', existingTask);
        
        const updatedTasks = goal.tasks.map((t: Task) =>
          t.id === taskId ? { 
            ...t, 
            completed: !t.completed, // Toggle the completed status
            updatedAt: FirebaseTimestamp.now(),
            notes: existingTask?.notes
          } : t
        );

        console.log('Updated tasks:', updatedTasks);

        if ('parentGoalId' in goal) {
          console.log('Updating user goal task');
          await updateDocument(getPrefixedCollection(COLLECTIONS.USER_GOALS), goal.id, { tasks: updatedTasks });
        } else {
          console.log('Updating activity routine');
          await updateDocument(getPrefixedCollection(COLLECTIONS.ACTIVITIES), goal.id, { tasks: updatedTasks });
        }
      }

      // Update local state immediately to reflect the change in UI
      setScheduledTasks(prevTasks => 
        prevTasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              completed: !t.completed,
              updatedAt: FirebaseTimestamp.now()
            };
          }
          return t;
        })
      );

      // Refresh the tasks list
      await fetchScheduledTasks();
    } catch (err) {
      console.error('Error completing task:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    scheduledTasks,
    loading,
    error,
    completeTask,
    refreshTasks: fetchScheduledTasks
  };
};

