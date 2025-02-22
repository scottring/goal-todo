export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Timestamp;
}

export interface Area {
  id: string;
  name: string;
  description?: string;
  color?: string;
  ownerId: string;
  sharedWith: string[];
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
  createdAt: Timestamp;
}

export interface Activity {
  id: string;
  name: string;
  description?: string;
  areaId: string;
  ownerId: string;
  sharedWith: string[];
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
  createdAt: Timestamp;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export interface RoutineSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  daysOfWeek?: DaySchedule[];
  dayOfMonth?: number;
  monthsOfYear?: number[];
  timeOfDay?: TimeOfDay;
  targetCount: number;
}

export interface BaseRoutine {
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: RoutineSchedule;
  targetCount: number;
  endDate?: Timestamp;
}

export interface Routine extends BaseRoutine {
  id: string;
  completionDates: Timestamp[];
  ownerId: string;
  skipDates?: Timestamp[];
  complexity?: TaskComplexity;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    daysOfWeek?: DayOfWeek[];
    dayOfMonth?: number;
    endDate?: Timestamp;
    skipDates?: Timestamp[];
    lastCompleted?: Timestamp;
    nextDue?: Timestamp;
  };
  weeklyCompletionTracker?: boolean[];
  areaId?: string;
  assignedTo?: string;
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
  review?: {
    reflectionFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    reviewStatus: {
      lastReviewDate: Timestamp;
      nextReviewDate: Timestamp;
      completedReviews: string[];
    };
    adherenceRate: number;
    streakData: {
      currentStreak: number;
      longestStreak: number;
      lastCompletedDate: Timestamp;
    };
  };
}

export interface RoutineWithoutSystemFields extends BaseRoutine {
  completionDates: Timestamp[];
  weeklyCompletionTracker?: boolean[];
  areaId?: string;
  assignedTo?: string;
  review?: {
    reflectionFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    reviewStatus: {
      lastReviewDate: Timestamp;
      nextReviewDate: Timestamp;
      completedReviews: string[];
    };
    adherenceRate: number;
    streakData: {
      currentStreak: number;
      longestStreak: number;
      lastCompletedDate: Timestamp;
    };
  };
}

export type MeasurableMetric = 'count_occurrences' | 'track_numeric' | 'time_spent' | 'completion_rate' | 'binary_check' | 'custom';

export type ReviewCycle = 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskDependency {
  taskId: string;
  type: 'blocks' | 'requires';
  description?: string;
}

export interface TaskComplexity {
  level: 'low' | 'medium' | 'high';
  estimatedHours?: number;
}

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
  complexity?: TaskComplexity;
  recurrence?: {
    pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval?: number;
    daysOfWeek?: DayOfWeek[];
    dayOfMonth?: number;
    endDate?: Timestamp;
    skipDates?: Timestamp[];
    lastCompleted?: Timestamp;
    nextDue?: Timestamp;
  };
  progress?: {
    percentComplete: number;
    lastUpdated: Timestamp;
    status: 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'overdue';
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp;
  goalId?: string;
  areaId?: string;
  milestoneId?: string;
  sharedWith: string[];
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
  notes?: {
    content: string;
    lastUpdated: Timestamp;
  };
}

export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'overdue';

export interface DaySchedule {
  day: DayOfWeek;
  time: TimeOfDay;
}

export interface SharedGoal {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sharedWith: string[];
  status: 'active' | 'completed' | 'archived';
  deadline?: Timestamp;
  participants: {
    [userId: string]: {
      joinedAt: Timestamp;
      role: 'owner' | 'collaborator';
      permissions: {
        edit: boolean;
        view: boolean;
        invite: boolean;
      };
    };
  };
}

export interface UserGoal {
  id: string;
  parentGoalId: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  achievabilityCheck: string;
  relevance: string;
  timeTracking: {
    type: 'recurring_review';
    reviewCycle: ReviewCycle;
    nextReviewDate: Timestamp;
    reviewStatus: {
      lastReviewDate: Timestamp;
      nextReviewDate: Timestamp;
      completedReviews: {
        date: Timestamp;
        progress: number;
        notes: string;
      }[];
    };
  };
  milestones: {
    id: string;
    name: string;
    successCriteria: string;
    status: TaskStatus;
    targetDate?: Timestamp;
    routines?: Routine[];
  }[];
  tasks: Task[];
  routines: Routine[];
  areaId: string;
} 