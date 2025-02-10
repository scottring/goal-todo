import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
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
}

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type MeasurableMetric = 'log_workouts' | 'track_weight' | 'count_hours' | 'custom';
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
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: Timestamp;
  successCriteria: string;
  status: TaskStatus;
  tasks: string[]; // Array of task IDs
}

export interface Activity extends BaseDocument {
  name: string;
  description?: string;
  areaId: string;
  sharedWith: string[];
}

export interface Routine extends BaseDocument {
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  targetCount: number;
  endDate?: Timestamp;
  areaId?: string;
  assignedTo?: string;
  completionDates: Timestamp[];
  weeklyCompletionTracker?: boolean[];
  missedReason?: MissedReason;
}

export type RoutineWithoutSystemFields = Omit<Routine, keyof BaseDocument>;

export interface SourceActivity extends BaseDocument {
  name: string;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  customMetric?: string;
  achievabilityCheck: AchievabilityCheck;
  relevance: string;
  deadline?: Timestamp;
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
  deadline?: Timestamp;
  milestones: Milestone[];
  tasks: Task[];
  routines: (Routine | RoutineWithoutSystemFields)[];
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