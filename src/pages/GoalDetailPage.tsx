import React, { useState, useEffect } from 'react';
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
  Timestamp,
  Routine,
  TaskPriority,
  TaskStatus,
  Task,
  Milestone
} from '../types';
import { ShareModal } from '../components/ShareModal';
import { CircularProgress, Box, Container, Typography, Alert } from '@mui/material';
import { HouseholdMemberSelect } from '../components/HouseholdMemberSelect';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/date';
import { cleanData } from '../utils/data';
import { useFirestore } from '../hooks/useFirestore';
import { DAYS_OF_WEEK, MONTHS } from '../constants';
import { toast } from 'react-hot-toast';
import { debounce } from '../utils/debounce';

interface RoutineFormData {
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: RoutineSchedule;
  targetCount: number;
  endDate?: Timestamp;
}

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

// Add Notes interface
interface Notes {
  content: string;
  lastUpdated: Timestamp;
}

const GoalDetailPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { goals, loading: goalsLoading, deleteGoal, updateGoal } = useGoalsContext();
  const { sharedGoals, userGoals, loading: sharedLoading, updateUserGoal } = useSharedGoalsContext();
  const { areas } = useAreasContext();
  const { currentUser } = useAuth();

  // Add detailed logging for goal search
  useEffect(() => {
    if (!goalId) return;
    
    console.log('Searching for goal:', {
      goalId,
      goalsLoading,
      sharedLoading,
      currentUserId: currentUser?.uid,
      goalsCount: goals.length,
      sharedGoalsCount: sharedGoals.length,
      userGoalsCount: userGoals.length,
      goalsIds: goals.map(g => g.id),
      sharedGoalsIds: sharedGoals.map(g => g.id),
      userGoalsIds: userGoals.map(g => g.id)
    });
  }, [goalId, goals, sharedGoals, userGoals, goalsLoading, sharedLoading, currentUser]);

  const goal = goals.find(g => g.id === goalId);
  const sharedGoal = sharedGoals.find(sg => sg.id === goalId);
  const userGoal = userGoals.find(ug => ug.parentGoalId === goalId);

  const isSharedGoal = !!sharedGoal;
  const displayGoal = isSharedGoal ? userGoal : goal;
  const area = areas.find(a => a.id === displayGoal?.areaId);

  // Add logging to track loading states and data
  useEffect(() => {
    console.log('Goal Detail Page State:', {
      goalId,
      goalsLoading,
      sharedLoading,
      hasGoal: !!goal,
      hasSharedGoal: !!sharedGoal,
      hasUserGoal: !!userGoal,
      goals: goals.length,
      sharedGoals: sharedGoals.length,
      userGoals: userGoals.length
    });
  }, [goalId, goalsLoading, sharedLoading, goal, sharedGoal, userGoal, goals, sharedGoals, userGoals]);

  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(null);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
  const [routineForm, setRoutineForm] = useState<RoutineFormData>({
    title: '',
    description: '',
    frequency: 'daily',
    schedule: {
      type: 'daily',
      targetCount: 1,
      timeOfDay: { hour: 9, minute: 0 },
      daysOfWeek: [],
      dayOfMonth: undefined,
      monthsOfYear: []
    },
    targetCount: 1,
    endDate: undefined
  });
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as TaskPriority,
    status: 'not_started' as TaskStatus
  });
  const [milestoneForm, setMilestoneForm] = useState({
    name: '',
    targetDate: '',
    successCriteria: '',
    status: 'not_started' as TaskStatus
  });

  // Add state for notes
  const [notes, setNotes] = useState<string>(displayGoal?.notes?.content || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Add debounced save function
  const saveNotes = debounce(async (content: string) => {
    if (!displayGoal) return;
    
    try {
      setIsSavingNotes(true);
      const notesData: Notes = {
        content,
        lastUpdated: FirebaseTimestamp.now()
      };
      
      if (isSharedGoal && userGoal) {
        await updateUserGoal(userGoal.id, { notes: notesData });
      } else if (goal) {
        await updateGoal(goal.id, { notes: notesData });
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  }, 1000);

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

  const handleRoutineSubmit = async () => {
    if (!displayGoal || !routineForm.title.trim() || !currentUser) return;

    try {
      const now = FirebaseTimestamp.now();
      
      if (editingRoutineId !== null) {
        // Handle edit case
        const updatedRoutines = displayGoal.routines.map((r, index) => {
          if (index === editingRoutineId) {
            return {
              ...r,
              title: routineForm.title.trim(),
              description: routineForm.description?.trim(),
              frequency: routineForm.frequency,
              schedule: routineForm.schedule,
              targetCount: routineForm.targetCount,
              endDate: routineForm.endDate
            };
          }
          return r;
        });

        if (isSharedGoal && userGoal) {
          await updateUserGoal(userGoal.id, { routines: updatedRoutines });
        } else if (goal) {
          await updateGoal(goal.id, { routines: updatedRoutines });
        }
      } else {
        // Handle add case
        const newRoutine = {
          title: routineForm.title.trim(),
          description: routineForm.description?.trim(),
          frequency: routineForm.frequency,
          schedule: routineForm.schedule,
          targetCount: routineForm.targetCount,
          endDate: routineForm.endDate,
          completionDates: [],
          review: {
            reflectionFrequency: 'weekly',
            reviewStatus: {
              lastReviewDate: now,
              nextReviewDate: now,
              completedReviews: []
            },
            adherenceRate: 0,
            streakData: {
              currentStreak: 0,
              longestStreak: 0,
              lastCompletedDate: now
            }
          }
        };

        const updatedRoutines = [...displayGoal.routines, newRoutine];
        
        if (isSharedGoal && userGoal) {
          await updateUserGoal(userGoal.id, { routines: updatedRoutines });
        } else if (goal) {
          await updateGoal(goal.id, { routines: updatedRoutines });
        }
      }

      setShowRoutineForm(false);
      setEditingRoutineId(null);
      setRoutineForm({
        title: '',
        description: '',
        frequency: 'daily',
        schedule: {
          type: 'daily',
          targetCount: 1,
          timeOfDay: { hour: 9, minute: 0 },
          daysOfWeek: [],
          dayOfMonth: undefined,
          monthsOfYear: []
        },
        targetCount: 1,
        endDate: undefined
      });
    } catch (error) {
      console.error('Error managing routine:', error);
    }
  };

  const handleDeleteRoutine = async (index: number) => {
    if (!displayGoal || !window.confirm('Are you sure you want to delete this routine?')) return;

    try {
      const updatedRoutines = displayGoal.routines.filter((_: Routine, i: number) => i !== index);
      
      if (isSharedGoal && userGoal) {
        await updateUserGoal(userGoal.id, { routines: updatedRoutines });
      } else if (goal) {
        await updateGoal(goal.id, { routines: updatedRoutines });
      }
      toast.success('Routine deleted successfully');
    } catch (error) {
      console.error('Error deleting routine:', error);
      toast.error('Failed to delete routine');
    }
  };

  const handleAddTask = async () => {
    if (!taskForm.title.trim() || !displayGoal) return;

    try {
      const newTask = {
        id: crypto.randomUUID(),
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || '',
        dueDate: taskForm.dueDate ? FirebaseTimestamp.fromDate(new Date(taskForm.dueDate)) : undefined,
        priority: taskForm.priority,
        status: taskForm.status,
        assignedTo: undefined,
        completed: false,
        ownerId: displayGoal.ownerId,
        areaId: displayGoal.areaId,
        createdAt: FirebaseTimestamp.now(),
        updatedAt: FirebaseTimestamp.now(),
        sharedWith: [],
        permissions: {
          [displayGoal.ownerId]: { edit: true, view: true }
        }
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
        status: 'not_started'
      });
      setShowTaskForm(false);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.name.trim() || !displayGoal) return;

    try {
      if (editingMilestoneId !== null) {
        // Handle edit case
        const updatedMilestones = displayGoal.milestones.map((m, index) => {
          if (index === editingMilestoneId) {
            return {
              ...m,
              name: milestoneForm.name.trim(),
              targetDate: milestoneForm.targetDate ? FirebaseTimestamp.fromDate(new Date(milestoneForm.targetDate)) : undefined,
              successCriteria: milestoneForm.successCriteria.trim(),
              status: milestoneForm.status
            };
          }
          return m;
        });

        if ('parentGoalId' in displayGoal) {
          await updateUserGoal(displayGoal.id, { milestones: updatedMilestones });
        } else {
          await updateGoal(displayGoal.id, { milestones: updatedMilestones });
        }
      } else {
        // Handle add case
        const newMilestone = {
          name: milestoneForm.name.trim(),
          targetDate: milestoneForm.targetDate ? FirebaseTimestamp.fromDate(new Date(milestoneForm.targetDate)) : undefined,
          successCriteria: milestoneForm.successCriteria.trim(),
          status: milestoneForm.status,
          tasks: [] as string[],
          routines: [] as string[]
        };

        const cleanedMilestone = cleanData(newMilestone);
        const updatedMilestones = displayGoal.milestones ? [...displayGoal.milestones, cleanedMilestone] : [cleanedMilestone];
        
        if ('parentGoalId' in displayGoal) {
          await updateUserGoal(displayGoal.id, { milestones: updatedMilestones });
        } else {
          await updateGoal(displayGoal.id, { milestones: updatedMilestones });
        }
      }

      setMilestoneForm({
        name: '',
        targetDate: '',
        successCriteria: '',
        status: 'not_started'
      });
      setEditingMilestoneId(null);
      setShowMilestoneForm(false);
    } catch (err) {
      console.error('Error managing milestone:', err);
    }
  };

  const handleTaskCompletion = async (taskId: string, completed: boolean) => {
    if (!displayGoal) return;

    try {
      const task = displayGoal.tasks.find((t: Task) => t.id === taskId);
      if (!task) return;

      const updatedTasks = displayGoal.tasks.map((t: Task) =>
        t.id === taskId ? { ...t, completed: !completed } : t
      );

      if (isSharedGoal && userGoal) {
        await updateUserGoal(userGoal.id, { tasks: updatedTasks });
      } else if (goal) {
        await updateGoal(goal.id, { tasks: updatedTasks });
      }
    } catch (error) {
      console.error('Error updating task completion:', error);
    }
  };

  const handleDeleteMilestone = async (index: number) => {
    if (!displayGoal || !window.confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const updatedMilestones = displayGoal.milestones.filter((_: Milestone, i: number) => i !== index);
      
      if (isSharedGoal && userGoal) {
        await updateUserGoal(userGoal.id, { milestones: updatedMilestones });
      } else if (goal) {
        await updateGoal(goal.id, { milestones: updatedMilestones });
      }
      toast.success('Milestone deleted successfully');
    } catch (error) {
      console.error('Error deleting milestone:', error);
      toast.error('Failed to delete milestone');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!displayGoal || !window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const updatedTasks = displayGoal.tasks.filter((t: Task) => t.id !== taskId);
      
      if (isSharedGoal && userGoal) {
        await updateUserGoal(userGoal.id, { tasks: updatedTasks });
      } else if (goal) {
        await updateGoal(goal.id, { tasks: updatedTasks });
      }
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const renderRoutineForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingRoutineId !== null ? 'Edit Routine' : 'Add Routine'}
            </h2>
            <button
              onClick={() => {
                setShowRoutineForm(false);
                setEditingRoutineId(null);
              }}
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
                onChange={e => {
                  const frequency = e.target.value as 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
                  setRoutineForm(prev => ({
                    ...prev,
                    frequency,
                    schedule: {
                      ...prev.schedule,
                      type: frequency,
                      targetCount: 1,
                      daysOfWeek: [],
                      dayOfMonth: undefined,
                      monthsOfYear: []
                    }
                  }));
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Count (per {routineForm.frequency})
              </label>
              <input
                type="number"
                min="1"
                value={routineForm.targetCount}
                onChange={e => setRoutineForm(prev => ({
                  ...prev,
                  targetCount: parseInt(e.target.value),
                  schedule: {
                    ...prev.schedule,
                    targetCount: parseInt(e.target.value)
                  }
                }))}
                className="w-full p-2 border rounded-md"
              />
            </div>

            {routineForm.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule for {routineForm.targetCount} days per week
                </label>
                <div className="space-y-4">
                  {Array.from({ length: routineForm.targetCount }).map((_, index) => {
                    const currentSchedule = routineForm.schedule.daysOfWeek?.[index];
                    return (
                      <div key={index} className="flex items-center gap-4 p-3 border rounded-md">
                        <select
                          value={currentSchedule?.day || 'monday'}
                          onChange={e => {
                            const newDay = e.target.value as DayOfWeek;
                            setRoutineForm(prev => {
                              const newDaysOfWeek = [...(prev.schedule.daysOfWeek || [])];
                              if (newDaysOfWeek[index]) {
                                newDaysOfWeek[index] = {
                                  ...newDaysOfWeek[index],
                                  day: newDay
                                };
                              } else {
                                newDaysOfWeek[index] = {
                                  day: newDay,
                                  time: { hour: 9, minute: 0 }
                                };
                              }
                              return {
                                ...prev,
                                schedule: {
                                  ...prev.schedule,
                                  daysOfWeek: newDaysOfWeek
                                }
                              };
                            });
                          }}
                          className="flex-1 p-2 border rounded-md"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day} value={day.toLowerCase()}>
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={currentSchedule?.time?.hour || 9}
                            onChange={e => {
                              const newHour = parseInt(e.target.value);
                              setRoutineForm(prev => {
                                const newDaysOfWeek = [...(prev.schedule.daysOfWeek || [])];
                                if (newDaysOfWeek[index]) {
                                  newDaysOfWeek[index] = {
                                    ...newDaysOfWeek[index],
                                    time: {
                                      ...newDaysOfWeek[index].time,
                                      hour: newHour
                                    }
                                  };
                                } else {
                                  newDaysOfWeek[index] = {
                                    day: 'monday',
                                    time: { hour: newHour, minute: 0 }
                                  };
                                }
                                return {
                                  ...prev,
                                  schedule: {
                                    ...prev.schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                              });
                            }}
                            className="w-20 p-2 border rounded-md"
                          />
                          <span>:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={currentSchedule?.time?.minute || 0}
                            onChange={e => {
                              const newMinute = parseInt(e.target.value);
                              setRoutineForm(prev => {
                                const newDaysOfWeek = [...(prev.schedule.daysOfWeek || [])];
                                if (newDaysOfWeek[index]) {
                                  newDaysOfWeek[index] = {
                                    ...newDaysOfWeek[index],
                                    time: {
                                      ...newDaysOfWeek[index].time,
                                      minute: newMinute
                                    }
                                  };
                                } else {
                                  newDaysOfWeek[index] = {
                                    day: 'monday',
                                    time: { hour: 9, minute: newMinute }
                                  };
                                }
                                return {
                                  ...prev,
                                  schedule: {
                                    ...prev.schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                              });
                            }}
                            className="w-20 p-2 border rounded-md"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(routineForm.frequency === 'daily' || routineForm.frequency === 'monthly') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time of Day
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={routineForm.schedule.timeOfDay?.hour || 9}
                    onChange={e => setRoutineForm(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        timeOfDay: {
                          ...prev.schedule.timeOfDay!,
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
                    value={routineForm.schedule.timeOfDay?.minute || 0}
                    onChange={e => setRoutineForm(prev => ({
                      ...prev,
                      schedule: {
                        ...prev.schedule,
                        timeOfDay: {
                          ...prev.schedule.timeOfDay!,
                          minute: parseInt(e.target.value)
                        }
                      }
                    }))}
                    className="w-20 p-2 border rounded-md"
                  />
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
                  value={routineForm.schedule.dayOfMonth || ''}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (optional)
              </label>
              <input
                type="date"
                value={routineForm.endDate ? new Date(routineForm.endDate.seconds * 1000).toISOString().split('T')[0] : ''}
                onChange={e => setRoutineForm(prev => ({
                  ...prev,
                  endDate: e.target.value ? FirebaseTimestamp.fromDate(new Date(e.target.value)) : undefined
                }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowRoutineForm(false);
                setEditingRoutineId(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleRoutineSubmit}
              disabled={!routineForm.title.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {editingRoutineId !== null ? 'Save Changes' : 'Add Routine'}
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
            <h2 className="text-2xl font-bold text-gray-900">
              {editingMilestoneId !== null ? 'Edit Milestone' : 'Add Milestone'}
            </h2>
            <button
              onClick={() => {
                setShowMilestoneForm(false);
                setEditingMilestoneId(null);
              }}
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
              onClick={() => {
                setShowMilestoneForm(false);
                setEditingMilestoneId(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMilestone}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={!milestoneForm.name.trim()}
            >
              {editingMilestoneId !== null ? 'Save Changes' : 'Add Milestone'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Modify loading condition to be more precise
  if ((goalsLoading || sharedLoading) && !displayGoal) {
    console.log('Loading state active:', { goalsLoading, sharedLoading, hasDisplayGoal: !!displayGoal });
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
                    {MEASURABLE_METRIC_LABELS[displayGoal.measurableMetric as MeasurableMetric]}
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
                        Continuous goal with {REVIEW_CYCLE_LABELS[displayGoal.timeTracking.reviewCycle as ReviewCycle || 'monthly']} reviews
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
                {displayGoal.milestones.map((milestone: Milestone, index: number) => (
                  <div 
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800">{milestone.name}</h3>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingMilestoneId(index);
                                setMilestoneForm({
                                  name: milestone.name,
                                  targetDate: milestone.targetDate ? new Date(milestone.targetDate.seconds * 1000).toISOString().split('T')[0] : '',
                                  successCriteria: milestone.successCriteria,
                                  status: milestone.status
                                });
                                setShowMilestoneForm(true);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(index)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {milestone.successCriteria}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={milestone.status}
                          onChange={(e) => {
                            const updatedMilestones = displayGoal.milestones.map((m: Milestone, i: number) =>
                              i === index ? { ...m, status: e.target.value as TaskStatus } : m
                            );
                            if (isSharedGoal && userGoal) {
                              updateUserGoal(userGoal.id, { milestones: updatedMilestones });
                            } else if (goal) {
                              updateGoal(goal.id, { milestones: updatedMilestones });
                            }
                          }}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Notes</h2>
                {isSavingNotes && (
                  <span className="text-sm text-gray-500">Saving...</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  saveNotes(e.target.value);
                }}
                placeholder="Add notes about your goal..."
                className="w-full h-40 p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                {displayGoal.routines.map((routine: Routine, index: number) => (
                  <div 
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-800">{routine.title}</h3>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingRoutineId(index);
                                setRoutineForm({
                                  title: routine.title,
                                  description: routine.description || '',
                                  frequency: routine.frequency,
                                  schedule: routine.schedule,
                                  targetCount: routine.targetCount,
                                  endDate: routine.endDate
                                });
                                setShowRoutineForm(true);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoutine(index)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {routine.description && (
                          <p className="text-sm text-gray-600 mt-1">{routine.description}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Progress:</span>{' '}
                            {routine.completionDates?.length || 0} / {routine.targetCount} completions
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${Math.min(
                                  ((routine.completionDates?.length || 0) / routine.targetCount) * 100,
                                  100
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {displayGoal.routines.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No routines or habits yet
                  </div>
                )}
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
                {displayGoal.tasks.map((task: Task, index: number) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleTaskCompletion(task.id, task.completed)}
                        className="focus:outline-none"
                      >
                        <CheckCircle 
                          className={`w-5 h-5 cursor-pointer ${
                            task.completed ? 'text-green-500' : 'text-gray-300'
                          } hover:${task.completed ? 'text-green-600' : 'text-gray-400'}`} 
                        />
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-gray-800 ${task.completed ? 'line-through' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setTaskForm({
                                  title: task.title,
                                  description: task.description || '',
                                  dueDate: task.dueDate ? new Date(task.dueDate.seconds * 1000).toISOString().split('T')[0] : '',
                                  priority: task.priority,
                                  status: task.status
                                });
                                setShowTaskForm(true);
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.priority === 'high' 
                          ? 'bg-red-100 text-red-800'
                          : task.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-sm text-gray-500">
                          {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
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
                  {sharedGoal.sharedWith.map((userId: string, index: number) => (
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