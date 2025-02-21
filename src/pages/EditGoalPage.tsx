import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Users } from 'lucide-react';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { SourceActivity, Milestone, TaskStatus, Routine, ReviewCycle, TimeTrackingType, MeasurableMetric, AchievabilityCheck, Task, RoutineWithoutSystemFields } from '../types';
import { Timestamp } from 'firebase/firestore';
import { MEASURABLE_METRIC_OPTIONS, ACHIEVABILITY_OPTIONS, STATUS_OPTIONS, REVIEW_CYCLE_OPTIONS } from '../constants';

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
  const defaultTimestamp = Timestamp.fromDate(new Date());

  const [currentTab, setCurrentTab] = useState(0);
  const [openModal, setOpenModal] = useState<string | null>(null);

  const goal = goals.find(g => g.id === goalId);

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
              {/* Existing milestone tasks and routines management */}
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
    </div>
  );
};

export default EditGoalPage; 