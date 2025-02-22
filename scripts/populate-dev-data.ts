import { db } from '../src/lib/firebase';
import { collection, addDoc, Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import { 
  Area, Task, Routine, UserGoal, TaskPriority, TaskStatus, 
  TimeOfDay, RoutineSchedule, PermissionLevel, HierarchicalPermissions
} from '../src/types';

const defaultPermissions: HierarchicalPermissions = {
  level: 'owner' as PermissionLevel,
  specificOverrides: {
    canEditTasks: true,
    canEditRoutines: true,
    canInviteUsers: true,
    canModifyPermissions: true
  }
};

// Helper to create timestamps
const createTimestamp = (daysFromNow: number = 0): FirebaseTimestamp => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return FirebaseTimestamp.fromDate(date);
};

async function createArea(userId: string, name: string, description: string, color: string): Promise<string> {
  const area: Partial<Area> = {
    name,
    description,
    color,
    ownerId: userId,
    createdAt: createTimestamp(),
    sharedWith: [],
    permissions: {
      [userId]: defaultPermissions
    }
  };

  const docRef = await addDoc(collection(db, 'dev_areas'), area);
  return docRef.id;
}

async function createTask(
  userId: string,
  title: string, 
  description: string, 
  areaId: string, 
  priority: TaskPriority,
  dueDate: number // days from now
): Promise<string> {
  const task: Partial<Task> = {
    title,
    description,
    areaId,
    ownerId: userId,
    createdAt: createTimestamp(),
    dueDate: createTimestamp(dueDate),
    completed: false,
    priority,
    status: 'not_started' as TaskStatus,
    sharedWith: [],
    permissions: {
      [userId]: defaultPermissions
    }
  };

  const docRef = await addDoc(collection(db, 'dev_activities'), task);
  return docRef.id;
}

async function createRoutine(
  userId: string,
  title: string,
  description: string,
  areaId: string,
  frequency: 'daily' | 'weekly' | 'monthly'
): Promise<string> {
  const timeOfDay: TimeOfDay = { hour: 9, minute: 0 };
  const schedule: RoutineSchedule = {
    type: frequency,
    targetCount: frequency === 'daily' ? 1 : frequency === 'weekly' ? 3 : 1,
    timeOfDay
  };

  const review = {
    reflectionFrequency: 'weekly' as const,
    reviewStatus: {
      lastReviewDate: createTimestamp(-7),
      nextReviewDate: createTimestamp(7),
      completedReviews: []
    },
    adherenceRate: 0,
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: createTimestamp(-1)
    }
  };

  const routine: Partial<Routine> = {
    title,
    description,
    areaId,
    ownerId: userId,
    createdAt: createTimestamp(),
    frequency,
    schedule,
    targetCount: frequency === 'daily' ? 1 : frequency === 'weekly' ? 3 : 1,
    permissions: {
      [userId]: defaultPermissions
    },
    completionDates: [],
    review
  };

  const docRef = await addDoc(collection(db, 'dev_routines'), routine);
  return docRef.id;
}

export async function populateDevData(userId: string): Promise<void> {
  try {
    // Create Areas
    const workAreaId = await createArea(
      userId,
      'Work',
      'Professional goals and tasks',
      '#4A90E2'
    );

    const healthAreaId = await createArea(
      userId,
      'Health & Fitness',
      'Physical and mental wellbeing',
      '#50E3C2'
    );

    const learningAreaId = await createArea(
      userId,
      'Learning',
      'Personal development and education',
      '#F5A623'
    );

    // Create Tasks for each area
    await Promise.all([
      // Work tasks
      createTask(
        userId,
        'Complete Q1 Report',
        'Analyze and compile Q1 performance metrics',
        workAreaId,
        'high',
        3
      ),
      createTask(
        userId,
        'Team Meeting Prep',
        'Prepare agenda and materials for weekly team sync',
        workAreaId,
        'medium',
        1
      ),

      // Health tasks
      createTask(
        userId,
        'Weekly Meal Prep',
        'Plan and prepare meals for the week',
        healthAreaId,
        'medium',
        2
      ),
      createTask(
        userId,
        'Schedule Annual Checkup',
        'Book appointment with primary care physician',
        healthAreaId,
        'low',
        14
      ),

      // Learning tasks
      createTask(
        userId,
        'Complete TypeScript Course',
        'Finish advanced TypeScript tutorials',
        learningAreaId,
        'high',
        7
      ),
      createTask(
        userId,
        'Read Technical Book',
        'Read "Clean Architecture" by Robert Martin',
        learningAreaId,
        'medium',
        30
      )
    ]);

    // Create Routines
    await Promise.all([
      // Work routines
      createRoutine(
        userId,
        'Daily Standup',
        'Attend team standup meeting',
        workAreaId,
        'daily'
      ),
      
      // Health routines
      createRoutine(
        userId,
        'Morning Exercise',
        '30 minutes of cardio',
        healthAreaId,
        'daily'
      ),
      createRoutine(
        userId,
        'Meditation',
        '15 minutes mindfulness practice',
        healthAreaId,
        'daily'
      ),

      // Learning routines
      createRoutine(
        userId,
        'Coding Practice',
        'Solve one programming challenge',
        learningAreaId,
        'daily'
      ),
      createRoutine(
        userId,
        'Technical Reading',
        'Read technical articles or documentation',
        learningAreaId,
        'weekly'
      )
    ]);

    console.log('Development data populated successfully!');
  } catch (error) {
    console.error('Error populating development data:', error);
    throw error;
  }
} 