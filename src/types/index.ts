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

export interface Task extends BaseDocument {
  title: string;
  description?: string;
  dueDate?: Timestamp;
  completed: boolean;
  areaId?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
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
  frequency: 'daily' | 'weekly' | 'monthly';
  assignedTo?: string;
  areaId?: string;
  completionDates: Timestamp[];
}

export interface SourceActivity {
  id: string;
  name: string;
  description?: string;
  deadline?: Date;
  milestones?: string[];
  areaId: string;
  ownerId: string;
  sharedWith: string[]; // Array of user IDs
  createdAt: Timestamp;
  updatedAt: Timestamp;
  tasks: Task[];
  routines: Routine[];
}

export interface Share {
  id: string;
  resourceId: string; // ID of the Area, Activity, Task, or Routine
  resourceType: 'area' | 'activity' | 'task' | 'routine';
  sharedBy: string; // User ID
  sharedWith: string; // User ID
  permissions: 'read' | 'write' | 'admin';
  createdAt: Timestamp;
}