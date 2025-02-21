import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Edit, Trash2, Plus, Users, CheckCircle, Clock, X } from 'lucide-react';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { useAreasContext } from '../contexts/AreasContext';
import { SharedReviewsProvider } from '../contexts/SharedReviewsContext';
import { Timestamp as FirebaseTimestamp } from 'firebase/firestore';
import type { 
  DayOfWeek, 
  TimeOfDay, 
  RoutineSchedule, 
  RoutineWithoutSystemFields,
  MeasurableMetric,
  ReviewCycle,
  Timestamp
} from '../types';
import { ShareModal } from '../components/ShareModal';
import { CircularProgress, Box } from '@mui/material';
import { HouseholdMemberSelect } from '../components/HouseholdMemberSelect';

type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'not_started' | 'in_progress' | 'completed';

interface RoutineFormData {
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: {
    daysOfWeek: {
      day: DayOfWeek;
      time: TimeOfDay;
      specificDate?: Timestamp;
      assignedTo?: string;
      assignedToEmail?: string;
    }[];
    dayOfMonth?: number;
    monthsOfYear: number[];
    timeOfDay: TimeOfDay;
  };
  targetCount: number;
  endDate?: string;
}

const DAYS_OF_WEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MEASURABLE_METRIC_LABELS: Record<MeasurableMetric, string> = {
  count_occurrences: 'Count occurrences',
  track_numeric: 'Track numeric value',
  time_spent: 'Track time spent',
  completion_rate: 'Track completion rate (%)',
  binary_check: 'Yes/No completion',
  custom: 'Custom metric'
};

const REVIEW_CYCLE_LABELS: Record<ReviewCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: 'Every 6 months',
  yearly: 'Yearly'
};

// Cleaning function to remove undefined values recursively
const cleanData = (data: any): any => {
  if (data === undefined) return undefined;
  if (Array.isArray(data)) return data.map(item => cleanData(item));
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, cleanData(value)])
    );
  }
  return data;
};

const GoalDetailPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, loading: goalsLoading, deleteGoal, updateGoal } = useGoalsContext();
  const { sharedGoals, userGoals, loading: sharedLoading, updateUserGoal } = useSharedGoalsContext();
  const { areas } = useAreasContext();

  const goal = goals.find(g => g.id === goalId);
  const sharedGoal = sharedGoals.find(sg => sg.id === goalId);
  const userGoal = userGoals.find(ug => ug.parentGoalId === goalId);

  const isSharedGoal = !!sharedGoal;
  const displayGoal = isSharedGoal ? userGoal : goal;
  const area = areas.find(a => a.id === displayGoal?.areaId);

  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [routineForm, setRoutineForm] = useState<RoutineFormData>({
    title: '',
    description: '',
    frequency: 'daily',
    schedule: {
      daysOfWeek: [],
      dayOfMonth: undefined,
      monthsOfYear: [],
      timeOfDay: {
        hour: 9,
        minute: 0
      }
    },
    targetCount: 1
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as TaskPriority,
    status: 'not_started' as TaskStatus,
    assignedTo: undefined as string | undefined
  });
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    targetDate: '',
    successCriteria: '',
    status: 'not_started' as TaskStatus
  });

  const handleDelete = async () => {
    if (!goalId) return;
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
        navigate('/goals');
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  const handleAddRoutine = async () => {
    if (!routineForm.title.trim() || !displayGoal) return;

    try {
      // Create the schedule object with the correct type
      const schedule: RoutineSchedule = {
        type: routineForm.frequency,
        targetCount: routineForm.targetCount,
        timeOfDay: routineForm.frequency !== 'weekly' ? routineForm.schedule.timeOfDay : undefined,
        daysOfWeek: routineForm.frequency === 'weekly' ? routineForm.schedule.daysOfWeek : undefined,
        dayOfMonth: routineForm.frequency === 'monthly' ? routineForm.schedule.dayOfMonth : undefined,
        monthsOfYear: ['quarterly', 'yearly'].includes(routineForm.frequency) ? routineForm.schedule.monthsOfYear : undefined
      };

      const newRoutine: RoutineWithoutSystemFields = {
        title: routineForm.title.trim(),
        description: routineForm.description?.trim() || '',
        frequency: routineForm.frequency,
        schedule,
        targetCount: routineForm.targetCount,
        endDate: routineForm.endDate ? FirebaseTimestamp.fromDate(new Date(routineForm.endDate)) : undefined,
        completionDates: [],
        weeklyCompletionTracker: new Array(7).fill(false),
        areaId: displayGoal.areaId,
        assignedTo: undefined
      };

      const cleanedRoutine = cleanData(newRoutine) as RoutineWithoutSystemFields;

      const updatedRoutines = displayGoal.routines ? [...displayGoal.routines, cleanedRoutine] : [cleanedRoutine];
      
      if ('parentGoalId' in displayGoal) {
        await updateUserGoal(displayGoal.id, { routines: updatedRoutines });
      } else {
        await updateGoal(displayGoal.id, { routines: updatedRoutines });
      }

      setRoutineForm({
        title: '',
        description: '',
        frequency: 'daily',
        schedule: {
          daysOfWeek: [],
          monthsOfYear: [],
          timeOfDay: { hour: 9, minute: 0 }
        },
        targetCount: 1
      });
      setShowRoutineForm(false);
    } catch (err) {
      console.error('Error adding routine:', err);
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.title.trim() || !displayGoal) return;

    try {
      const newTask = {
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || '',
        dueDate: taskForm.dueDate ? FirebaseTimestamp.fromDate(new Date(taskForm.dueDate)) : undefined,
        priority: taskForm.priority,
        status: taskForm.status,
        assignedTo: taskForm.assignedTo,
        completed: false
      };

      const cleanedTask = cleanData(newTask);
      const updatedTasks = displayGoal.tasks ? [...displayGoal.tasks, cleanedTask] : [cleanedTask];
      
      if ('parentGoalId' in displayGoal) {
        await updateUserGoal(displayGoal.id, { tasks: updatedTasks });
      } else {
        await updateGoal(displayGoal.id, { tasks: updatedTasks });
      }

      setTaskForm({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        status: 'not_started',
        assignedTo: undefined
      });
      setShowTaskForm(false);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.name.trim() || !displayGoal) return;

    try {
      const newMilestone = {
        name: milestoneForm.name.trim(),
        targetDate: milestoneForm.targetDate ? FirebaseTimestamp.fromDate(new Date(milestoneForm.targetDate)) : undefined,
        successCriteria: milestoneForm.successCriteria.trim(),
        status: milestoneForm.status,
        tasks: []
      };

      const cleanedMilestone = cleanData(newMilestone);
      const updatedMilestones = displayGoal.milestones ? [...displayGoal.milestones, cleanedMilestone] : [cleanedMilestone];
      
      if ('parentGoalId' in displayGoal) {
        await updateUserGoal(displayGoal.id, { milestones: updatedMilestones });
      } else {
        await updateGoal(displayGoal.id, { milestones: updatedMilestones });
      }

      setMilestoneForm({
        name: '',
        targetDate: '',
        successCriteria: '',
        status: 'not_started'
      });
      setShowMilestoneForm(false);
    } catch (err) {
      console.error('Error adding milestone:', err);
    }
  };

  // Helper function to format Firebase Timestamp or our custom Timestamp
  const formatDate = (timestamp: Timestamp | FirebaseTimestamp | undefined) => {
    if (!timestamp) return '';
    
    // If it's a Firebase Timestamp (has toDate method)
    if ('toDate' in timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    
    // If it's our custom Timestamp
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000).toLocaleDateString();
  };

  const renderRoutineForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Routine</h2>
            <button
              onClick={() => setShowRoutineForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={routineForm.title}
                onChange={e => setRoutineForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={routineForm.description}
                onChange={e => setRoutineForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={routineForm.frequency}
                onChange={e => setRoutineForm(prev => ({ 
                  ...prev, 
                  frequency: e.target.value as RoutineFormData['frequency']
                }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {routineForm.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Days and Times
                </label>
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map(day => {
                    const daySchedule = routineForm.schedule.daysOfWeek.find(d => d.day === day);
                    
                    return (
                      <div key={day} className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setRoutineForm(prev => {
                              const newDaysOfWeek = daySchedule
                                ? prev.schedule.daysOfWeek.filter(d => d.day !== day)
                                : [...prev.schedule.daysOfWeek, {
                                    day,
                                    time: { hour: 9, minute: 0 },
                                    specificDate: undefined,
                                    assignedTo: undefined,
                                    assignedToEmail: undefined
                                  }];
                              
                              return {
                                ...prev,
                                schedule: {
                                  ...prev.schedule,
                                  daysOfWeek: newDaysOfWeek
                                }
                              };
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-sm ${
                            daySchedule
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </button>
                        
                        {daySchedule && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="23"
                                value={daySchedule.time.hour}
                                onChange={e => {
                                  setRoutineForm(prev => ({
                                    ...prev,
                                    schedule: {
                                      ...prev.schedule,
                                      daysOfWeek: prev.schedule.daysOfWeek.map(d =>
                                        d.day === day
                                          ? {
                                              ...d,
                                              time: {
                                                ...d.time,
                                                hour: parseInt(e.target.value)
                                              }
                                            }
                                          : d
                                      )
                                    }
                                  }));
                                }}
                                className="w-20 p-2 border rounded-md"
                              />
                              <span className="self-center">:</span>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={daySchedule.time.minute}
                                onChange={e => {
                                  setRoutineForm(prev => ({
                                    ...prev,
                                    schedule: {
                                      ...prev.schedule,
                                      daysOfWeek: prev.schedule.daysOfWeek.map(d =>
                                        d.day === day
                                          ? {
                                              ...d,
                                              time: {
                                                ...d.time,
                                                minute: parseInt(e.target.value)
                                              }
                                            }
                                          : d
                                      )
                                    }
                                  }));
                                }}
                                className="w-20 p-2 border rounded-md"
                              />
                            </div>

                            {/* Specific Date Override */}
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">Specific Date:</label>
                              <input
                                type="date"
                                value={daySchedule.specificDate ? formatDate(daySchedule.specificDate).split('T')[0] : ''}
                                onChange={e => {
                                  setRoutineForm(prev => ({
                                    ...prev,
                                    schedule: {
                                      ...prev.schedule,
                                      daysOfWeek: prev.schedule.daysOfWeek.map(d =>
                                        d.day === day
                                          ? {
                                              ...d,
                                              specificDate: e.target.value 
                                                ? FirebaseTimestamp.fromDate(new Date(e.target.value))
                                                : undefined
                                            }
                                          : d
                                      )
                                    }
                                  }));
                                }}
                                className="w-40 p-2 border rounded-md"
                              />
                            </div>

                            {/* Assign To */}
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-600">Assign to:</label>
                              <HouseholdMemberSelect
                                value={daySchedule.assignedTo || ''}
                                onChange={(value) => {
                                  setRoutineForm(prev => ({
                                    ...prev,
                                    schedule: {
                                      ...prev.schedule,
                                      daysOfWeek: prev.schedule.daysOfWeek.map(d =>
                                        d.day === day
                                          ? {
                                              ...d,
                                              assignedTo: value,
                                              assignedToEmail: value // You would typically get this from the selected member
                                            }
                                          : d
                                      )
                                    }
                                  }));
                                }}
                                className="w-48 p-2 border rounded-md"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {routineForm.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Month
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={routineForm.schedule.dayOfMonth || 1}
                  onChange={e => setRoutineForm(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      dayOfMonth: parseInt(e.target.value)
                    }
                  }))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            )}

            {['quarterly', 'yearly'].includes(routineForm.frequency) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Months
                </label>
                <div className="flex flex-wrap gap-2">
                  {MONTHS.map((month, index) => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => {
                        setRoutineForm(prev => ({
                          ...prev,
                          schedule: {
                            ...prev.schedule,
                            monthsOfYear: prev.schedule.monthsOfYear.includes(index + 1)
                              ? prev.schedule.monthsOfYear.filter(m => m !== index + 1)
                              : [...prev.schedule.monthsOfYear, index + 1]
                          }
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        routineForm.schedule.monthsOfYear.includes(index + 1)
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time of Day
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={routineForm.schedule.timeOfDay.hour}
                  onChange={e => setRoutineForm(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      timeOfDay: {
                        ...prev.schedule.timeOfDay,
                        hour: parseInt(e.target.value)
                      }
                    }
                  }))}
                  className="w-20 p-2 border rounded-md"
                />
                <span className="self-center">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={routineForm.schedule.timeOfDay.minute}
                  onChange={e => setRoutineForm(prev => ({
                    ...prev,
                    schedule: {
                      ...prev.schedule,
                      timeOfDay: {
                        ...prev.schedule.timeOfDay,
                        minute: parseInt(e.target.value)
                      }
                    }
                  }))}
                  className="w-20 p-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Count (times per {routineForm.frequency})
              </label>
              <input
                type="number"
                min="1"
                value={routineForm.targetCount}
                onChange={e => setRoutineForm(prev => ({ ...prev, targetCount: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (optional)
              </label>
              <input
                type="date"
                value={routineForm.endDate || ''}
                onChange={e => setRoutineForm(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowRoutineForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRoutine}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!routineForm.title.trim()}
            >
              Add Routine
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTaskForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Task</h2>
            <button
              onClick={() => setShowTaskForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={taskForm.title}
                onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={taskForm.description}
                onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={taskForm.status}
                onChange={e => setTaskForm(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowTaskForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!taskForm.title.trim()}
            >
              Add Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMilestoneForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add Milestone</h2>
            <button
              onClick={() => setShowMilestoneForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={milestoneForm.name}
                onChange={e => setMilestoneForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={milestoneForm.targetDate}
                onChange={e => setMilestoneForm(prev => ({ ...prev, targetDate: e.target.value }))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Success Criteria
              </label>
              <textarea
                value={milestoneForm.successCriteria}
                onChange={e => setMilestoneForm(prev => ({ ...prev, successCriteria: e.target.value }))}
                className="w-full p-2 border rounded-md"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={milestoneForm.status}
                onChange={e => setMilestoneForm(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowMilestoneForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMilestone}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!milestoneForm.name.trim()}
            >
              Add Milestone
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (goalsLoading || sharedLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!goalId || (!goal && !sharedGoal)) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">
          Goal not found. <button 
            onClick={() => navigate('/goals')}
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Return to Goals
          </button>
        </div>
      </div>
    );
  }

  if (!displayGoal) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center text-gray-500 py-12">
          Unable to display goal details. Please try again later.
        </div>
      </div>
    );
  }

  console.log('Goal Data:', {
    id: displayGoal.id,
    name: displayGoal.name,
    routines: displayGoal.routines,
    isSharedGoal,
    userGoal: userGoal ? { id: userGoal.id, routines: userGoal.routines } : null,
    goal: goal ? { id: goal.id, routines: goal.routines } : null
  });

  return (
    <SharedReviewsProvider goalId={goalId}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/goals')}
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{displayGoal.name}</h1>
            {area && (
              <p className="mt-1 text-gray-600">
                Area: {area.name}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Share goal"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate(`/goals/${goalId}/edit`)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Edit goal"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Delete goal"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Goal details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Goal Details</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Specific Action</h3>
                  <p className="mt-1 text-gray-600">{displayGoal.specificAction}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Measurable Metric</h3>
                  <p className="mt-1 text-gray-600">
                    {MEASURABLE_METRIC_LABELS[displayGoal.measurableMetric]}
                    {displayGoal.customMetric && (
                      <span className="block text-sm text-gray-500">
                        Custom metric: {displayGoal.customMetric}
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Achievability</h3>
                  <p className="mt-1 text-gray-600">{displayGoal.achievabilityCheck}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Relevance</h3>
                  <p className="mt-1 text-gray-600">{displayGoal.relevance}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700">Time Tracking</h3>
                  {displayGoal.timeTracking.type === 'fixed_deadline' ? (
                    displayGoal.timeTracking.deadline && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Deadline: {formatDate(displayGoal.timeTracking.deadline)}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        Continuous goal with {REVIEW_CYCLE_LABELS[displayGoal.timeTracking.reviewCycle || 'monthly']} reviews
                      </p>
                      {displayGoal.timeTracking.nextReviewDate && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Next review: {formatDate(displayGoal.timeTracking.nextReviewDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Milestones</h2>
                <button
                  onClick={() => setShowMilestoneForm(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Milestone
                </button>
              </div>

              <div className="space-y-4">
                {displayGoal.milestones.map((milestone, index) => (
                  <div 
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800">{milestone.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {milestone.successCriteria}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        milestone.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : milestone.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                    {milestone.targetDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                        <Calendar className="w-4 h-4" />
                        {formatDate(milestone.targetDate)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Tasks and Routines */}
          <div className="space-y-6">
            {/* Routines */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Routines & Habits</h2>
                <button
                  onClick={() => setShowRoutineForm(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Routine
                </button>
              </div>

              <div className="space-y-3">
                {displayGoal.routines.map((routine, index) => (
                  <div 
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800">{routine.title}</h3>
                        {routine.description && (
                          <p className="text-sm text-gray-600 mt-1">{routine.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>
                        {routine.targetCount} times per {routine.frequency}
                      </p>
                      {routine.schedule.timeOfDay && (
                        <p className="mt-1 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {String(routine.schedule.timeOfDay.hour).padStart(2, '0')}:
                          {String(routine.schedule.timeOfDay.minute).padStart(2, '0')}
                        </p>
                      )}
                      {routine.schedule.daysOfWeek && routine.schedule.daysOfWeek.length > 0 && (
                        <p className="mt-1">
                          On: {routine.schedule.daysOfWeek.map(daySchedule => 
                            `${daySchedule.day.charAt(0).toUpperCase() + daySchedule.day.slice(1)} at ${String(daySchedule.time.hour).padStart(2, '0')}:${String(daySchedule.time.minute).padStart(2, '0')}`
                          ).join(', ')}
                        </p>
                      )}
                      {routine.schedule.dayOfMonth && (
                        <p className="mt-1">
                          On day {routine.schedule.dayOfMonth} of each month
                        </p>
                      )}
                      {routine.endDate && (
                        <p className="mt-1">
                          Until: {formatDate(routine.endDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Tasks</h2>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add Task
                </button>
              </div>

              <div className="space-y-3">
                {displayGoal.tasks.map((task, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle 
                        className={`w-5 h-5 ${
                          task.completed ? 'text-green-500' : 'text-gray-300'
                        }`} 
                      />
                      <div>
                        <p className="text-gray-800">{task.title}</p>
                        {task.dueDate && (
                          <p className="text-sm text-gray-500">
                            Due: {formatDate(task.dueDate)}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' 
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shared With (if applicable) */}
            {isSharedGoal && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Shared With</h2>
                </div>
                <div className="space-y-2">
                  {sharedGoal.sharedWith.map((userId, index) => (
                    <div key={index} className="flex items-center gap-2 text-gray-600">
                      {/* Here you would typically show user info like name/email */}
                      <span>{userId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showRoutineForm && renderRoutineForm()}
      {showTaskForm && renderTaskForm()}
      {showMilestoneForm && renderMilestoneForm()}
      <ShareModal
        goalId={goalId || ''}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </SharedReviewsProvider>
  );
};

export default GoalDetailPage; 