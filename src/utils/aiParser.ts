import { 
  ParsedResult, 
  ParsedGoal, 
  ParsedTask 
} from '../services/AIService';
import { 
  SourceActivity, 
  Task, 
  Milestone, 
  TaskPriority, 
  MeasurableMetric, 
  AchievabilityCheck, 
  TimeTracking,
  DayOfWeek
} from '../types';
import { format, addDays, parseISO, isValid } from 'date-fns';

// Helper to extract date from parsed data
const extractDate = (dateString?: string | null): Date | undefined => {
  if (!dateString) return undefined;
  
  try {
    // Try to parse ISO date string
    const date = parseISO(dateString);
    if (isValid(date)) return date;
    
    // Try to handle relative dates like "tomorrow", "next week", etc.
    const lowerDateStr = dateString.toLowerCase();
    const today = new Date();
    
    if (lowerDateStr.includes('tomorrow')) {
      return addDays(today, 1);
    } else if (lowerDateStr.includes('next week')) {
      return addDays(today, 7);
    } else if (lowerDateStr.includes('next month')) {
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }
    
    // For more sophisticated date parsing, consider using a library like Chrono
    return undefined;
  } catch (error) {
    console.error('Error parsing date:', error);
    return undefined;
  }
};

// Convert priority string to TaskPriority type
const convertPriority = (priority?: string): TaskPriority => {
  if (!priority) return 'medium';
  
  const lowerPriority = priority.toLowerCase();
  if (lowerPriority.includes('high') || lowerPriority.includes('urgent')) {
    return 'high';
  } else if (lowerPriority.includes('low')) {
    return 'low';
  }
  
  return 'medium';
};

// Extract day of week from string
const extractDayOfWeek = (day?: string): DayOfWeek | undefined => {
  if (!day) return undefined;
  
  const lowerDay = day.toLowerCase();
  const daysMap: Record<string, DayOfWeek> = {
    'monday': 'monday',
    'tuesday': 'tuesday',
    'wednesday': 'wednesday',
    'thursday': 'thursday',
    'friday': 'friday',
    'saturday': 'saturday',
    'sunday': 'sunday',
    'mon': 'monday',
    'tue': 'tuesday',
    'wed': 'wednesday',
    'thu': 'thursday',
    'fri': 'friday',
    'sat': 'saturday',
    'sun': 'sunday'
  };
  
  return daysMap[lowerDay];
};

// Determine measurable metric based on goal description
const determineMeasurableMetric = (description: string): MeasurableMetric => {
  const lowerDesc = description.toLowerCase();
  
  if (lowerDesc.includes('time') || lowerDesc.includes('hours') || lowerDesc.includes('minutes')) {
    return 'time_spent';
  } else if (lowerDesc.includes('percent') || lowerDesc.includes('%') || lowerDesc.includes('completion')) {
    return 'completion_rate';
  } else if (lowerDesc.includes('count') || lowerDesc.includes('times') || lowerDesc.includes('occurrences')) {
    return 'count_occurrences';
  } else if (lowerDesc.includes('weight') || lowerDesc.includes('distance') || lowerDesc.includes('number')) {
    return 'track_numeric';
  }
  
  return 'binary_check'; // Default to simple yes/no completion
};

/**
 * Convert AI parsed goal to app Goal entity
 */
export const convertToGoal = (parsedGoal: ParsedGoal, userId: string, areaId?: string): Partial<SourceActivity> => {
  const dueDate = extractDate(parsedGoal.dueDate?.toString());
  
  const goal: Partial<SourceActivity> = {
    name: parsedGoal.title,
    specificAction: parsedGoal.description || parsedGoal.title,
    measurableMetric: determineMeasurableMetric(parsedGoal.description || parsedGoal.title),
    achievabilityCheck: 'yes', // Default to yes, user can change later
    relevance: '',  // User will need to fill this in
    ownerId: userId,
    areaId: areaId || '',
    sharedWith: [],
    tasks: [],
    routines: [],
    milestones: [],
    timeTracking: {
      type: 'fixed_deadline',
      deadline: dueDate ? {
        seconds: Math.floor(dueDate.getTime() / 1000),
        nanoseconds: 0
      } : undefined
    }
  };
  
  return goal;
};

/**
 * Convert AI parsed task to app Task entity
 */
export const convertToTask = (parsedTask: ParsedTask, userId: string, goalId?: string): Partial<Task> => {
  const dueDate = extractDate(parsedTask.dueDate?.toString());
  
  const task: Partial<Task> = {
    title: parsedTask.title,
    description: '',
    completed: parsedTask.isCompleted || false,
    ownerId: userId,
    areaId: '',
    goalId: goalId || '',
    priority: convertPriority(parsedTask.priority),
    status: 'not_started',
    sharedWith: [],
    permissions: {},
    dueDate: dueDate ? {
      seconds: Math.floor(dueDate.getTime() / 1000),
      nanoseconds: 0
    } : undefined
  };
  
  return task;
};

/**
 * Convert AI parsed result to app entity
 */
export const convertAIResultToEntity = (
  parsedResult: ParsedResult, 
  userId: string,
  areaId?: string,
  goalId?: string
): {
  type: string;
  entityData: Partial<SourceActivity | Task | Milestone>;
} => {
  switch (parsedResult.type) {
    case 'goal':
      return {
        type: 'goal',
        entityData: convertToGoal(parsedResult.data as ParsedGoal, userId, areaId)
      };
    case 'task':
      return {
        type: 'task',
        entityData: convertToTask(parsedResult.data as ParsedTask, userId, goalId)
      };
    case 'milestone':
      // Similar to task but with different fields
      return {
        type: 'milestone',
        entityData: {
          name: (parsedResult.data as any).title,
          targetDate: extractDate((parsedResult.data as any).dueDate?.toString()) ? {
            seconds: Math.floor(extractDate((parsedResult.data as any).dueDate?.toString())!.getTime() / 1000),
            nanoseconds: 0
          } : undefined,
          successCriteria: (parsedResult.data as any).description || '',
          status: 'not_started',
          tasks: []
        }
      };
    default:
      return {
        type: 'unknown',
        entityData: {}
      };
  }
};