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

      // Get all scheduled days for this week based on pattern
      const getScheduledDaysForWeek = (): Date[] => {
        if (!routine.schedule) return [];
        const scheduledDates: Date[] = [];
        
        switch (routine.frequency) {
          case 'daily':
            // Add each day of the current week
            for (let i = 0; i < 7; i++) {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + i);
              
              // Skip if the date is before today or is a skipped date
              if (date < today || isDateSkipped(date)) continue;
              
              // Skip if the date is after the end date
              if (routine.endDate) {
                const endDate = getDateFromTimestamp(routine.endDate);
                if (endDate && date > endDate) continue;
              }
              
              scheduledDates.push(date);
            }
            break;
            
          case 'weekly':
            if (routine.schedule.daysOfWeek && routine.schedule.daysOfWeek.length > 0) {
              // For each day of the week in the schedule
              routine.schedule.daysOfWeek.forEach(ds => {
                const dayNum = DAY_TO_NUMBER[ds.day];
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + dayNum);
                
                // Skip if the date is before today or is a skipped date
                if (date < today || isDateSkipped(date)) return;
                
                // Skip if the date is after the end date
                if (routine.endDate) {
                  const endDate = getDateFromTimestamp(routine.endDate);
                  if (endDate && date > endDate) return;
                }
                
                // Check if this occurrence has already been completed
                const isCompleted = (routine.completionDates || []).some(completionDate => {
                  const completed = getDateFromTimestamp(completionDate);
                  return completed && 
                    completed.getDate() === date.getDate() &&
                    completed.getMonth() === date.getMonth() &&
                    completed.getFullYear() === date.getFullYear();
                });
                
                if (!isCompleted) {
                  scheduledDates.push(date);
                }
              });
            }
            break;
            
          case 'monthly':
            if (routine.schedule.dayOfMonth) {
              // Check if the day of month occurs in the current week
              const currentMonth = today.getMonth();
              const currentYear = today.getFullYear();
              
              // Create date for this month's occurrence
              const thisMonth = new Date(currentYear, currentMonth, routine.schedule.dayOfMonth);
              
              // Create date for next month's occurrence (in case this month's is past but next month's is in this week)
              const nextMonth = new Date(currentYear, currentMonth + 1, routine.schedule.dayOfMonth);
              
              // Check if either date falls within this week and is not before today
              if (thisMonth >= today && thisMonth <= weekEnd && !isDateSkipped(thisMonth)) {
                scheduledDates.push(thisMonth);
              }
              
              if (nextMonth <= weekEnd && !isDateSkipped(nextMonth)) {
                scheduledDates.push(nextMonth);
              }
            }
            break;
        }
        
        return scheduledDates;
      };

      // Get all scheduled days for this week
      scheduledDays = getScheduledDaysForWeek();
      if (scheduledDays.length === 0) return [];

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
        routineCompletionDate: FirebaseTimestamp.fromDate(date), // Use the actual scheduled date
        dueDate: FirebaseTimestamp.fromDate(date), // Add dueDate to make it show up in the correct section
        recurrence: {
          pattern: routine.frequency,
          interval: routine.schedule.targetCount,
          daysOfWeek: routine.schedule.daysOfWeek,
          dayOfMonth: routine.schedule.dayOfMonth,
          skipDates: 'skipDates' in routine ? routine.skipDates : undefined,
          lastCompleted: (routine.completionDates || [])[routine.completionDates?.length - 1],
          nextDue: FirebaseTimestamp.fromDate(date)
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
      console.log('Current user ID:', currentUser.uid);
      
      // Find the task
      const task = scheduledTasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      // Update local state FIRST to ensure UI is responsive
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

      // Set loading state AFTER updating UI
      setLoading(true);

      console.log('Found task:', task);
      console.log('Task owner ID:', task.ownerId);
      console.log('Is current user the owner?', currentUser.uid === task.ownerId);
      
      if (task.permissions) {
        console.log('Task permissions:', task.permissions);
        console.log('Current user has edit permission?', 
          task.permissions[currentUser.uid] && task.permissions[currentUser.uid].edit);
      }

      // Now attempt to update the database
      try {
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
          if ('ownerId' in goal) {
            console.log('Goal owner ID:', goal.ownerId);
            console.log('Is current user the goal owner?', currentUser.uid === goal.ownerId);
          }
          
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

          const collectionName = 'parentGoalId' in goal 
            ? getPrefixedCollection(COLLECTIONS.USER_GOALS) 
            : getPrefixedCollection(COLLECTIONS.ACTIVITIES);
          
          console.log('Updating document in collection:', collectionName);
          console.log('Document ID:', goal.id);

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
          if ('ownerId' in goal) {
            console.log('Goal owner ID:', goal.ownerId);
            console.log('Is current user the goal owner?', currentUser.uid === goal.ownerId);
          }
          
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

          const collectionName = 'parentGoalId' in goal 
            ? getPrefixedCollection(COLLECTIONS.USER_GOALS) 
            : getPrefixedCollection(COLLECTIONS.ACTIVITIES);
          
          console.log('Updating document in collection:', collectionName);
          console.log('Document ID:', goal.id);

          if ('parentGoalId' in goal) {
            console.log('Updating user goal task');
            await updateDocument(getPrefixedCollection(COLLECTIONS.USER_GOALS), goal.id, { tasks: updatedTasks });
          } else {
            console.log('Updating activity routine');
            await updateDocument(getPrefixedCollection(COLLECTIONS.ACTIVITIES), goal.id, { tasks: updatedTasks });
          }
        }
      } catch (dbError) {
        // Log the database error but don't revert the UI state
        console.error('Database update failed, but UI will remain updated:', dbError);
        // We're intentionally not throwing here to keep the UI responsive
      }
    } catch (err) {
      console.error('Error completing task:', err);
      setError(err as Error);
      // Don't throw here to prevent UI from reverting
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

