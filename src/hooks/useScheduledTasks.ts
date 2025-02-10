import { useState, useEffect } from 'react';
import { where, Timestamp } from 'firebase/firestore';
import { useFirestore } from './useFirestore';
import { useAuth } from '../contexts/AuthContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import type { Task, Routine, UserGoal, SharedGoal, RoutineWithoutSystemFields } from '../types';

export interface ScheduledTask extends Task {
  source: {
    type: 'goal' | 'routine' | 'habit';
    goalName?: string;
    routineName?: string;
  };
  isRoutine?: boolean;
  routineCompletionDate?: Timestamp;
}

export const useScheduledTasks = () => {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { user } = useAuth();
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
    
    return routines.flatMap(routine => {
      // Skip routines without system fields
      if (!('id' in routine)) return [];

      // Skip if routine has an end date that's passed
      if (routine.endDate && routine.endDate.toDate() < today) {
        return [];
      }

      // Check if routine is already completed for today
      const completedToday = routine.completionDates.some(date => {
        const completionDate = date.toDate();
        completionDate.setHours(0, 0, 0, 0);
        return completionDate.getTime() === today.getTime();
      });

      if (completedToday) {
        return [];
      }

      // Check if routine should be scheduled for today based on frequency
      let shouldSchedule = false;
      const dayOfWeek = today.getDay();
      const dayOfMonth = today.getDate();
      const month = today.getMonth();

      switch (routine.frequency) {
        case 'daily':
          shouldSchedule = true;
          break;
        case 'weekly':
          // Schedule on Monday or if behind on weekly target
          const completionsThisWeek = routine.completionDates.filter(date => {
            const completionDate = date.toDate();
            const diffTime = today.getTime() - completionDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= dayOfWeek;
          }).length;
          shouldSchedule = dayOfWeek === 1 || completionsThisWeek < routine.targetCount;
          break;
        case 'monthly':
          // Schedule on 1st of month or if behind on monthly target
          const completionsThisMonth = routine.completionDates.filter(date => {
            const completionDate = date.toDate();
            return completionDate.getMonth() === month;
          }).length;
          shouldSchedule = dayOfMonth === 1 || completionsThisMonth < routine.targetCount;
          break;
        case 'quarterly':
          // Schedule on first of quarter or if behind
          const quarterStart = Math.floor(month / 3) * 3 + 1;
          shouldSchedule = (month === quarterStart && dayOfMonth === 1);
          break;
        case 'yearly':
          // Schedule on January 1st
          shouldSchedule = (month === 0 && dayOfMonth === 1);
          break;
      }

      if (!shouldSchedule) {
        return [];
      }

      return [{
        id: `${routine.id}-${todayTimestamp.seconds}`,
        title: routine.title,
        description: routine.description,
        completed: false,
        priority: 'medium',
        status: 'not_started',
        ownerId: routine.ownerId,
        createdAt: todayTimestamp,
        updatedAt: todayTimestamp,
        source: {
          type: 'routine',
          goalName,
          routineName: routine.title
        },
        isRoutine: true,
        routineCompletionDate: todayTimestamp
      }];
    });
  };

  const fetchScheduledTasks = async () => {
    if (!user) return;

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
      console.error('Error fetching scheduled tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchScheduledTasks();
    }
  }, [user, goals, userGoals]);

  const completeTask = async (taskId: string) => {
    try {
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
          // Update user goal
          await updateDocument('user_goals', goal.id, { routines: updatedRoutines });
        } else {
          // Update regular goal
          await updateDocument('activities', goal.id, { routines: updatedRoutines });
        }
      } else {
        // For regular tasks, update the completed status
        const goal = goals.find(g => g.tasks.some(t => t.id === taskId)) ||
                    userGoals.find(g => g.tasks.some(t => t.id === taskId));
        
        if (!goal) return;

        const updatedTasks = goal.tasks.map(t =>
          t.id === taskId ? { ...t, completed: true, status: 'completed' as const } : t
        );

        if ('parentGoalId' in goal) {
          // Update user goal
          await updateDocument('user_goals', goal.id, { tasks: updatedTasks });
        } else {
          // Update regular goal
          await updateDocument('activities', goal.id, { tasks: updatedTasks });
        }
      }

      await fetchScheduledTasks();
    } catch (err) {
      setError(err as Error);
      throw err;
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