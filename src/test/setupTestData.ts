import { addDoc, collection, Timestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addMonths, subDays, startOfWeek, endOfWeek } from 'date-fns';

const cleanupTestData = async (userId: string) => {
  // Delete test areas
  const areasQuery = query(collection(db, 'areas'), 
    where('ownerId', '==', userId)
  );
  const areasSnapshot = await getDocs(areasQuery);
  for (const doc of areasSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete test goals
  const goalsQuery = query(collection(db, 'activities'), 
    where('ownerId', '==', userId)
  );
  const goalsSnapshot = await getDocs(goalsQuery);
  for (const doc of goalsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete test shared goals
  const sharedGoalsQuery = query(collection(db, 'shared_goals'),
    where('ownerId', '==', userId)
  );
  const sharedGoalsSnapshot = await getDocs(sharedGoalsQuery);
  for (const doc of sharedGoalsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
};

export const setupTestData = async (userId: string) => {
  // Clean up existing test data first
  await cleanupTestData(userId);

  // Get last week's date range
  const today = new Date();
  const lastWeekStart = startOfWeek(subDays(today, 7));
  const lastWeekEnd = endOfWeek(subDays(today, 7));

  // Create test areas
  const areas = [
    {
      name: 'Health & Fitness',
      description: 'Physical and mental well-being goals',
      color: '#4CAF50',
      ownerId: userId,
      createdAt: Timestamp.fromDate(lastWeekStart),
      updatedAt: Timestamp.fromDate(lastWeekEnd),
      sharedWith: [],
      permissions: {}
    },
    {
      name: 'Career Development',
      description: 'Professional growth and skills',
      color: '#2196F3',
      ownerId: userId,
      createdAt: Timestamp.fromDate(lastWeekStart),
      updatedAt: Timestamp.fromDate(lastWeekEnd),
      sharedWith: [],
      permissions: {}
    },
    {
      name: 'Personal Projects',
      description: 'Side projects and hobbies',
      color: '#9C27B0',
      ownerId: userId,
      createdAt: Timestamp.fromDate(lastWeekStart),
      updatedAt: Timestamp.fromDate(lastWeekEnd),
      sharedWith: [],
      permissions: {}
    }
  ];

  const areaRefs = await Promise.all(
    areas.map(area => addDoc(collection(db, 'areas'), area))
  );

  // Create goals for each area with tasks from last week
  const goals = [
    // Health & Fitness Goals
    {
      name: 'Run a Marathon',
      specificAction: 'Train and complete a full marathon in 6 months',
      measurableMetric: 'track_numeric',
      achievabilityCheck: 'yes',
      relevance: 'Improve cardiovascular health and achieve a life goal',
      timeTracking: {
        type: 'fixed_deadline',
        deadline: Timestamp.fromDate(addMonths(lastWeekEnd, 6))
      },
      ownerId: userId,
      areaId: areaRefs[0].id,
      createdAt: Timestamp.fromDate(lastWeekStart),
      updatedAt: Timestamp.fromDate(lastWeekEnd),
      sharedWith: [],
      milestones: [
        {
          id: uuidv4(),
          name: 'Complete 5K run',
          targetDate: Timestamp.fromDate(addDays(lastWeekStart, 2)),
          successCriteria: 'Run 5K without stopping',
          status: 'not_started',
          tasks: []
        },
        {
          id: uuidv4(),
          name: 'Complete 10K run',
          targetDate: Timestamp.fromDate(addDays(lastWeekStart, 5)),
          successCriteria: 'Finish a 10K under 1:15:00',
          status: 'not_started',
          tasks: []
        }
      ],
      tasks: [
        {
          id: uuidv4(),
          title: 'Buy running shoes',
          description: 'Get properly fitted running shoes',
          priority: 'high',
          status: 'not_started',
          completed: false,
          dueDate: Timestamp.fromDate(addDays(lastWeekStart, 1)),
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd),
          sharedWith: [],
          permissions: {}
        },
        {
          id: uuidv4(),
          title: 'Create training schedule',
          description: 'Design a 6-month training plan',
          priority: 'high',
          status: 'not_started',
          completed: false,
          dueDate: Timestamp.fromDate(addDays(lastWeekStart, 3)),
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd),
          sharedWith: [],
          permissions: {}
        }
      ],
      routines: [
        {
          id: uuidv4(),
          title: 'Morning Run',
          description: 'Progressive distance training',
          frequency: 'weekly',
          schedule: {
            type: 'weekly',
            targetCount: 3,
            daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
            timeOfDay: { hour: 6, minute: 0 }
          },
          targetCount: 3,
          completionDates: [
            Timestamp.fromDate(addDays(lastWeekStart, 1)), // Completed Monday
            Timestamp.fromDate(addDays(lastWeekStart, 3)), // Completed Wednesday
            // Friday not completed - needs review
          ],
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd)
        }
      ]
    },
    // Career Development Goal
    {
      name: 'Learn TypeScript',
      specificAction: 'Master TypeScript and implement it in a project',
      measurableMetric: 'completion_rate',
      achievabilityCheck: 'yes',
      relevance: 'Enhance development skills and job prospects',
      timeTracking: {
        type: 'recurring_review',
        reviewCycle: 'weekly',
        nextReviewDate: Timestamp.fromDate(today) // Next review is today
      },
      ownerId: userId,
      areaId: areaRefs[1].id,
      createdAt: Timestamp.fromDate(lastWeekStart),
      updatedAt: Timestamp.fromDate(lastWeekEnd),
      sharedWith: [],
      milestones: [
        {
          id: uuidv4(),
          name: 'Complete TypeScript Fundamentals',
          targetDate: Timestamp.fromDate(addDays(lastWeekStart, 4)),
          successCriteria: 'Complete basic TypeScript course',
          status: 'not_started',
          tasks: []
        }
      ],
      tasks: [
        {
          id: uuidv4(),
          title: 'Set up development environment',
          description: 'Install TypeScript and configure editor',
          priority: 'high',
          status: 'not_started',
          completed: false,
          dueDate: Timestamp.fromDate(addDays(lastWeekStart, 2)),
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd),
          sharedWith: [],
          permissions: {}
        }
      ],
      routines: [
        {
          id: uuidv4(),
          title: 'TypeScript Practice',
          description: 'Daily coding practice',
          frequency: 'daily',
          schedule: {
            type: 'daily',
            targetCount: 1,
            timeOfDay: { hour: 20, minute: 0 }
          },
          targetCount: 1,
          completionDates: [
            // Only completed 3 out of 7 days - needs review
            Timestamp.fromDate(addDays(lastWeekStart, 1)),
            Timestamp.fromDate(addDays(lastWeekStart, 2)),
            Timestamp.fromDate(addDays(lastWeekStart, 4))
          ],
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd)
        }
      ]
    },
    // Personal Project Goal
    {
      name: 'Write a Novel',
      specificAction: 'Complete a 50,000-word novel draft',
      measurableMetric: 'track_numeric',
      achievabilityCheck: 'yes',
      relevance: 'Express creativity and accomplish a personal dream',
      timeTracking: {
        type: 'fixed_deadline',
        deadline: Timestamp.fromDate(addMonths(lastWeekEnd, 3))
      },
      ownerId: userId,
      areaId: areaRefs[2].id,
      createdAt: Timestamp.fromDate(lastWeekStart),
      updatedAt: Timestamp.fromDate(lastWeekEnd),
      sharedWith: [],
      milestones: [
        {
          id: uuidv4(),
          name: 'Complete Outline',
          targetDate: Timestamp.fromDate(addDays(lastWeekStart, 6)),
          successCriteria: 'Detailed chapter outline completed',
          status: 'not_started',
          tasks: []
        }
      ],
      tasks: [
        {
          id: uuidv4(),
          title: 'Character Development',
          description: 'Create detailed character profiles',
          priority: 'high',
          status: 'not_started',
          completed: false,
          dueDate: Timestamp.fromDate(addDays(lastWeekStart, 5)),
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd),
          sharedWith: [],
          permissions: {}
        }
      ],
      routines: [
        {
          id: uuidv4(),
          title: 'Writing Session',
          description: 'Daily writing practice',
          frequency: 'daily',
          schedule: {
            type: 'daily',
            targetCount: 1,
            timeOfDay: { hour: 21, minute: 0 }
          },
          targetCount: 1,
          completionDates: [
            // Only completed 4 out of 7 days - needs review
            Timestamp.fromDate(addDays(lastWeekStart, 1)),
            Timestamp.fromDate(addDays(lastWeekStart, 2)),
            Timestamp.fromDate(addDays(lastWeekStart, 3)),
            Timestamp.fromDate(addDays(lastWeekStart, 5))
          ],
          ownerId: userId,
          createdAt: Timestamp.fromDate(lastWeekStart),
          updatedAt: Timestamp.fromDate(lastWeekEnd)
        }
      ]
    }
  ];

  const goalRefs = await Promise.all(
    goals.map(goal => addDoc(collection(db, 'activities'), goal))
  );

  // Create a shared goal
  const sharedGoal = {
    name: 'Team Fitness Challenge',
    description: 'Monthly team fitness challenge',
    areaId: areaRefs[0].id,
    ownerId: userId,
    createdAt: Timestamp.fromDate(lastWeekStart),
    updatedAt: Timestamp.fromDate(lastWeekEnd),
    deadline: Timestamp.fromDate(addMonths(lastWeekEnd, 1)),
    status: 'active',
    sharedWith: ['mock-user-1', 'mock-user-2'],
    participants: {
      [userId]: {
        joinedAt: Timestamp.fromDate(lastWeekStart),
        role: 'owner',
        permissions: {
          edit: true,
          view: true,
          invite: true
        }
      },
      'mock-user-1': {
        joinedAt: Timestamp.fromDate(lastWeekStart),
        role: 'collaborator',
        permissions: {
          edit: true,
          view: true,
          invite: false
        }
      },
      'mock-user-2': {
        joinedAt: Timestamp.fromDate(lastWeekStart),
        role: 'collaborator',
        permissions: {
          edit: false,
          view: true,
          invite: false
        }
      }
    }
  };

  const sharedGoalRef = await addDoc(collection(db, 'shared_goals'), sharedGoal);

  return {
    areaIds: areaRefs.map(ref => ref.id),
    goalIds: goalRefs.map(ref => ref.id),
    sharedGoalId: sharedGoalRef.id
  };
}; 