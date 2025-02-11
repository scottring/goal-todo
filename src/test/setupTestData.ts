import { addDoc, collection, Timestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const cleanupTestData = async (userId: string) => {
  // Delete test areas
  const areasQuery = query(collection(db, 'areas'), 
    where('ownerId', '==', userId),
    where('name', '==', 'Test Area')
  );
  const areasSnapshot = await getDocs(areasQuery);
  for (const doc of areasSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete test goals
  const goalsQuery = query(collection(db, 'activities'), 
    where('ownerId', '==', userId),
    where('name', '==', 'Test Goal')
  );
  const goalsSnapshot = await getDocs(goalsQuery);
  for (const doc of goalsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
};

export const setupTestData = async (userId: string) => {
  // Clean up existing test data first
  await cleanupTestData(userId);

  // Create test area
  const areaRef = await addDoc(collection(db, 'areas'), {
    name: 'Test Area',
    description: 'Area for testing weekly planning',
    ownerId: userId,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    color: '#4CAF50',
    sharedWith: [],
    permissions: {
      [userId]: {
        edit: true,
        view: true
      }
    }
  });

  // Create test goal with unscheduled tasks and routines
  const goalRef = await addDoc(collection(db, 'activities'), {
    name: 'Test Goal',
    specificAction: 'Testing weekly planning functionality',
    measurableMetric: 'completion_rate',
    achievabilityCheck: 'yes',
    relevance: 'Testing purposes',
    timeTracking: {
      type: 'recurring_review',
      reviewCycle: 'weekly',
      nextReviewDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    },
    ownerId: userId,
    areaId: areaRef.id,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    sharedWith: [],
    tasks: [
      {
        id: 'task1',
        title: 'Unscheduled Task 1',
        description: 'High priority task',
        priority: 'high',
        status: 'not_started',
        completed: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ownerId: userId,
        sharedWith: [],
        permissions: {
          [userId]: {
            edit: true,
            view: true
          }
        }
      },
      {
        id: 'task2',
        title: 'Unscheduled Task 2',
        description: 'Medium priority task',
        priority: 'medium',
        status: 'not_started',
        completed: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ownerId: userId,
        sharedWith: [],
        permissions: {
          [userId]: {
            edit: true,
            view: true
          }
        }
      },
      {
        id: 'task3',
        title: 'Unscheduled Task 3',
        description: 'Low priority task',
        priority: 'low',
        status: 'not_started',
        completed: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ownerId: userId,
        sharedWith: [],
        permissions: {
          [userId]: {
            edit: true,
            view: true
          }
        }
      }
    ],
    routines: [
      {
        id: 'routine1',
        title: 'Daily Routine',
        description: 'A routine that should happen daily',
        frequency: 'daily',
        targetCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        completionDates: [],
        ownerId: userId,
        schedule: {
          type: 'daily',
          targetCount: 1,
          timeOfDay: { hour: 9, minute: 0 }
        }
      },
      {
        id: 'routine2',
        title: 'Weekly Routine',
        description: 'A routine that should happen weekly',
        frequency: 'weekly',
        targetCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        completionDates: [],
        ownerId: userId,
        schedule: {
          type: 'weekly',
          targetCount: 1,
          timeOfDay: { hour: 9, minute: 0 }
        }
      }
    ]
  });

  return {
    areaId: areaRef.id,
    goalId: goalRef.id
  };
}; 