import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserService } from '../services/UserService';
import { 
  SourceActivity, 
  Milestone, 
  TaskStatus, 
  Routine, 
  ReviewCycle, 
  TimeTrackingType, 
  MeasurableMetric, 
  AchievabilityCheck, 
  Task, 
  RoutineWithoutSystemFields, 
  DayOfWeek,
  UserProfile
} from '../types';
import { Timestamp } from 'firebase/firestore';
import { 
  MEASURABLE_METRIC_OPTIONS,
  ACHIEVABILITY_OPTIONS,
  STATUS_OPTIONS,
  REVIEW_CYCLE_OPTIONS 
} from '../constants';
import { db } from '../lib/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import GoalSharingModal from '../components/GoalSharingModal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`goal-tabpanel-${index}`}
      aria-labelledby={`goal-tab-${index}`}
      className="p-4"
      {...other}
    >
      {value === index && children}
    </div>
  );
}

interface OptionType {
  label: string;
  value: string;
}

const EditGoalPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { areas } = useAreasContext();
  const { goals, updateGoal } = useGoalsContext();
  const { currentUser } = useAuth();
  const userService = getUserService();
  const defaultTimestamp = Timestamp.fromDate(new Date());

  const [currentTab, setCurrentTab] = useState(0);
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [participants, setParticipants] = useState<UserProfile[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const goal = goals.find(g => g.id === goalId);

  useEffect(() => {
    const loadParticipants = async () => {
      if (!goal) return;

      setIsLoadingParticipants(true);
      try {
        // Get all users who have access to this goal
        const sharedUserIds = new Set([
          goal.ownerId,
          ...goal.sharedWith,
          // Include users with task-specific access
          ...goal.tasks?.flatMap(task => task.sharedWith || []) || [],
          // Include users with routine-specific access
          ...goal.routines?.map(routine => routine.assignedTo).filter((id): id is string => !!id) || []
        ]);

        // Add the current user if not already included
        if (currentUser) {
          sharedUserIds.add(currentUser.uid);
        }

        // Fetch user profiles
        const users = await userService.findUsersByIds(Array.from(sharedUserIds));
        setParticipants(users);
      } catch (error) {
        console.error('Error loading participants:', error);
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    loadParticipants();
  }, [goal, currentUser]);

  useEffect(() => {
    if (!goalId) return;

    // Subscribe to real-time updates for the goal's sharing settings
    const unsubscribe = onSnapshot(doc(db, 'shared_goals', goalId), 
      async (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Update participants when sharing changes
          const sharedUserIds = new Set([
            data.ownerId,
            ...(data.sharedWith || [])
          ]);
          
          if (currentUser) {
            sharedUserIds.add(currentUser.uid);
          }

          const users = await userService.findUsersByIds(Array.from(sharedUserIds));
          setParticipants(users);
        }
      },
      (error) => {
        console.error('Error listening to goal updates:', error);
      }
    );

    return () => unsubscribe();
  }, [goalId, currentUser]);

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
      permissions: {},
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
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
        <div className="bg-white rounded-lg shadow">
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            className="border-b"
          >
            <Tab label="Basic Info" />
            <Tab label="Milestones" />
            <Tab label="Tasks" />
            <Tab label="Routines" />
            <Tab label="Time & Review" />
          </Tabs>

          <TabPanel value={currentTab} index={0}>
            <div className="space-y-6">
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

              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Goal Details
                </label>
                <button
                  type="button"
                  onClick={() => setOpenModal('details')}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit Details
                </button>
              </div>
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
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
                  <button
                    type="button"
                    onClick={() => setOpenModal(`milestone-${index}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit Tasks & Routines
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMilestone}
                className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:border-gray-400"
              >
                Add Milestone
              </button>
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
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
                    {STATUS_OPTIONS.map((option: OptionType) => (
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
                className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:border-gray-400"
              >
                Add Task
              </button>
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
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
                  >
                  </input>
                  <button
                    type="button"
                    onClick={() => setOpenModal(`routine-${index}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Edit Routine Details
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRoutine}
                className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:border-gray-400"
              >
                Add Routine
              </button>
            </div>
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Tracking
                </label>
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
                {REVIEW_CYCLE_OPTIONS.map((option: OptionType) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </TabPanel>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/goals')}
            className="px-4 py-2 text-gray-600 hover:text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>

      {/* Goal Details Modal */}
      <Dialog
        open={openModal === 'details'}
        onClose={() => setOpenModal(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Goal Details</DialogTitle>
        <DialogContent>
          <div className="space-y-6 py-4">
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
                {MEASURABLE_METRIC_OPTIONS.map((option: OptionType) => (
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
                {ACHIEVABILITY_OPTIONS.map((option: OptionType) => (
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
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {isLoadingParticipants ? (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Milestone Tasks & Routines Modal */}
          {formData.milestones?.map((milestone, index) => (
            <Dialog
              key={milestone.id}
              open={openModal === `milestone-${index}`}
              onClose={() => setOpenModal(null)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Edit Milestone Tasks & Routines</DialogTitle>
              <DialogContent>
                <div className="space-y-6 py-4">
                  {/* Tasks Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Tasks</h3>
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
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Task
                      </button>
                    </div>
                    <div className="space-y-4">
                      {milestone.tasks.map((taskId, taskIndex) => {
                        const task = formData.tasks.find(t => t.id === taskId);
                        if (!task) return null;

                        return (
                          <div key={taskId} className="border rounded-lg p-4 space-y-4">
                            <div className="flex justify-between items-center">
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
                                className="flex-1 p-2 border rounded-md"
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
                                className="ml-2 text-red-500 hover:text-red-700"
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
                              {STATUS_OPTIONS.map((option: OptionType) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Routines Section */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Routines</h3>
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
                            permissions: {},
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
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add Routine
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(milestone.routines || [])?.map((routineId, routineIndex) => {
                        const routine = formData.routines.find(r => getRoutineId(r) === routineId);
                        if (!routine) return null;

                        return (
                          <div key={routineId} className="border rounded-lg p-4 space-y-4">
                            <div className="flex justify-between items-center">
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
                                className="flex-1 p-2 border rounded-md"
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
                                className="ml-2 text-red-500 hover:text-red-700"
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
                            <button
                              type="button"
                              onClick={() => setOpenModal(`milestone-${index}-routine-${routineIndex}`)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit Schedule & Details
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenModal(null)}>Close</Button>
              </DialogActions>
            </Dialog>
          ))}

          {/* Routine Details Modal */}
          {formData.routines?.map((routine, index) => (
            <Dialog
              key={getRoutineId(routine)}
              open={openModal === `routine-${index}`}
              onClose={() => setOpenModal(null)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Edit Routine Details</DialogTitle>
              <DialogContent>
                <div className="space-y-6 py-4">
                  <textarea
                    value={routine.description || ''}
                    onChange={e => {
                      setFormData(prev => {
                        const newRoutines = [...prev.routines];
                        const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
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
                  {/* Existing routine frequency and schedule management */}
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenModal(null)}>Close</Button>
              </DialogActions>
            </Dialog>
          ))}

          {/* Routine Schedule & Details Modal */}
          {formData.milestones?.map((milestone, milestoneIndex) => (
            milestone.routines?.map((routineId, routineIndex) => {
              const routine = formData.routines.find(r => getRoutineId(r) === routineId);
              if (!routine) return null;

              return (
                <Dialog
                  key={`${milestone.id}-${routineId}`}
                  open={openModal === `milestone-${milestoneIndex}-routine-${routineIndex}`}
                  onClose={() => setOpenModal(null)}
                  maxWidth="md"
                  fullWidth
                >
                  <DialogTitle>Edit Routine Schedule & Details</DialogTitle>
                  <DialogContent>
                    <div className="space-y-6 py-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assigned To
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenModal(null);
                              setIsShareModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <Users className="w-4 h-4" />
                            Invite Users
                          </button>
                        </div>
                        <select
                          value={routine.assignedTo || ''}
                          onChange={e => {
                            setFormData(prev => {
                              const newRoutines = [...prev.routines];
                              const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                              if (routineIndex === -1) return prev;
                              
                              newRoutines[routineIndex] = {
                                ...newRoutines[routineIndex],
                                assignedTo: e.target.value || undefined
                              };
                              return { ...prev, routines: newRoutines };
                            });
                          }}
                          className="w-full p-2 border rounded-md mb-6"
                        >
                          <option value="">Select user</option>
                          {participants.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.email || user.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frequency
                        </label>
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
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Times per {routine.frequency}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={routine.targetCount}
                          onChange={e => {
                            const targetCount = Math.max(1, parseInt(e.target.value) || 1);
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
                        />
                      </div>

                      {routine.frequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Schedule {routine.targetCount} occurrences per week
                          </label>
                          <div className="space-y-4">
                            {[...Array(routine.targetCount)].map((_, occurrenceIndex) => (
                              <div key={occurrenceIndex} className="space-y-2">
                                <div className="flex gap-4 items-center">
                                  <select
                                    value={routine.schedule.daysOfWeek?.[occurrenceIndex]?.day || 'monday'}
                                    onChange={e => {
                                      setFormData(prev => {
                                        const newRoutines = [...prev.routines];
                                        const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                        if (routineIndex === -1) return prev;
                                        
                                        const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                        newDaysOfWeek[occurrenceIndex] = {
                                          ...(newDaysOfWeek[occurrenceIndex] || {}),
                                          day: e.target.value as DayOfWeek,
                                          time: newDaysOfWeek[occurrenceIndex]?.time || { hour: 9, minute: 0 }
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
                                    value={`${String(routine.schedule.daysOfWeek?.[occurrenceIndex]?.time?.hour || 9).padStart(2, '0')}:${String(routine.schedule.daysOfWeek?.[occurrenceIndex]?.time?.minute || 0).padStart(2, '0')}`}
                                    onChange={e => {
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      setFormData(prev => {
                                        const newRoutines = [...prev.routines];
                                        const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                        if (routineIndex === -1) return prev;
                                        
                                        const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                        newDaysOfWeek[occurrenceIndex] = {
                                          ...(newDaysOfWeek[occurrenceIndex] || { day: 'monday' }),
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
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Assigned To This Occurrence
                                  </label>
                                  <select
                                    value={routine.schedule.daysOfWeek?.[occurrenceIndex]?.assignedTo || ''}
                                    onChange={e => {
                                      setFormData(prev => {
                                        const newRoutines = [...prev.routines];
                                        const routineIndex = newRoutines.findIndex(r => getRoutineId(r) === getRoutineId(routine));
                                        if (routineIndex === -1) return prev;
                                        
                                        const newDaysOfWeek = [...(newRoutines[routineIndex].schedule.daysOfWeek || [])];
                                        const user = participants.find(u => u.id === e.target.value);
                                        newDaysOfWeek[occurrenceIndex] = {
                                          ...(newDaysOfWeek[occurrenceIndex] || { day: 'monday', time: { hour: 9, minute: 0 } }),
                                          assignedTo: e.target.value || undefined,
                                          assignedToEmail: user?.email
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
                                    className="w-full p-2 border rounded-md"
                                  >
                                    <option value="">Select user for this occurrence</option>
                                    {participants.map(user => (
                                      <option key={user.id} value={user.id}>
                                        {user.email || user.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {routine.frequency === 'monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    </div>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setOpenModal(null)}>Close</Button>
                  </DialogActions>
                </Dialog>
              );
            })
          ))}
        </>
      )}

      {/* Add GoalSharingModal */}
      <GoalSharingModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        goalId={goalId}
        initialTitle={formData.name}
        areaId={formData.areaId}
      />
    </div>
  );
};

export default EditGoalPage; 