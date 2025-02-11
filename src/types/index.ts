import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
  sharedWith: string[]; // List of users this person shares goals with
  sharedAreas: string[]; // Entire shared categories
  sharedGoals: string[]; // Goals shared with them
  sharedTasks: string[]; // Tasks shared separately
}

export interface BaseDocument {
  id: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Area extends BaseDocument {
  name: string;
  description?: string;
  color?: string;
  sharedWith: string[]; // Array of user IDs
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type MeasurableMetric = 
  | 'count_occurrences'  // Count number of times something happens
  | 'track_numeric'      // Track a number (weight, distance, etc)
  | 'time_spent'         // Track time spent
  | 'completion_rate'    // Track percentage of completion
  | 'binary_check'       // Yes/No completion
  | 'custom';            // Custom metric

export type AchievabilityCheck = 'yes' | 'no' | 'need_resources';
export type MissedReason = 'too_busy' | 'lost_motivation' | 'health_issue' | 'other';

export interface Task extends BaseDocument {
  title: string;
  description?: string;
  dueDate?: Timestamp;
  completed: boolean;
  areaId?: string;
  goalId?: string;
  milestoneId?: string;
  assignedTo?: string;
  priority: TaskPriority;
  status: TaskStatus;
  sharedWith: string[]; // Users this task is shared with
  permissions: {
    [userId: string]: {
      edit: boolean;
      view: boolean;
    }
  };
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: Timestamp;
  successCriteria: string;
  status: TaskStatus;
  tasks: string[]; // Array of task IDs
  review?: MilestoneReview; // Optional review cycle
}

export interface Activity extends BaseDocument {
  name: string;
  description?: string;
  areaId: string;
  sharedWith: string[];
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type TimeOfDay = {
  hour: number;
  minute: number;
};

export interface DaySchedule {
  day: DayOfWeek;
  time: TimeOfDay;
}

export interface RoutineSchedule {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  daysOfWeek?: DaySchedule[];  // For weekly routines with different times
  dayOfMonth?: number;       // For monthly routines (1-31)
  monthsOfYear?: number[];   // For quarterly/yearly routines (1-12)
  timeOfDay?: TimeOfDay;     // Default time for non-weekly routines
  targetCount: number;       // How many times to complete in the period
}

export interface Routine extends BaseDocument {
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: RoutineSchedule;
  targetCount: number;
  endDate?: Timestamp;
  areaId?: string;
  assignedTo?: string;
  completionDates: Timestamp[];
  weeklyCompletionTracker?: boolean[];
  missedReason?: MissedReason;
  review: HabitReview;
}

export type RoutineWithoutSystemFields = Omit<Routine, keyof BaseDocument | 'review'> & {
  review?: HabitReview;
};

export type TimeTrackingType = 'fixed_deadline' | 'recurring_review';
export type ReviewCycle = 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export interface TimeTracking {
  type: TimeTrackingType;
  deadline?: Timestamp;        // For fixed_deadline goals
  reviewCycle?: ReviewCycle;   // For recurring_review goals
  nextReviewDate?: Timestamp;  // For recurring_review goals
  reviewStatus?: ReviewStatus; // Add review status
}

export interface SourceActivity extends BaseDocument {
  name: string;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  customMetric?: string | null;
  achievabilityCheck: AchievabilityCheck;
  relevance: string;
  timeTracking: TimeTracking;
  milestones: Milestone[];
  areaId: string;
  sharedWith: string[];
  tasks: Task[];
  routines: (Routine | RoutineWithoutSystemFields)[];
  weeklyReviews?: WeeklyReview[];
}

export interface SharedGoal extends BaseDocument {
  name: string;
  description: string;
  areaId: string;
  sharedWith: string[];
  deadline?: Timestamp;
  status: 'active' | 'completed' | 'abandoned';
  participants: {
    [userId: string]: {
      joinedAt: Timestamp;
      role: 'owner' | 'collaborator';
      permissions: {
        edit: boolean;
        view: boolean;
        invite: boolean;
      }
    }
  };
}

export interface UserGoal extends BaseDocument {
  parentGoalId: string;
  name: string;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  customMetric?: string;
  achievabilityCheck: AchievabilityCheck;
  relevance: string;
  timeTracking: TimeTracking;
  milestones: Milestone[];
  tasks: Task[];
  routines: (Routine | RoutineWithoutSystemFields)[];
  areaId: string;
}

export interface SharedWeeklyReview extends BaseDocument {
  goalId: string;
  date: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed';
  participants: string[];
  
  userReflections: {
    [userId: string]: {
      tasksCompleted: number;
      routinesCompleted: number;
      workedWell: string;
      challenges: string;
      nextWeekFocus: string;
      privateNotes?: string;
    }
  };
  
  sharedDiscussion: {
    synergies: string;
    obstacles: string;
    adjustments: string;
    supportNeeded: string;
    celebrations: string;
  };
  
  actionItems: {
    id: string;
    description: string;
    assignedTo: string;
    dueDate: Timestamp;
    status: 'pending' | 'completed';
  }[];
}

export interface WeeklyReview {
  id: string;
  date: Timestamp;
  sharedReviewId?: string;  // Reference to SharedWeeklyReview if this is part of a shared review
  tasksCompleted: boolean;
  missedReason?: MissedReason;
  workedWell: string;
  needsImprovement: string;
  adjustments: string;
}

export interface Share {
  id: string;
  resourceId: string;
  resourceType: 'area' | 'activity' | 'task' | 'routine';
  sharedBy: string;
  sharedWith: string;
  permissions: 'read' | 'write' | 'admin';
  createdAt: Timestamp;
}

export type ReviewFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface ReviewStatus {
  lastReviewDate: Timestamp;
  nextReviewDate: Timestamp;
  completedReviews: {
    date: Timestamp;
    reflection: string;
    progress: number; // 0-100
    challenges: string;
    nextSteps: string;
  }[];
}

export interface MilestoneReview {
  needsReview: boolean;
  reviewFrequency?: ReviewFrequency;
  reviewStatus?: ReviewStatus;
}

export interface HabitReview {
  reflectionFrequency: ReviewFrequency;
  reviewStatus: ReviewStatus;
  adherenceRate: number; // 0-100
  streakData: {
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate: Timestamp;
  };
}

export interface WeeklyPlanningSession extends BaseDocument {
  weekStartDate: Timestamp;
  weekEndDate: Timestamp;
  status: 'not_started' | 'review_phase' | 'planning_phase' | 'completed';
  
  reviewPhase: {
    completedTasks: string[];  // Task IDs
    missedTasks: string[];     // Task IDs
    partiallyCompletedTasks: string[];  // Task IDs
    taskReviews: TaskReviewItem[];  // Add this field
    longTermGoalReviews: {
      goalId: string;
      madeProgress: boolean;
      adjustments?: string;
      nextReviewDate?: Timestamp;
    }[];
    sharedGoalReviews: {
      goalId: string;
      completedTasks: string[];
      pendingTasks: string[];
      teamReminders: string[];  // User IDs to remind
    }[];
    summary: {
      totalCompleted: number;
      totalPushedForward: number;
      totalMissed: number;
      totalArchived: number;
      totalClosed: number;
    };
  };

  planningPhase: {
    nextWeekTasks: {
      taskId: string;
      priority: TaskPriority;
      dueDate: Timestamp;
    }[];
    sharedGoalAssignments: {
      goalId: string;
      assignments: {
        taskId: string;
        assignedTo: string;
        dueDate: Timestamp;
      }[];
    }[];
    recurringTasks: {
      routineId: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      schedule: RoutineSchedule;
    }[];
    calendarSyncStatus: {
      synced: boolean;
      lastSyncedAt?: Timestamp;
      syncedEvents: {
        eventId: string;
        taskId: string;
        startTime: Timestamp;
        endTime: Timestamp;
      }[];
    };
  };
}

export interface TaskReviewItem {
  taskId: string;
  title: string;
  status: 'completed' | 'missed' | 'partial' | 'needs_review';
  originalDueDate: Timestamp;
  completedDate?: Timestamp;
  action?: 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close';
  newDueDate?: Timestamp;
}