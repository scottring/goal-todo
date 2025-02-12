import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import type { 
  Task, 
  Routine, 
  UserGoal, 
  SharedGoal, 
  RoutineWithoutSystemFields,
  DayOfWeek,
  DaySchedule
} from '../types';

export interface ScheduledTask extends Task {
  source: {
    type: 'goal' | 'routine' | 'habit';
    goalName?: string;
    routineName?: string;
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
    const todayTimestamp = Timestamp.fromDate(today);
    
    // Get start and end of current week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
    
    return routines.flatMap(routine => {
      // Skip routines without system fields
      if (!('id' in routine)) return [];

      // Skip if routine has an end date that's passed
      if (routine.endDate && routine.endDate.toDate() < today) {
        return [];
      }

      // Get completions for this week
      const completionsThisWeek = routine.completionDates.filter(date => {
        const completionDate = date.toDate();
        return completionDate >= weekStart && completionDate <= weekEnd;
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
              const completionDate = date.toDate();
              return completionDate.getMonth() === month;
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
        id: `${routine.id}-${Timestamp.fromDate(date).seconds}`,
        title: routine.title,
        description: routine.description,
        completed: false,
        priority: 'medium',
        status: 'not_started',
        ownerId: routine.ownerId,
        createdAt: Timestamp.fromDate(date),
        updatedAt: Timestamp.fromDate(date),
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
        // Add regular tasks
        const goalTasks = goal.tasks.map(task => ({
          ...task,
          source: {
            type: 'goal' as const,
            goalName: goal.name
          }
        }));
        allTasks.push(...goalTasks);

        // Add routine-generated tasks
        const routineTasks = generateRoutineTasks(goal.routines, goal.name);
        allTasks.push(...routineTasks);
      });

      // Get tasks from shared goals (user instances)
      userGoals.forEach(userGoal => {
        // Add regular tasks
        const goalTasks = userGoal.tasks.map(task => ({
          ...task,
          source: {
            type: 'goal' as const,
            goalName: userGoal.name
          }
        }));
        allTasks.push(...goalTasks);

        // Add routine-generated tasks
        const routineTasks = generateRoutineTasks(userGoal.routines, userGoal.name);
        allTasks.push(...routineTasks);
      });

      // Filter tasks to show:
      // 1. Incomplete tasks due today or overdue
      // 2. Routine tasks for today
      // 3. High priority tasks regardless of due date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const relevantTasks = allTasks.filter(task => {
        if (task.completed) return false;
        if (task.isRoutine) return true;
        if (task.priority === 'high') return true;
        if (!task.dueDate) return false;
        
        const dueDate = task.dueDate.toDate();
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() <= today.getTime();
      });

      // Sort tasks by:
      // 1. Overdue tasks first
      // 2. High priority tasks
      // 3. Due date
      // 4. Routines
      // 5. Creation date
      relevantTasks.sort((a, b) => {
        // Overdue tasks first
        const today = new Date();
        const aOverdue = a.dueDate && a.dueDate.toDate() < today;
        const bOverdue = b.dueDate && b.dueDate.toDate() < today;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;

        // Priority next
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }

        // Due date
        if (a.dueDate && b.dueDate) {
          return a.dueDate.seconds - b.dueDate.seconds;
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;

        // Routines after regular tasks
        if (a.isRoutine && !b.isRoutine) return 1;
        if (!a.isRoutine && b.isRoutine) return -1;

        // Finally, sort by creation date
        return a.createdAt.seconds - b.createdAt.seconds;
      });

      setScheduledTasks(relevantTasks);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setScheduledTasks([]);
      console.error('Error fetching scheduled tasks:', err);
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
      setLoading(true);
      const task = scheduledTasks.find(t => t.id === taskId);
      if (!task) return;

      if (task.isRoutine) {
        // For routines, update the completion dates array
        const goal = goals.find(g => g.routines.some(r => r.title === task.source.routineName)) ||
                    userGoals.find(g => g.routines.some(r => r.title === task.source.routineName));
        
        if (!goal) return;
        
        const routine = goal.routines.find(r => r.title === task.source.routineName);
        if (!routine) return;

        const updatedRoutine = {
          ...routine,
          completionDates: [...routine.completionDates, task.routineCompletionDate!]
        };

        const updatedRoutines = goal.routines.map(r =>
          r.title === task.source.routineName ? updatedRoutine : r
        );

        if ('parentGoalId' in goal) {
          await updateDocument('user_goals', goal.id, { routines: updatedRoutines });
        } else {
          await updateDocument('activities', goal.id, { routines: updatedRoutines });
        }
      } else {
        // For regular tasks, update the task's completed status
        const goal = goals.find(g => g.tasks.some(t => t.id === taskId)) ||
                    userGoals.find(g => g.tasks.some(t => t.id === taskId));
        
        if (!goal) return;

        const updatedTasks = goal.tasks.map(t =>
          t.id === taskId ? { ...t, completed: true, updatedAt: Timestamp.now() } : t
        );

        if ('parentGoalId' in goal) {
          await updateDocument('user_goals', goal.id, { tasks: updatedTasks });
        } else {
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
