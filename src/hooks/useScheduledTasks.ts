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
  Timestamp,
  TaskDependency
} from '../types';

export interface ScheduledTask extends Task {
  source: {
    type: 'goal' | 'routine' | 'habit' | 'milestone';
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
    routines: (Routine | RoutineWithoutSystemFields)[],
    goalName: string,
    milestoneName?: string
  ): ScheduledTask[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = FirebaseTimestamp.fromDate(today);
    
    // Get start and end of current week
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
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

      // Handle skipped dates
      const isDateSkipped = (date: Date) => {
        return routine.skipDates?.some(skipDate => {
          const skippedDate = getDateFromTimestamp(skipDate);
          return skippedDate && 
            skippedDate.getDate() === date.getDate() &&
            skippedDate.getMonth() === date.getMonth() &&
            skippedDate.getFullYear() === date.getFullYear();
        });
      };

      // Get the next due date based on pattern
      const getNextDueDate = (): Date | null => {
        if (!routine.recurrence) return null;

        const lastCompleted = routine.recurrence.lastCompleted ? 
          getDateFromTimestamp(routine.recurrence.lastCompleted) : null;

        switch (routine.recurrence.pattern) {
          case 'daily':
            return today;
          case 'weekly':
            if (routine.schedule?.daysOfWeek && routine.schedule.daysOfWeek.length > 0) {
              // Find the next scheduled day that hasn't been completed
              const nextDay = routine.schedule.daysOfWeek.find(ds => 
                DAY_TO_NUMBER[ds.day] >= dayOfWeek &&
                (!lastCompleted || lastCompleted < today)
              );
              if (nextDay) {
                const nextDate = new Date(today);
                nextDate.setDate(today.getDate() + (DAY_TO_NUMBER[nextDay.day] - dayOfWeek));
                return nextDate;
              }
            }
            return null;
          case 'monthly':
            if (routine.schedule?.dayOfMonth) {
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

      // Determine scheduled days based on frequency and pattern
      switch (routine.frequency) {
        case 'daily':
          if (!isDateSkipped(today)) {
            scheduledDays.push(today);
          }
          break;
        case 'weekly':
          const nextDue = getNextDueDate();
          if (nextDue && !isDateSkipped(nextDue)) {
            scheduledDays.push(nextDue);
          }
          break;
        case 'monthly':
          if (routine.schedule?.dayOfMonth === dayOfMonth && !isDateSkipped(today)) {
            scheduledDays.push(today);
          }
          break;
        case 'quarterly':
          if (routine.schedule?.monthsOfYear?.includes(month + 1) && dayOfMonth === 1 && !isDateSkipped(today)) {
            scheduledDays.push(today);
          }
          break;
        case 'yearly':
          if ((routine.schedule?.monthsOfYear?.[0] === month + 1 || month === 0) && dayOfMonth === 1 && !isDateSkipped(today)) {
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
          type: milestoneName ? 'milestone' : 'routine',
          goalName,
          routineName: routine.title,
          milestoneName
        },
        isRoutine: true,
        routineCompletionDate: todayTimestamp,
        complexity: routine.complexity,
        recurrence: {
          pattern: routine.frequency,
          interval: routine.targetCount,
          daysOfWeek: routine.schedule?.daysOfWeek,
          dayOfMonth: routine.schedule?.dayOfMonth,
          skipDates: routine.skipDates,
          lastCompleted: routine.completionDates[routine.completionDates.length - 1],
          nextDue: routine.recurrence?.nextDue
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
      setScheduledTasks([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      const allTasks: ScheduledTask[] = [];

      // Process both regular goals and user goals
      const allGoals = [...goals, ...userGoals];

      allGoals.forEach((goal) => {
        // Process tasks from milestones first
        goal.milestones.forEach((milestone: { id: string; name: string; routines?: Routine[] }) => {
          // Add milestone tasks
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
          allTasks.push(...milestoneTasks);

          // Add milestone routines if they exist
          if (milestone.routines) {
            const milestoneRoutineTasks = generateRoutineTasks(milestone.routines, goal.name, milestone.name);
            allTasks.push(...milestoneRoutineTasks);
          }
        });

        // Add independent tasks
        const independentTasks = goal.tasks
          .filter((task: Task) => !task.milestoneId)
          .map((task: Task) => ({
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

      // Process dependencies
      allTasks.forEach((task: ScheduledTask) => {
        if (task.dependencies) {
          // Find all tasks that depend on this task
          const dependentTasks = allTasks
            .filter((t: ScheduledTask) => t.dependencies?.some((d: TaskDependency) => d.taskId === t.id))
            .map(t => t.id);
          task.dependentTasks = dependentTasks;
        }
      });

      // Sort tasks by:
      // 1. Dependencies (blocked tasks move down)
      // 2. Overdue tasks
      // 3. High priority tasks
      // 4. Due date
      // 5. Complexity
      // 6. Routines
      // 7. Creation date
      allTasks.sort((a: ScheduledTask, b: ScheduledTask) => {
        // Check if either task is blocked
        const aBlocked = a.dependencies?.some((d: TaskDependency) => {
          const depTask = allTasks.find(t => t.id === d.taskId);
          return depTask && !depTask.completed;
        }) ?? false;
        const bBlocked = b.dependencies?.some((d: TaskDependency) => {
          const depTask = allTasks.find(t => t.id === d.taskId);
          return depTask && !depTask.completed;
        }) ?? false;
        if (aBlocked && !bBlocked) return 1;
        if (!aBlocked && bBlocked) return -1;

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

        // Complexity
        const complexityOrder = { high: 0, medium: 1, low: 2 };
        const aComplexity = a.complexity?.level || 'medium';
        const bComplexity = b.complexity?.level || 'medium';
        if (aComplexity !== bComplexity) {
          return complexityOrder[aComplexity] - complexityOrder[bComplexity];
        }

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
        console.log('Current completion dates:', routine.completionDates);
        
        const updatedRoutine = {
          ...routine,
          completionDates: [...routine.completionDates, task.routineCompletionDate!]
        };

        console.log('Updated completion dates:', updatedRoutine.completionDates);

        const updatedRoutines = goal.routines.map((r: Routine) =>
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
        const goal = goals.find(g => g.tasks.some((t: Task) => t.id === taskId)) ||
                    userGoals.find(g => g.tasks.some((t: Task) => t.id === taskId));
        
        if (!goal) {
          console.error('Goal not found for task:', taskId);
          return;
        }

        console.log('Found goal:', goal.name);
        
        // Find the existing task to preserve its notes
        const existingTask = goal.tasks.find((t: Task) => t.id === taskId);
        
        const updatedTasks = goal.tasks.map((t: Task) =>
          t.id === taskId ? { 
            ...t, 
            completed: true, 
            updatedAt: FirebaseTimestamp.now(),
            notes: existingTask?.notes
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
