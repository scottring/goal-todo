import { useState, useEffect, useMemo } from 'react';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isToday, isPast, addDays, endOfDay } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../hooks/useGoals';
import { useAreas } from '../hooks/useAreas';
// import { useInbox } from '../hooks/useInbox'; // Temporarily disabled due to permissions
import { WeekData, WeekDay, WeekItem } from '../types/index';

export const useWeekView = (selectedDate: Date = new Date()) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { goals } = useGoals();
  const { areas } = useAreas();

  // Calculate week boundaries
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]); // Monday start
  const weekEnd = useMemo(() => endOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  // Generate days of the week
  const weekDays = useMemo(() => 
    eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date => ({
      date,
      dayName: format(date, 'EEEE'),
      isToday: isToday(date),
      isPast: isPast(endOfDay(date)),
      items: [] as WeekItem[],
      totalEstimatedTime: 0,
      completedItems: 0,
      totalItems: 0
    }))
  , [weekStart, weekEnd]);

  // Simple aggregation function to start with
  const aggregateWeekData = (): WeekData => {
    console.log('Starting aggregateWeekData...');
    console.log('Available goals:', goals?.length || 0);

    // Initialize empty data structure
    const weekItems: WeekItem[] = [];
    const unscheduledItems: WeekItem[] = [];
    const inboxItems: WeekItem[] = [];
    const overdueItems: WeekItem[] = [];
    const weekGoals: WeekItem[] = [];
    const upcomingMilestones: WeekItem[] = [];

    // For now, let's just add some basic goal processing
    if (goals && Array.isArray(goals)) {
      console.log('Processing goals...');
      
      for (let i = 0; i < goals.length; i++) {
        const goal = goals[i];
        
        try {
          // Only process goals that have basic required fields
          if (!goal || !goal.id || !goal.title) {
            console.warn(`Skipping invalid goal at index ${i}:`, goal);
            continue;
          }

          console.log(`Processing goal: ${goal.title}`);
          
          // Add basic goal processing - only if it has a deadline
          if (goal.timeTracking?.deadline) {
            try {
              const dueDate = goal.timeTracking.deadline.toDate();
              if (dueDate >= weekStart && dueDate <= weekEnd) {
                weekGoals.push({
                  id: `goal-${goal.id}`,
                  title: goal.title,
                  type: 'goal',
                  sourceId: goal.id,
                  priority: 'high',
                  status: goal.completed ? 'completed' : 'pending',
                  dueDate: goal.timeTracking.deadline,
                  description: goal.description || '',
                  color: '#2196F3',
                  metadata: {
                    goalId: goal.id,
                    areaId: goal.areaId
                  }
                });
              }
            } catch (goalError) {
              console.error(`Error processing goal deadline for ${goal.title}:`, goalError);
            }
          }

          // Add some basic unscheduled tasks if goal has tasks
          if (goal.tasks && Array.isArray(goal.tasks)) {
            for (const task of goal.tasks) {
              try {
                if (!task || !task.id || !task.title) continue;
                
                // Only add tasks without due dates as unscheduled
                if (!task.dueDate && !task.completed) {
                  unscheduledItems.push({
                    id: `task-${task.id}`,
                    title: task.title,
                    type: 'task',
                    sourceId: task.id,
                    priority: task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'medium' : 'low',
                    status: 'pending',
                    description: task.description || '',
                    estimatedDuration: task.estimatedDuration,
                    color: '#4CAF50',
                    parentId: goal.id,
                    parentTitle: goal.title,
                    metadata: {
                      goalId: goal.id,
                      areaId: goal.areaId
                    }
                  });
                }
              } catch (taskError) {
                console.error(`Error processing task ${task.id}:`, taskError);
              }
            }
          }
          
        } catch (goalError) {
          console.error(`Error processing goal ${i}:`, goalError);
          continue;
        }
      }
    }

    console.log('Processed data:', {
      weekGoals: weekGoals.length,
      unscheduled: unscheduledItems.length,
      weekItems: weekItems.length
    });

    // Distribute items to days (for now just return empty days)
    const daysWithItems: WeekDay[] = weekDays.map(day => ({
      ...day,
      items: [],
      totalEstimatedTime: 0,
      completedItems: 0,
      totalItems: 0
    }));

    return {
      weekStart,
      weekEnd,
      days: daysWithItems,
      unscheduled: unscheduledItems,
      inbox: inboxItems,
      overdue: overdueItems,
      weekGoals,
      upcomingMilestones
    };
  };

  const [weekData, setWeekData] = useState<WeekData>({
    weekStart,
    weekEnd,
    days: weekDays,
    unscheduled: [],
    inbox: [],
    overdue: [],
    weekGoals: [],
    upcomingMilestones: []
  });

  useEffect(() => {
    if (!currentUser) {
      console.log('No current user, skipping week data load');
      setLoading(false);
      return;
    }

    const loadWeekData = () => {
      try {
        console.log('Loading week data...');
        setLoading(true);
        const data = aggregateWeekData();
        setWeekData(data);
        setError(null);
        console.log('Week data loaded successfully');
      } catch (err) {
        console.error('Error loading week data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load week data');
      } finally {
        setLoading(false);
      }
    };

    loadWeekData();
  }, [currentUser, selectedDate, goals, areas]);

  const moveItemToDay = (itemId: string, targetDate: Date) => {
    console.log(`Moving item ${itemId} to ${targetDate}`);
    // TODO: Implement moving items between days
  };

  const markItemCompleted = (itemId: string) => {
    console.log(`Marking item ${itemId} as completed`);
    // TODO: Implement marking items as completed
  };

  return {
    weekData,
    loading,
    error,
    moveItemToDay,
    markItemCompleted
  };
};