import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { Timestamp } from 'firebase/firestore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { 
  SourceActivity, 
  MeasurableMetric, 
  AchievabilityCheck, 
  TaskStatus, 
  TaskPriority, 
  TimeTrackingType, 
  ReviewCycle,
  Milestone,
  Task,
  Routine,
  ReviewStatus,
  RoutineWithoutSystemFields,
  DayOfWeek
} from '../types';
import { Stepper, Step, StepLabel, Typography } from '@mui/material';

const MEASURABLE_METRIC_OPTIONS: { label: string; value: MeasurableMetric }[] = [
  { label: 'Count occurrences', value: 'count_occurrences' },
  { label: 'Track numeric value', value: 'track_numeric' },
  { label: 'Track time spent', value: 'time_spent' },
  { label: 'Track completion rate (%)', value: 'completion_rate' },
  { label: 'Yes/No completion', value: 'binary_check' },
  { label: 'Custom metric', value: 'custom' }
];

const ACHIEVABILITY_OPTIONS: { label: string; value: AchievabilityCheck }[] = [
  { label: 'Yes, I can achieve this', value: 'yes' },
  { label: 'No, this seems too difficult', value: 'no' },
  { label: 'Need more resources', value: 'need_resources' }
];

const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: 'Not Started', value: 'not_started' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' }
];

const REVIEW_CYCLE_OPTIONS: { label: string; value: ReviewCycle }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Every 6 months', value: 'biannual' },
  { label: 'Yearly', value: 'yearly' }
];

const EditGoalPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { areas } = useAreasContext();
  const { goals, updateGoal } = useGoalsContext();

  const goal = goals.find(g => g.id === goalId);
  const defaultTimestamp = Timestamp.fromDate(new Date());

  const [formData, setFormData] = useState<SourceActivity>({
    id: '',
    name: '',
    specificAction: '',
    measurableMetric: 'count_occurrences',
    customMetric: '',
    achievabilityCheck: 'yes',
    relevance: '',
    timeTracking: {
      type: 'fixed_deadline',
      deadline: defaultTimestamp,
      reviewCycle: 'monthly',
      nextReviewDate: defaultTimestamp,
      reviewStatus: {
        lastReviewDate: defaultTimestamp,
        nextReviewDate: defaultTimestamp,
        completedReviews: []
      }
    },
    areaId: '',
    milestones: [],
    tasks: [],
    routines: [],
    sharedWith: [],
    ownerId: '',
    createdAt: defaultTimestamp,
    updatedAt: defaultTimestamp
  });

  useEffect(() => {
    if (goal) {
      setFormData(goal);
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalId || !goal) return;

    try {
      await updateGoal(goalId, formData);
      navigate('/goals');
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      name: '',
      targetDate: defaultTimestamp,
      successCriteria: '',
      status: 'not_started',
      tasks: [],
      routines: []
    };

    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone]
    }));
  };

  const addTask = () => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      priority: 'medium',
      status: 'not_started',
      completed: false,
      sharedWith: [],
      ownerId: formData.ownerId,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp,
      permissions: {}
    };

    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, newTask]
    }));
  };

  const addRoutine = () => {
    const newRoutine: Routine = {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      frequency: 'daily',
      schedule: {
        type: 'daily',
        targetCount: 1,
        timeOfDay: { hour: 9, minute: 0 },
        daysOfWeek: [],
        monthsOfYear: []
      },
      targetCount: 1,
      completionDates: [],
      ownerId: formData.ownerId,
      createdAt: defaultTimestamp,
      updatedAt: defaultTimestamp,
      review: {
        reflectionFrequency: 'weekly',
        reviewStatus: {
          lastReviewDate: defaultTimestamp,
          nextReviewDate: defaultTimestamp,
          completedReviews: []
        },
        adherenceRate: 0,
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedDate: defaultTimestamp
        }
      }
    };

    setFormData(prev => ({
      ...prev,
      routines: [...prev.routines, newRoutine]
    }));
  };

  // Helper function to safely get date from Firebase Timestamp
  const getDateFromTimestamp = (timestamp: any): Date | null => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return null;
    }
    return timestamp.toDate();
  };

  // Helper function to create Firebase Timestamp
  const createTimestamp = (date: Date | null): Timestamp => {
    return date ? Timestamp.fromDate(date) : defaultTimestamp;
  };

  // Helper function to get routine ID safely
  const getRoutineId = (routine: Routine | RoutineWithoutSystemFields): string => {
    if ('id' in routine) {
      return routine.id;
    }
    return crypto.randomUUID();
  };

  if (!goal) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center text-gray-500">Goal not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/goals')}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Goal</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6 bg-white p-6 rounded-lg shadow">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <select
              value={formData.areaId}
              onChange={e => setFormData(prev => ({ ...prev, areaId: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select an area</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>{area.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Action
            </label>
            <textarea
              value={formData.specificAction}
              onChange={e => setFormData(prev => ({ ...prev, specificAction: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How will you measure progress?
            </label>
            <select
              value={formData.measurableMetric}
              onChange={e => {
                const value = e.target.value as MeasurableMetric;
                setFormData(prev => ({
                  ...prev,
                  measurableMetric: value,
                  customMetric: value === 'custom' ? prev.customMetric : undefined
                }));
              }}
              className="w-full p-2 border rounded-md"
              required
            >
              {MEASURABLE_METRIC_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {formData.measurableMetric === 'custom' && (
              <input
                type="text"
                value={formData.customMetric || ''}
                onChange={e => setFormData(prev => ({ ...prev, customMetric: e.target.value }))}
                className="w-full mt-2 p-2 border rounded-md"
                placeholder="Define your custom metric"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Is this goal achievable with your current resources?
            </label>
            <select
              value={formData.achievabilityCheck}
              onChange={e => setFormData(prev => ({ ...prev, achievabilityCheck: e.target.value as AchievabilityCheck }))}
              className="w-full p-2 border rounded-md"
              required
            >
              {ACHIEVABILITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why is this goal important to you?
            </label>
            <textarea
              value={formData.relevance}
              onChange={e => setFormData(prev => ({ ...prev, relevance: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={3}
              required
              placeholder="How does this goal align with your values and long-term objectives?"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Time Tracking
            </label>
            <div>
              <select
                value={formData.timeTracking?.type}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  timeTracking: {
                    ...prev.timeTracking,
                    type: e.target.value as TimeTrackingType
                  }
                }))}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="fixed_deadline">Fixed Deadline</option>
                <option value="recurring_review">Recurring Review</option>
              </select>
            </div>

            {formData.timeTracking?.type === 'fixed_deadline' ? (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Deadline"
                  value={getDateFromTimestamp(formData.timeTracking.deadline)}
                  onChange={(date) => setFormData(prev => ({
                    ...prev,
                    timeTracking: {
                      ...prev.timeTracking,
                      deadline: createTimestamp(date)
                    }
                  }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      className: "w-full p-2 border rounded-md"
                    }
                  }}
                />
              </LocalizationProvider>
            ) : (
              <select
                value={formData.timeTracking?.reviewCycle || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  timeTracking: {
                    ...prev.timeTracking,
                    reviewCycle: e.target.value as ReviewCycle
                  }
                }))}
                className="w-full p-2 border rounded-md"
                required
              >
                {REVIEW_CYCLE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Milestones
            </label>
            <div className="space-y-4">
              {formData.milestones?.map((milestone, index) => (
                <div key={milestone.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Milestone {index + 1}</h4>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            milestones: prev.milestones?.filter((_, i) => i !== index)
                          }));
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={milestone.name}
                    onChange={e => {
                      setFormData(prev => {
                        const newMilestones = [...(prev.milestones || [])];
                        newMilestones[index] = { ...newMilestones[index], name: e.target.value };
                        return { ...prev, milestones: newMilestones };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    placeholder="Milestone name"
                    required
                  />
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Target Date"
                      value={getDateFromTimestamp(milestone.targetDate)}
                      onChange={(date) => {
                        setFormData(prev => {
                          const newMilestones = [...(prev.milestones || [])];
                          newMilestones[index] = {
                            ...newMilestones[index],
                            targetDate: createTimestamp(date)
                          };
                          return { ...prev, milestones: newMilestones };
                        });
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          className: "w-full p-2 border rounded-md"
                        }
                      }}
                    />
                  </LocalizationProvider>
                  <select
                    value={milestone.status}
                    onChange={e => {
                      setFormData(prev => {
                        const newMilestones = [...(prev.milestones || [])];
                        newMilestones[index] = {
                          ...newMilestones[index],
                          status: e.target.value as TaskStatus
                        };
                        return { ...prev, milestones: newMilestones };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {/* Tasks for this milestone */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Tasks</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newTask: Task = {
                            id: crypto.randomUUID(),
                            title: '',
                            description: '',
                            priority: 'medium',
                            status: 'not_started',
                            completed: false,
                            sharedWith: [],
                            ownerId: formData.ownerId,
                            createdAt: defaultTimestamp,
                            updatedAt: defaultTimestamp,
                            permissions: {}
                          };

                          setFormData(prev => {
                            const newMilestones = [...prev.milestones];
                            newMilestones[index] = {
                              ...newMilestones[index],
                              tasks: [...(newMilestones[index].tasks || []), newTask.id]
                            };
                            return {
                              ...prev,
                              milestones: newMilestones,
                              tasks: [...prev.tasks, newTask]
                            };
                          });
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Task
                      </button>
                    </div>
                    <div className="space-y-2">
                      {milestone.tasks.map((taskId, taskIndex) => {
                        const task = formData.tasks.find(t => t.id === taskId);
                        if (!task) return null;

                        return (
                          <div key={taskId} className="space-y-2 p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={task.title}
                                onChange={e => {
                                  setFormData(prev => {
                                    const newTasks = [...prev.tasks];
                                    const taskIndex = newTasks.findIndex(t => t.id === taskId);
                                    if (taskIndex === -1) return prev;
                                    
                                    newTasks[taskIndex] = {
                                      ...newTasks[taskIndex],
                                      title: e.target.value
                                    };
                                    return { ...prev, tasks: newTasks };
                                  });
                                }}
                                className="flex-1 p-1 border rounded"
                                placeholder="Task title"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => {
                                    const newMilestones = [...prev.milestones];
                                    newMilestones[index] = {
                                      ...newMilestones[index],
                                      tasks: newMilestones[index].tasks.filter(id => id !== taskId)
                                    };
                                    return {
                                      ...prev,
                                      milestones: newMilestones,
                                      tasks: prev.tasks.filter(t => t.id !== taskId)
                                    };
                                  });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <DatePicker
                                label="Due Date"
                                value={getDateFromTimestamp(task.dueDate)}
                                onChange={(date) => {
                                  setFormData(prev => {
                                    const newTasks = [...prev.tasks];
                                    const taskIndex = newTasks.findIndex(t => t.id === taskId);
                                    if (taskIndex === -1) return prev;
                                    
                                    newTasks[taskIndex] = {
                                      ...newTasks[taskIndex],
                                      dueDate: createTimestamp(date)
                                    };
                                    return { ...prev, tasks: newTasks };
                                  });
                                }}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    className: "w-full p-2 border rounded-md"
                                  }
                                }}
                              />
                            </LocalizationProvider>
                            <select
                              value={task.status}
                              onChange={e => {
                                setFormData(prev => {
                                  const newTasks = [...prev.tasks];
                                  const taskIndex = newTasks.findIndex(t => t.id === taskId);
                                  if (taskIndex === -1) return prev;
                                  
                                  newTasks[taskIndex] = {
                                    ...newTasks[taskIndex],
                                    status: e.target.value as TaskStatus,
                                    completed: e.target.value === 'completed'
                                  };
                                  return { ...prev, tasks: newTasks };
                                });
                              }}
                              className="w-full p-2 border rounded-md"
                            >
                              {STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={task.sharedWith.join(', ')}
                                onChange={e => {
                                  setFormData(prev => {
                                    const newTasks = [...prev.tasks];
                                    const taskIndex = newTasks.findIndex(t => t.id === taskId);
                                    if (taskIndex === -1) return prev;
                                    
                                    newTasks[taskIndex] = {
                                      ...newTasks[taskIndex],
                                      sharedWith: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                                    };
                                    return { ...prev, tasks: newTasks };
                                  });
                                }}
                                className="flex-1 p-1 border rounded"
                                placeholder="Share with (comma-separated emails)"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Routines for this milestone */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">Routines</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newRoutine: Routine = {
                            id: crypto.randomUUID(),
                            title: '',
                            description: '',
                            frequency: 'daily',
                            schedule: {
                              type: 'daily',
                              targetCount: 1,
                              timeOfDay: { hour: 9, minute: 0 },
                              daysOfWeek: [],
                              monthsOfYear: []
                            },
                            targetCount: 1,
                            completionDates: [],
                            ownerId: formData.ownerId,
                            createdAt: defaultTimestamp,
                            updatedAt: defaultTimestamp,
                            review: {
                              reflectionFrequency: 'weekly',
                              reviewStatus: {
                                lastReviewDate: defaultTimestamp,
                                nextReviewDate: defaultTimestamp,
                                completedReviews: []
                              },
                              adherenceRate: 0,
                              streakData: {
                                currentStreak: 0,
                                longestStreak: 0,
                                lastCompletedDate: defaultTimestamp
                              }
                            }
                          };

                          setFormData(prev => {
                            const newMilestones = [...prev.milestones];
                            newMilestones[index] = {
                              ...newMilestones[index],
                              routines: [...(newMilestones[index].routines || []), newRoutine.id]
                            };
                            return {
                              ...prev,
                              milestones: newMilestones,
                              routines: [...prev.routines, newRoutine]
                            };
                          });
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Routine
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(milestone.routines || [])?.map((routineId, routineIndex) => {
                        const routine = formData.routines.find(r => getRoutineId(r) === routineId);
                        if (!routine) return null;

                        return (
                          <div key={routineId} className="space-y-2 p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={routine.title}
                                onChange={e => {
                                  setFormData(prev => {
                                    const newRoutines = [...prev.routines];
                                    const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === routineId);
                                    if (routineIndex === -1) return prev;
                                    
                                    newRoutines[routineIndex] = {
                                      ...newRoutines[routineIndex],
                                      title: e.target.value
                                    };
                                    return { ...prev, routines: newRoutines };
                                  });
                                }}
                                className="flex-1 p-1 border rounded"
                                placeholder="Routine title"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => {
                                    const newMilestones = [...prev.milestones];
                                    newMilestones[index] = {
                                      ...newMilestones[index],
                                      routines: newMilestones[index].routines?.filter(id => id !== routineId) || []
                                    };
                                    return {
                                      ...prev,
                                      milestones: newMilestones,
                                      routines: prev.routines.filter(r => getRoutineId(r) !== routineId)
                                    };
                                  });
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <textarea
                              value={routine.description || ''}
                              onChange={e => {
                                setFormData(prev => {
                                  const newRoutines = [...prev.routines];
                                  const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === routineId);
                                  if (routineIndex === -1) return prev;
                                  
                                  newRoutines[routineIndex] = {
                                    ...newRoutines[routineIndex],
                                    description: e.target.value
                                  };
                                  return { ...prev, routines: newRoutines };
                                });
                              }}
                              className="w-full p-2 border rounded-md"
                              placeholder="Routine description"
                              rows={2}
                            />
                            <select
                              value={routine.frequency}
                              onChange={e => {
                                const frequency = e.target.value as Routine['frequency'];
                                setFormData(prev => {
                                  const newRoutines = [...prev.routines];
                                  const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === routineId);
                                  if (routineIndex === -1) return prev;
                                  
                                  newRoutines[routineIndex] = {
                                    ...newRoutines[routineIndex],
                                    frequency,
                                    schedule: {
                                      ...newRoutines[routineIndex].schedule,
                                      type: frequency,
                                      daysOfWeek: [],
                                      timeOfDay: { hour: 9, minute: 0 }
                                    }
                                  };
                                  return { ...prev, routines: newRoutines };
                                });
                              }}
                              className="w-full p-2 border rounded-md"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                            {routine.frequency === 'weekly' && (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Schedule
                                </label>
                                {[...Array(routine.targetCount)].map((_, scheduleIndex) => (
                                  <div key={scheduleIndex} className="flex gap-2">
                                    <select
                                      value={routine.schedule.daysOfWeek?.[scheduleIndex]?.day || 'monday'}
                                      onChange={e => {
                                        setFormData(prev => {
                                          const newRoutines = [...prev.routines];
                                          const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                          if (routineIndex === -1) return prev;
                                          
                                          const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                          newDaysOfWeek[scheduleIndex] = {
                                            ...(newDaysOfWeek[scheduleIndex] || { time: { hour: 9, minute: 0 } }),
                                            day: e.target.value as DayOfWeek
                                          };
                                          
                                          newRoutines[routineIndex] = {
                                            ...newRoutines[routineIndex],
                                            schedule: {
                                              ...newRoutines[routineIndex].schedule,
                                              daysOfWeek: newDaysOfWeek
                                            }
                                          };
                                          return { ...prev, routines: newRoutines };
                                        });
                                      }}
                                      className="flex-1 p-2 border rounded-md"
                                    >
                                      <option value="monday">Monday</option>
                                      <option value="tuesday">Tuesday</option>
                                      <option value="wednesday">Wednesday</option>
                                      <option value="thursday">Thursday</option>
                                      <option value="friday">Friday</option>
                                      <option value="saturday">Saturday</option>
                                      <option value="sunday">Sunday</option>
                                    </select>
                                    <input
                                      type="time"
                                      value={`${String(routine.schedule.daysOfWeek?.[scheduleIndex]?.time?.hour || 9).padStart(2, '0')}:${String(routine.schedule.daysOfWeek?.[scheduleIndex]?.time?.minute || 0).padStart(2, '0')}`}
                                      onChange={e => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        setFormData(prev => {
                                          const newRoutines = [...prev.routines];
                                          const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                          if (routineIndex === -1) return prev;
                                          
                                          const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                          newDaysOfWeek[scheduleIndex] = {
                                            ...(newDaysOfWeek[scheduleIndex] || { day: 'monday' }),
                                            time: { hour: hours, minute: minutes }
                                          };
                                          
                                          newRoutines[routineIndex] = {
                                            ...newRoutines[routineIndex],
                                            schedule: {
                                              ...newRoutines[routineIndex].schedule,
                                              daysOfWeek: newDaysOfWeek
                                            }
                                          };
                                          return { ...prev, routines: newRoutines };
                                        });
                                      }}
                                      className="w-32 p-2 border rounded-md"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {routine.frequency === 'monthly' && (
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  Day of Month
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  max="31"
                                  value={routine.schedule.dayOfMonth || 1}
                                  onChange={e => {
                                    const dayOfMonth = parseInt(e.target.value) || 1;
                                    setFormData(prev => {
                                      const newRoutines = [...prev.routines];
                                      const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                      if (routineIndex === -1) return prev;
                                      
                                      newRoutines[routineIndex] = {
                                        ...newRoutines[routineIndex],
                                        schedule: {
                                          ...newRoutines[routineIndex].schedule,
                                          dayOfMonth
                                        }
                                      };
                                      return { ...prev, routines: newRoutines };
                                    });
                                  }}
                                  className="w-full p-2 border rounded-md"
                                />
                              </div>
                            )}
                            <input
                              type="number"
                              min="1"
                              value={routine.targetCount}
                              onChange={e => {
                                const targetCount = parseInt(e.target.value) || 1;
                                setFormData(prev => {
                                  const newRoutines = [...prev.routines];
                                  const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                  if (routineIndex === -1) return prev;
                                  
                                  newRoutines[routineIndex] = {
                                    ...newRoutines[routineIndex],
                                    targetCount,
                                    schedule: {
                                      ...newRoutines[routineIndex].schedule,
                                      targetCount
                                    }
                                  };
                                  return { ...prev, routines: newRoutines };
                                });
                              }}
                              className="w-full p-2 border rounded-md"
                              placeholder="Target count"
                            />
                            <LocalizationProvider dateAdapter={AdapterDateFns}>
                              <DatePicker
                                label="End Date (Optional)"
                                value={getDateFromTimestamp(routine.endDate)}
                                onChange={(date) => {
                                  setFormData(prev => {
                                    const newRoutines = [...prev.routines];
                                    const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                    if (routineIndex === -1) return prev;
                                    
                                    newRoutines[routineIndex] = {
                                      ...newRoutines[routineIndex],
                                      endDate: createTimestamp(date)
                                    };
                                    return { ...prev, routines: newRoutines };
                                  });
                                }}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    className: "w-full p-2 border rounded-md"
                                  }
                                }}
                              />
                            </LocalizationProvider>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addMilestone}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Milestone
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tasks
            </label>
            <div className="space-y-4">
              {formData.tasks?.map((task, index) => (
                <div key={task.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Task {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          tasks: prev.tasks?.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={task.title}
                    onChange={e => {
                      setFormData(prev => {
                        const newTasks = [...(prev.tasks || [])];
                        newTasks[index] = { ...newTasks[index], title: e.target.value };
                        return { ...prev, tasks: newTasks };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    placeholder="Task title"
                    required
                  />
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Due Date"
                      value={getDateFromTimestamp(task.dueDate)}
                      onChange={(date) => {
                        setFormData(prev => {
                          const newTasks = [...(prev.tasks || [])];
                          newTasks[index] = {
                            ...newTasks[index],
                            dueDate: createTimestamp(date)
                          };
                          return { ...prev, tasks: newTasks };
                        });
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          className: "w-full p-2 border rounded-md"
                        }
                      }}
                    />
                  </LocalizationProvider>
                  <select
                    value={task.status}
                    onChange={e => {
                      setFormData(prev => {
                        const newTasks = [...(prev.tasks || [])];
                        newTasks[index] = {
                          ...newTasks[index],
                          status: e.target.value as TaskStatus,
                          completed: e.target.value === 'completed'
                        };
                        return { ...prev, tasks: newTasks };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                type="button"
                onClick={addTask}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Habits & Routines
            </label>
            <div className="space-y-4">
              {formData.routines?.map((routine, index) => (
                <div key={getRoutineId(routine)} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Routine {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          routines: prev.routines?.filter((_, i) => i !== index)
                        }));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={routine.title}
                    onChange={e => {
                      setFormData(prev => {
                        const newRoutines = [...(prev.routines || [])];
                        newRoutines[index] = { ...newRoutines[index], title: e.target.value };
                        return { ...prev, routines: newRoutines };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    placeholder="Routine title"
                    required
                  />
                  <textarea
                    value={routine.description || ''}
                    onChange={e => {
                      setFormData(prev => {
                        const newRoutines = [...(prev.routines || [])];
                        newRoutines[index] = { ...newRoutines[index], description: e.target.value };
                        return { ...prev, routines: newRoutines };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    placeholder="Routine description"
                    rows={2}
                  />
                  <select
                    value={routine.frequency}
                    onChange={e => {
                      const frequency = e.target.value as Routine['frequency'];
                      setFormData(prev => {
                        const newRoutines = [...prev.routines];
                        const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                        if (routineIndex === -1) return prev;
                        
                        newRoutines[routineIndex] = {
                          ...newRoutines[routineIndex],
                          frequency,
                          schedule: {
                            ...newRoutines[routineIndex].schedule,
                            type: frequency,
                            daysOfWeek: [],
                            timeOfDay: { hour: 9, minute: 0 }
                          }
                        };
                        return { ...prev, routines: newRoutines };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  {routine.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Schedule
                      </label>
                      {[...Array(routine.targetCount)].map((_, scheduleIndex) => (
                        <div key={scheduleIndex} className="flex gap-2">
                          <select
                            value={routine.schedule.daysOfWeek?.[scheduleIndex]?.day || 'monday'}
                            onChange={e => {
                              setFormData(prev => {
                                const newRoutines = [...prev.routines];
                                const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                if (routineIndex === -1) return prev;
                                
                                const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                newDaysOfWeek[scheduleIndex] = {
                                  ...(newDaysOfWeek[scheduleIndex] || { time: { hour: 9, minute: 0 } }),
                                  day: e.target.value as DayOfWeek
                                };
                                
                                newRoutines[routineIndex] = {
                                  ...newRoutines[routineIndex],
                                  schedule: {
                                    ...newRoutines[routineIndex].schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                                return { ...prev, routines: newRoutines };
                              });
                            }}
                            className="flex-1 p-2 border rounded-md"
                          >
                            <option value="monday">Monday</option>
                            <option value="tuesday">Tuesday</option>
                            <option value="wednesday">Wednesday</option>
                            <option value="thursday">Thursday</option>
                            <option value="friday">Friday</option>
                            <option value="saturday">Saturday</option>
                            <option value="sunday">Sunday</option>
                          </select>
                          <input
                            type="time"
                            value={`${String(routine.schedule.daysOfWeek?.[scheduleIndex]?.time?.hour || 9).padStart(2, '0')}:${String(routine.schedule.daysOfWeek?.[scheduleIndex]?.time?.minute || 0).padStart(2, '0')}`}
                            onChange={e => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              setFormData(prev => {
                                const newRoutines = [...prev.routines];
                                const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                if (routineIndex === -1) return prev;
                                
                                const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                newDaysOfWeek[scheduleIndex] = {
                                  ...(newDaysOfWeek[scheduleIndex] || { day: 'monday' }),
                                  time: { hour: hours, minute: minutes }
                                };
                                
                                newRoutines[routineIndex] = {
                                  ...newRoutines[routineIndex],
                                  schedule: {
                                    ...newRoutines[routineIndex].schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                                return { ...prev, routines: newRoutines };
                              });
                            }}
                            className="w-32 p-2 border rounded-md"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {routine.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Day of Month
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={routine.schedule.dayOfMonth || 1}
                        onChange={e => {
                          const dayOfMonth = parseInt(e.target.value) || 1;
                          setFormData(prev => {
                            const newRoutines = [...prev.routines];
                            const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                            if (routineIndex === -1) return prev;
                            
                            newRoutines[routineIndex] = {
                              ...newRoutines[routineIndex],
                              schedule: {
                                ...newRoutines[routineIndex].schedule,
                                dayOfMonth
                              }
                            };
                            return { ...prev, routines: newRoutines };
                          });
                        }}
                        className="w-full p-2 border rounded-md"
                      />
                    </div>
                  )}
                  <input
                    type="number"
                    min="1"
                    value={routine.targetCount}
                    onChange={e => {
                      const targetCount = parseInt(e.target.value) || 1;
                      setFormData(prev => {
                        const newRoutines = [...prev.routines];
                        const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                        if (routineIndex === -1) return prev;
                        
                        newRoutines[routineIndex] = {
                          ...newRoutines[routineIndex],
                          targetCount,
                          schedule: {
                            ...newRoutines[routineIndex].schedule,
                            targetCount
                          }
                        };
                        return { ...prev, routines: newRoutines };
                      });
                    }}
                    className="w-full p-2 border rounded-md"
                    placeholder="Target count"
                  />
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="End Date (Optional)"
                      value={getDateFromTimestamp(routine.endDate)}
                      onChange={(date) => {
                        setFormData(prev => {
                          const newRoutines = [...prev.routines];
                          const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                          if (routineIndex === -1) return prev;
                          
                          newRoutines[routineIndex] = {
                            ...newRoutines[routineIndex],
                            endDate: createTimestamp(date)
                          };
                          return { ...prev, routines: newRoutines };
                        });
                      }}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          className: "w-full p-2 border rounded-md"
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
              ))}
              <button
                type="button"
                onClick={addRoutine}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Routine
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/goals')}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditGoalPage; 