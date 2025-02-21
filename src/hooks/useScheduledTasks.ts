import { useState, useEffect } from 'react';
import { where, Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { timestampToDate } from '../utils/date';
import type { 
  Task, 
  Routine, 
  UserGoal, 
  SharedGoal, 
  RoutineWithoutSystemFields,
  DayOfWeek,
  DaySchedule,
  Timestamp
} from '../types';

export interface ScheduledTask extends Task {
  source: {
    type: 'goal' | 'routine' | 'habit';
    goalName?: string;
    routineName?: string;
    milestoneName?: string;
  };
  isRoutine?: boolean;
  routineCompletionDate?: Timestamp;
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
    routines: (Routine | RoutineWithoutSystemFields)[],
    goalName: string
  ): ScheduledTask[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = FirebaseTimestamp.fromDate(today);
    
    // Get start and end of current week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
    
    return routines.flatMap(routine => {
      // Skip routines without system fields
      if (!('id' in routine)) return [];

      // Skip if routine has an end date that's passed
      if (routine.endDate) {
        const endDate = getDateFromTimestamp(routine.endDate);
        if (endDate && endDate < today) {
          return [];
        }
      }

      // Get completions for this week
      const completionsThisWeek = routine.completionDates.filter(date => {
        const completionDate = getDateFromTimestamp(date);
        return completionDate && completionDate >= weekStart && completionDate <= weekEnd;
      }).length;

      // Check if routine should be scheduled based on frequency
      let scheduledDays: Date[] = [];
      const dayOfWeek = today.getDay();
      const dayOfMonth = today.getDate();
      const month = today.getMonth();

      switch (routine.frequency) {
        case 'daily':
          scheduledDays.push(today);
          break;
        case 'weekly':
          // Check schedule.daysOfWeek if it exists
          const daysOfWeek = routine.schedule?.daysOfWeek;
          if (daysOfWeek && daysOfWeek.length > 0) {
            // Check if today matches any of the scheduled days
            const isScheduledToday = daysOfWeek.some(ds => DAY_TO_NUMBER[ds.day] === dayOfWeek);
            
            // If today is one of the scheduled days and we haven't met the target count
            if (isScheduledToday && completionsThisWeek < routine.targetCount) {
              scheduledDays.push(today);
            }
          } else {
            // Fallback: Schedule if behind on weekly target
            if (completionsThisWeek < routine.targetCount) {
              scheduledDays.push(today);
            }
          }
          break;
        case 'monthly':
          // Check if specific day of month is scheduled
          if (routine.schedule?.dayOfMonth) {
            if (dayOfMonth === routine.schedule.dayOfMonth) {
              scheduledDays.push(today);
            }
          } else {
            // Fallback: Schedule on 1st of month or if behind on monthly target
            const completionsThisMonth = routine.completionDates.filter(date => {
              const completionDate = getDateFromTimestamp(date);
              return completionDate && completionDate.getMonth() === month;
            }).length;
            if (dayOfMonth === 1 || completionsThisMonth < routine.targetCount) {
              scheduledDays.push(today);
            }
          }
          break;
        case 'quarterly':
          if (routine.schedule?.monthsOfYear?.includes(month + 1) && dayOfMonth === 1) {
            scheduledDays.push(today);
          }
          break;
        case 'yearly':
          if ((routine.schedule?.monthsOfYear?.[0] === month + 1 || month === 0) && dayOfMonth === 1) {
            scheduledDays.push(today);
          }
          break;
      }

      // Generate tasks for each scheduled day
      return scheduledDays.map(date => ({
        id: `${routine.id}-${FirebaseTimestamp.fromDate(date).seconds}`,
        title: routine.title,
        description: routine.description,
        completed: false,
        priority: 'medium',
        status: 'not_started',
        ownerId: routine.ownerId,
        createdAt: FirebaseTimestamp.fromDate(date),
        updatedAt: FirebaseTimestamp.fromDate(date),
        source: {
          type: 'routine',
          goalName,
          routineName: routine.title
        },
        isRoutine: true,
        routineCompletionDate: todayTimestamp,
        sharedWith: [],
        permissions: {}
      }));
    });
  };

  const fetchScheduledTasks = async () => {
    if (!currentUser) {
      setScheduledTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const allTasks: ScheduledTask[] = [];

      // Get tasks from regular goals
      goals.forEach(goal => {
        // Add tasks from milestones
        goal.milestones.forEach(milestone => {
          // Add milestone tasks
          const milestoneTasks = goal.tasks
            .filter(task => milestone.tasks.includes(task.id))
            .map(task => ({
              ...task,
              source: {
                type: 'goal' as const,
                goalName: goal.name,
                milestoneName: milestone.name
              }
            }));
          allTasks.push(...milestoneTasks);
        });

        // Add independent tasks (not associated with any milestone)
        const independentTasks = goal.tasks
          .filter(task => !goal.milestones.some(m => m.tasks.includes(task.id)))
          .map(task => ({
            ...task,
            source: {
              type: 'goal' as const,
              goalName: goal.name
            }
          }));
        allTasks.push(...independentTasks);

        // Add routine-generated tasks
        const routineTasks = generateRoutineTasks(goal.routines, goal.name);
        allTasks.push(...routineTasks);
      });

      // Get tasks from shared goals (user instances)
      userGoals.forEach(userGoal => {
        // Add tasks from milestones
        userGoal.milestones.forEach(milestone => {
          // Add milestone tasks
          const milestoneTasks = userGoal.tasks
            .filter(task => milestone.tasks.includes(task.id))
            .map(task => ({
              ...task,
              source: {
                type: 'goal' as const,
                goalName: userGoal.name,
                milestoneName: milestone.name
              }
            }));
          allTasks.push(...milestoneTasks);
        });

        // Add independent tasks (not associated with any milestone)
        const independentTasks = userGoal.tasks
          .filter(task => !userGoal.milestones.some(m => m.tasks.includes(task.id)))
          .map(task => ({
            ...task,
            source: {
              type: 'goal' as const,
              goalName: userGoal.name
            }
          }));
        allTasks.push(...independentTasks);

        // Add routine-generated tasks
        const routineTasks = generateRoutineTasks(userGoal.routines, userGoal.name);
        allTasks.push(...routineTasks);
      });

      // Sort tasks by:
      // 1. Overdue tasks first
      // 2. High priority tasks
      // 3. Due date
      // 4. Routines
      // 5. Creation date
      allTasks.sort((a, b) => {
        // Overdue tasks first
        const today = new Date();
        const aDate = getDateFromTimestamp(a.dueDate);
        const bDate = getDateFromTimestamp(b.dueDate);
        const aOverdue = aDate && aDate < today;
        const bOverdue = bDate && bDate < today;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // Priority next
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }

        // Due date
        if (aDate && bDate) {
          return aDate.getTime() - bDate.getTime();
        }
        if (aDate) return -1;
        if (bDate) return 1;

        // Routines after regular tasks
        if (a.isRoutine && !b.isRoutine) return 1;
        if (!a.isRoutine && b.isRoutine) return -1;

        // Finally, sort by creation date
        const aCreatedDate = getDateFromTimestamp(a.createdAt);
        const bCreatedDate = getDateFromTimestamp(b.createdAt);
        return (aCreatedDate?.getTime() || 0) - (bCreatedDate?.getTime() || 0);
      });

      setScheduledTasks(allTasks);
      setError(null);
    } catch (err) {
      console.error('Error fetching scheduled tasks:', err);
      setError(err as Error);
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

  const completeTask = async (taskId: string) => {
    if (!currentUser) throw new Error('User must be authenticated to complete a task');

    try {
      console.log('Completing task:', taskId);
      console.log('Found task:', scheduledTasks.find(t => t.id === taskId));
      
      setLoading(true);
      const task = scheduledTasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      if (task.isRoutine) {
        console.log('Completing routine task');
        // For routines, update the completion dates array
        const goal = goals.find(g => g.routines.some(r => r.title === task.source.routineName)) ||
                    userGoals.find(g => g.routines.some(r => r.title === task.source.routineName));
        
        if (!goal) {
          console.error('Goal not found for routine:', task.source.routineName);
          return;
        }
        
        const routine = goal.routines.find(r => r.title === task.source.routineName);
        if (!routine) {
          console.error('Routine not found in goal:', task.source.routineName);
          return;
        }

        console.log('Found routine:', routine);
        console.log('Current completion dates:', routine.completionDates);
        
        const updatedRoutine = {
          ...routine,
          completionDates: [...routine.completionDates, task.routineCompletionDate!]
        };

        console.log('Updated completion dates:', updatedRoutine.completionDates);

        const updatedRoutines = goal.routines.map(r =>
          r.title === task.source.routineName ? updatedRoutine : r
        );

        if ('parentGoalId' in goal) {
          console.log('Updating user goal routine');
          await updateDocument('user_goals', goal.id, { routines: updatedRoutines });
        } else {
          console.log('Updating activity routine');
          await updateDocument('activities', goal.id, { routines: updatedRoutines });
        }
      } else {
        console.log('Completing regular task');
        // For regular tasks, update the task's completed status
        const goal = goals.find(g => g.tasks.some(t => t.id === taskId)) ||
                    userGoals.find(g => g.tasks.some(t => t.id === taskId));
        
        if (!goal) {
          console.error('Goal not found for task:', taskId);
          return;
        }

        console.log('Found goal:', goal.name);
        
        // Find the existing task to preserve its notes
        const existingTask = goal.tasks.find(t => t.id === taskId);
        
        const updatedTasks = goal.tasks.map(t =>
          t.id === taskId ? { 
            ...t, 
            completed: true, 
            updatedAt: FirebaseTimestamp.now(),
            notes: existingTask?.notes // Preserve the notes when completing the task
          } : t
        );

        if ('parentGoalId' in goal) {
          console.log('Updating user goal task');
          await updateDocument('user_goals', goal.id, { tasks: updatedTasks });
        } else {
          console.log('Updating activity task');
          await updateDocument('activities', goal.id, { tasks: updatedTasks });
        }
      }

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
