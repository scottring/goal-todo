import { Area, SourceActivity, Task, Routine } from '../types';

export const sampleAreas: Area[] = [
  {
    id: '1',
    name: 'Health & Fitness',
    description: 'Physical and mental well-being goals',
    color: '#10B981' // Emerald
  },
  {
    id: '2',
    name: 'Learning',
    description: 'Educational and skill development goals',
    color: '#6366F1' // Indigo
  }
];

export const sampleActivities: SourceActivity[] = [
  {
    id: '1',
    name: 'Run 5K in 10 weeks',
    description: 'Build up to running a 5K race through gradual training',
    deadline: new Date('2024-05-15'),
    milestones: ['Run 1K without stopping', 'Run 2.5K continuously', 'Complete first 5K'],
    areaId: '1',
    tasks: [
      {
        id: '1',
        title: 'Buy running shoes',
        completed: false,
        activityId: '1',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Map out running route',
        completed: true,
        activityId: '1',
        priority: 'medium'
      }
    ],
    routines: [
      {
        id: '1',
        title: 'Morning run',
        frequency: 'weekly',
        daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        timeOfDay: '06:00',
        activityId: '1',
        completed: false
      }
    ]
  },
  {
    id: '2',
    name: 'Learn TypeScript',
    description: 'Master TypeScript fundamentals and advanced concepts',
    deadline: new Date('2024-06-01'),
    milestones: ['Complete basics', 'Build a project', 'Write tests'],
    areaId: '2',
    tasks: [
      {
        id: '3',
        title: 'Complete TypeScript handbook',
        completed: false,
        activityId: '2',
        priority: 'high'
      }
    ],
    routines: [
      {
        id: '2',
        title: 'Code practice',
        frequency: 'daily',
        timeOfDay: '20:00',
        activityId: '2',
        completed: false
      }
    ]
  }
];