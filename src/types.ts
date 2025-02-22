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
  targetCount: number;
  timeOfDay?: TimeOfDay;
  daysOfWeek?: Array<{
    day: DayOfWeek;
    time: TimeOfDay;
    specificDate?: Timestamp;
    assignedTo?: string;
    assignedToEmail?: string;
  }>;
  dayOfMonth?: number;
  monthsOfYear?: number[];
}

export interface RoutineWithoutSystemFields {
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: RoutineSchedule;
  targetCount: number;
  endDate?: Timestamp;
  completionDates: Timestamp[];
  weeklyCompletionTracker: boolean[];
  areaId: string;
  assignedTo?: string;
}

export type MeasurableMetric = 'count_occurrences' | 'track_numeric' | 'time_spent' | 'completion_rate' | 'binary_check' | 'custom';

export type ReviewCycle = 'weekly' | 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export type TaskPriority = 'low' | 'medium' | 'high'; 