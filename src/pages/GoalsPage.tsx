import React, { useState, useEffect } from 'react';
import { Trash2, Edit, X, ChevronLeft, Share2 } from 'lucide-react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import type { 
  SourceActivity, 
  RoutineWithoutSystemFields, 
  BaseDocument,
  MeasurableMetric,
  AchievabilityCheck,
  TaskStatus,
  TaskPriority,
  TimeTrackingType,
  ReviewCycle,
  RoutineSchedule
} from '../types';
import { toast } from 'react-hot-toast';
import GoalSharingModal from '../components/GoalSharingModal';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const calculateNextReviewDate = (cycle: ReviewCycle): Timestamp => {
  const now = new Date();
  switch (cycle) {
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'quarterly':
      now.setMonth(now.getMonth() + 3);
      break;
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1);
      break;
  }
  return Timestamp.fromDate(now);
};

const dateToTimestamp = (dateString: string): Timestamp => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return Timestamp.now();
  }
  return Timestamp.fromDate(date);
};

const timestampToDateString = (timestamp: Timestamp | undefined): string => {
  if (!timestamp || !timestamp.toDate || isNaN(timestamp.toDate().getTime())) {
    return '';
  }
  try {
    return timestamp.toDate().toISOString().split('T')[0];
  } catch (error) {
    console.error('Error converting timestamp to date string:', error);
    return '';
  }
};

interface SmartGoalForm {
  name: string;
  specificAction: string;
  measurableMetric: MeasurableMetric;
  customMetric?: string;
  achievabilityCheck: AchievabilityCheck;
  relevance: string;
  timeTracking: {
    type: TimeTrackingType;
    deadline?: Timestamp;
    reviewCycle?: ReviewCycle;
  };
  areaId: string;
  milestones: {
    id: string;
    name: string;
    targetDate?: Timestamp;
    successCriteria: string;
    status: TaskStatus;
    tasks: string[];
  }[];
  tasks: {
    title: string;
    description?: string;
    dueDate?: Timestamp;
    priority: TaskPriority;
    status: TaskStatus;
    completed: boolean;
    assignedTo?: string;
  }[];
  routines: {
    title: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    schedule: RoutineSchedule;
    targetCount: number;
    endDate?: Timestamp;
    completionDates: Timestamp[];
  }[];
}

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

const initialSmartGoal: SmartGoalForm = {
  name: '',
  specificAction: '',
  measurableMetric: 'count_occurrences',
  customMetric: '',
  achievabilityCheck: 'yes',
  relevance: '',
  timeTracking: {
    type: 'fixed_deadline'
  },
  areaId: '',
  milestones: [{
    id: '',
    name: '',
    targetDate: Timestamp.fromDate(new Date()),
    successCriteria: '',
    status: 'not_started',
    tasks: []
  }],
  tasks: [],
  routines: []
};

const addTask = (smartGoal: SmartGoalForm) => ({
  ...smartGoal,
  tasks: [
    ...smartGoal.tasks,
    {
      title: '',
      description: '',
      priority: 'medium' as TaskPriority,
      status: 'not_started' as TaskStatus,
      completed: false,
      dueDate: undefined,
      assignedTo: undefined
    }
  ]
});

const addRoutine = (smartGoal: SmartGoalForm) => ({
  ...smartGoal,
  routines: [
    ...smartGoal.routines,
    {
      title: '',
      description: '',
      frequency: 'daily' as const,
      schedule: {
        type: 'daily' as const,
        targetCount: 1,
        timeOfDay: { hour: 9, minute: 0 }
      },
      targetCount: 1,
      completionDates: [],
      endDate: undefined
    }
  ]
});

const addMilestone = (smartGoal: SmartGoalForm) => ({
  ...smartGoal,
  milestones: [
    ...smartGoal.milestones,
    {
      id: '',
      name: '',
      targetDate: Timestamp.fromDate(new Date()),
      successCriteria: '',
      status: 'not_started' as TaskStatus,
      tasks: []
    }
  ]
});

const removeUndefinedFields = (obj: any): any => {
  const cleanObj = { ...obj };
  Object.keys(cleanObj).forEach(key => {
    if (cleanObj[key] === undefined) {
      delete cleanObj[key];
    } else if (typeof cleanObj[key] === 'object' && cleanObj[key] !== null) {
      cleanObj[key] = removeUndefinedFields(cleanObj[key]);
      if (Object.keys(cleanObj[key]).length === 0) {
        delete cleanObj[key];
      }
    }
  });
  return cleanObj;
};

const GoalsPage: React.FC = () => {
  const location = useLocation();
  const { areas } = useAreasContext();
  const { goals, createGoal, updateGoal, deleteGoal } = useGoalsContext();
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'wizard' | 'edit'>('wizard');
  const [smartGoal, setSmartGoal] = useState<SmartGoalForm>(initialSmartGoal);
  const [submitting, setSubmitting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingGoal, setSharingGoal] = useState<SourceActivity | null>(null);

  // Handle navigation state
  useEffect(() => {
    const state = location.state as { editingGoal?: SourceActivity; preselectedAreaId?: string } | null;
    
    if (state?.editingGoal) {
      handleEdit(state.editingGoal);
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    } else if (state?.preselectedAreaId && typeof state.preselectedAreaId === 'string') {
      const areaId: string = state.preselectedAreaId;
      setSmartGoal(prev => ({ ...prev, areaId }));
      setIsAdding(true);
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    
    try {
      if (!smartGoal.areaId) {
        throw new Error('Please select an area for this goal');
      }

      if (!smartGoal.name.trim()) {
        throw new Error('Please enter a goal name');
      }

      const goalData: Omit<SourceActivity, keyof BaseDocument> = {
        name: smartGoal.name.trim(),
        specificAction: smartGoal.specificAction.trim(),
        measurableMetric: smartGoal.measurableMetric,
        customMetric: smartGoal.customMetric?.trim() || undefined,
        achievabilityCheck: smartGoal.achievabilityCheck,
        relevance: smartGoal.relevance.trim(),
        timeTracking: {
          type: smartGoal.timeTracking.type,
          ...(smartGoal.timeTracking.type === 'fixed_deadline' 
            ? { deadline: smartGoal.timeTracking.deadline || undefined }
            : {
                reviewCycle: smartGoal.timeTracking.reviewCycle || 'monthly',
                nextReviewDate: smartGoal.timeTracking.reviewCycle 
                  ? calculateNextReviewDate(smartGoal.timeTracking.reviewCycle)
                  : undefined
              }
          )
        },
        milestones: smartGoal.milestones.map(m => ({
          id: m.id || '',
          name: m.name.trim(),
          targetDate: m.targetDate || Timestamp.fromDate(new Date()),
          successCriteria: m.successCriteria.trim(),
          status: m.status,
          tasks: m.tasks || []
        })),
        areaId: smartGoal.areaId,
        sharedWith: [],
        tasks: smartGoal.tasks.map(task => ({
          id: '',
          ownerId: user?.uid || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          title: task.title.trim(),
          description: task.description?.trim() || '',
          dueDate: task.dueDate || undefined,
          priority: task.priority,
          status: task.status,
          completed: task.completed,
          assignedTo: task.assignedTo || undefined,
          sharedWith: [],
          permissions: {}
        })),
        routines: smartGoal.routines.map(routine => ({
          title: routine.title.trim(),
          description: routine.description?.trim() || '',
          frequency: routine.frequency,
          schedule: {
            type: routine.frequency,
            targetCount: routine.targetCount || 1,
            timeOfDay: { hour: 9, minute: 0 }
          },
          targetCount: routine.targetCount || 1,
          endDate: routine.endDate || undefined,
          completionDates: routine.completionDates || []
        }))
      };

      // Clean up any remaining undefined values
      const cleanedGoalData = removeUndefinedFields(goalData);

      if (editingGoal) {
        await updateGoal(editingGoal, cleanedGoalData);
        toast.success('Goal updated successfully!');
      } else {
        await createGoal(cleanedGoalData);
        toast.success('Goal created successfully!');
      }
      
      setSmartGoal(initialSmartGoal);
      setIsAdding(false);
      setCurrentStep(0);
      setEditingGoal(null);
      setEditMode('wizard');
    } catch (error) {
      console.error('Error submitting goal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save goal. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (goal: SourceActivity) => {
    setEditingGoal(goal.id);
    setEditMode('edit');
    setSmartGoal({
      name: goal.name,
      specificAction: goal.specificAction,
      measurableMetric: goal.measurableMetric,
      customMetric: goal.customMetric ?? undefined,
      achievabilityCheck: goal.achievabilityCheck,
      relevance: goal.relevance,
      timeTracking: {
        type: goal.timeTracking.type,
        deadline: goal.timeTracking.deadline,
        reviewCycle: goal.timeTracking.reviewCycle
      },
      areaId: goal.areaId,
      milestones: Array.isArray(goal.milestones) ? goal.milestones.map(m => ({
        id: m.id || '',
        name: m.name,
        targetDate: m.targetDate,
        successCriteria: m.successCriteria,
        status: m.status,
        tasks: Array.isArray(m.tasks) ? m.tasks : []
      })) : [],
      tasks: Array.isArray(goal.tasks) ? goal.tasks.map(task => ({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        completed: task.completed,
        assignedTo: task.assignedTo
      })) : [],
      routines: Array.isArray(goal.routines) ? goal.routines.map(routine => ({
        title: routine.title,
        description: routine.description || '',
        frequency: routine.frequency,
        schedule: {
          type: routine.frequency,
          targetCount: routine.targetCount,
          timeOfDay: routine.schedule?.timeOfDay || { hour: 9, minute: 0 },
          daysOfWeek: routine.schedule?.daysOfWeek,
          dayOfMonth: routine.schedule?.dayOfMonth,
          monthsOfYear: routine.schedule?.monthsOfYear
        },
        targetCount: routine.targetCount || 1,
        endDate: routine.endDate,
        completionDates: Array.isArray(routine.completionDates) ? routine.completionDates : []
      })) : []
    });
    setIsAdding(true);
  };

  const handleDelete = async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      try {
        await deleteGoal(goalId);
      } catch (err) {
        console.error('Error deleting goal:', err);
      }
    }
  };

  const handleDateChange = (value: string | undefined): Timestamp | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : Timestamp.fromDate(date);
  };

  const handleTaskChange = (index: number, field: keyof SmartGoalForm['tasks'][0], value: any) => {
    setSmartGoal(prev => {
      const newTasks = [...prev.tasks];
      newTasks[index] = {
        ...newTasks[index],
        [field]: field === 'dueDate' 
          ? (value instanceof Date ? Timestamp.fromDate(value) : (value === null ? undefined : value))
          : value,
        completed: field === 'status' ? value === 'completed' : newTasks[index].completed
      };
      return { ...prev, tasks: newTasks };
    });
  };

  const handleMilestoneChange = (index: number, field: keyof SmartGoalForm['milestones'][0], value: any) => {
    setSmartGoal(prev => {
      const newMilestones = [...prev.milestones];
      newMilestones[index] = {
        ...newMilestones[index],
        [field]: field === 'targetDate'
          ? (value instanceof Date ? Timestamp.fromDate(value) : (value === null ? undefined : value))
          : value
      };
      return { ...prev, milestones: newMilestones };
    });
  };

  const handleShareClick = (goal: SourceActivity) => {
    setSharingGoal(goal);
    setIsShareModalOpen(true);
  };

  const renderAreaStep = () => (
    <div className="space-y-4">
      <select
        value={smartGoal.areaId}
        onChange={e => setSmartGoal(prev => ({ ...prev, areaId: e.target.value }))}
        className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        required
      >
        <option value="">Select an area</option>
        {areas.map(area => (
          <option key={area.id} value={area.id}>{area.name}</option>
        ))}
      </select>
    </div>
  );

  const renderSpecificStep = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Goal Name
        </label>
        <input
          type="text"
          value={smartGoal.name}
          onChange={e => setSmartGoal(prev => ({ ...prev, name: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          placeholder="Give your goal a name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Specific Action
        </label>
        <textarea
          value={smartGoal.specificAction}
          onChange={e => setSmartGoal(prev => ({ ...prev, specificAction: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          placeholder="What exactly do you want to achieve?"
          rows={3}
          required
        />
      </div>
      <p className="text-sm text-gray-500 italic">Example: Run 2x per week for 30 minutes each session</p>
    </div>
  );

  const renderMeasurableStep = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How will you measure progress?
        </label>
        <select
          value={smartGoal.measurableMetric}
          onChange={e => setSmartGoal(prev => ({ 
            ...prev, 
            measurableMetric: e.target.value as MeasurableMetric,
            customMetric: e.target.value === 'custom' ? prev.customMetric : undefined
          }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          required
        >
          {MEASURABLE_METRIC_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {smartGoal.measurableMetric === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Metric
          </label>
          <input
            type="text"
            value={smartGoal.customMetric || ''}
            onChange={e => setSmartGoal(prev => ({ ...prev, customMetric: e.target.value }))}
            className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your custom metric"
            required
          />
        </div>
      )}
    </div>
  );

  const renderAchievableStep = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Is this goal achievable with your current resources?
        </label>
        <select
          value={smartGoal.achievabilityCheck}
          onChange={e => setSmartGoal(prev => ({ ...prev, achievabilityCheck: e.target.value as AchievabilityCheck }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          required
        >
          {ACHIEVABILITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderRelevantStep = () => (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Why is this goal important to you?
        </label>
        <textarea
          value={smartGoal.relevance}
          onChange={e => setSmartGoal(prev => ({ ...prev, relevance: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          placeholder="How does this goal align with your values and long-term objectives?"
          rows={3}
          required
        />
      </div>
      <p className="text-sm text-gray-500 italic">Example: Improve health and maintain work-life balance</p>
    </div>
  );

  const renderTimeboundStep = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How will you track time for this goal?
        </label>
        <select
          value={smartGoal.timeTracking.type}
          onChange={e => setSmartGoal(prev => ({ 
            ...prev, 
            timeTracking: {
              ...prev.timeTracking,
              type: e.target.value as TimeTrackingType,
              deadline: e.target.value === 'fixed_deadline' ? prev.timeTracking.deadline : undefined,
              reviewCycle: e.target.value === 'recurring_review' ? 'monthly' : undefined
            }
          }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="fixed_deadline">Fixed deadline</option>
          <option value="recurring_review">Continuous goal with regular reviews</option>
        </select>
      </div>

      {smartGoal.timeTracking.type === 'fixed_deadline' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            When will you complete this goal?
          </label>
          <ReactDatePicker
            selected={smartGoal.timeTracking.deadline ? smartGoal.timeTracking.deadline.toDate() : null}
            onChange={(date: Date | null) => {
              setSmartGoal(prev => ({
                ...prev,
                timeTracking: {
                  ...prev.timeTracking,
                  deadline: date ? Timestamp.fromDate(date) : undefined
                }
              }));
            }}
            dateFormat="yyyy-MM-dd"
            className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            placeholderText="Select a date"
            required
          />
          <p className="text-sm text-gray-500 italic mt-2">Set a specific completion date for your goal</p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How often will you review progress?
          </label>
          <select
            value={smartGoal.timeTracking.reviewCycle}
            onChange={e => setSmartGoal(prev => ({ 
              ...prev, 
              timeTracking: {
                ...prev.timeTracking,
                reviewCycle: e.target.value as ReviewCycle
              }
            }))}
            className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            required
          >
            {REVIEW_CYCLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 italic mt-2">
            Regular reviews help you stay on track with continuous goals
          </p>
        </div>
      )}
    </div>
  );

  const renderMilestonesStep = () => (
    <div className="space-y-3">
      {smartGoal.milestones.map((milestone, index) => (
        <div key={index} className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Milestone {index + 1}</h4>
            {index > 0 && (
              <button
                type="button"
                onClick={() => {
                  const newMilestones = smartGoal.milestones.filter((_, i) => i !== index);
                  setSmartGoal(prev => ({ ...prev, milestones: newMilestones }));
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Milestone Name
              </label>
              <input
                type="text"
                value={milestone.name}
                onChange={e => handleMilestoneChange(index, 'name', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder={`Milestone ${index + 1}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <ReactDatePicker
                selected={milestone.targetDate ? milestone.targetDate.toDate() : null}
                onChange={(date: Date | null) => handleMilestoneChange(index, 'targetDate', date)}
                dateFormat="yyyy-MM-dd"
                className="w-full p-2 border rounded-md"
                placeholderText="Select a date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Success Criteria
              </label>
              <input
                type="text"
                value={milestone.successCriteria}
                onChange={e => handleMilestoneChange(index, 'successCriteria', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="How will you know this milestone is complete?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={milestone.status}
                onChange={e => handleMilestoneChange(index, 'status', e.target.value as TaskStatus)}
                className="w-full p-2 border rounded-md"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSmartGoal(addMilestone)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        + Add Milestone
      </button>
    </div>
  );

  const renderTasksStep = () => (
    <div className="space-y-3">
      {smartGoal.tasks.map((task, index) => (
        <div key={index} className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="font-medium">Task {index + 1}</h4>
            <button
              type="button"
              onClick={() => {
                const newTasks = smartGoal.tasks.filter((_, i) => i !== index);
                setSmartGoal(prev => ({ ...prev, tasks: newTasks }));
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={task.title}
                onChange={e => handleTaskChange(index, 'title', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={task.description || ''}
                onChange={e => handleTaskChange(index, 'description', e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <ReactDatePicker
                selected={task.dueDate ? task.dueDate.toDate() : null}
                onChange={(date: Date | null) => handleTaskChange(index, 'dueDate', date)}
                dateFormat="yyyy-MM-dd"
                className="w-full p-2 border rounded-md"
                placeholderText="Select a date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={e => handleTaskChange(index, 'priority', e.target.value as TaskPriority)}
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
                value={task.status}
                onChange={e => {
                  const newTasks = [...smartGoal.tasks];
                  newTasks[index] = { ...task, status: e.target.value as TaskStatus };
                  setSmartGoal(prev => ({ ...prev, tasks: newTasks }));
                }}
                className="w-full p-2 border rounded-md"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSmartGoal(addTask)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        + Add Task
      </button>
    </div>
  );

  const renderRoutinesStep = () => (
    <div className="space-y-3">
      {smartGoal.routines?.map((routine, index) => (
        <div key={index} className="border rounded-md p-4 space-y-4">
          <div className="flex justify-between">
            <h4 className="font-medium">Habit/Routine {index + 1}</h4>
            <button
              type="button"
              onClick={() => {
                const newRoutines = smartGoal.routines?.filter((_, i) => i !== index) || [];
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={routine.title}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, title: e.target.value };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={routine.description || ''}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, description: e.target.value };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={routine.frequency}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, frequency: e.target.value as RoutineWithoutSystemFields['frequency'] };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
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
                Target Count (times per {routine.frequency})
              </label>
              <input
                type="number"
                min="1"
                value={routine.targetCount}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, targetCount: parseInt(e.target.value) };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date (optional)
              </label>
              <input
                type="date"
                value={routine.endDate ? timestampToDateString(routine.endDate) : ''}
                onChange={e => {
                  const newRoutines = [...(smartGoal.routines || [])];
                  newRoutines[index] = { ...routine, endDate: e.target.value ? dateToTimestamp(e.target.value) : undefined };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSmartGoal(addRoutine)}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        + Add Habit/Routine
      </button>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Goal Name</h3>
        <p className="text-gray-900">{smartGoal.name}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Specific Action</h3>
        <p className="text-gray-900">{smartGoal.specificAction}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Measurable Metric</h3>
        <p className="text-gray-900">
          {MEASURABLE_METRIC_OPTIONS.find(opt => opt.value === smartGoal.measurableMetric)?.label}
          {smartGoal.measurableMetric === 'custom' && smartGoal.customMetric && (
            <span className="block text-sm text-gray-600 mt-1">
              Custom metric: {smartGoal.customMetric}
            </span>
          )}
        </p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Achievability</h3>
        <p className="text-gray-900">
          {ACHIEVABILITY_OPTIONS.find(opt => opt.value === smartGoal.achievabilityCheck)?.label}
        </p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Relevance</h3>
        <p className="text-gray-900">{smartGoal.relevance}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Time-bound</h3>
        <p className="text-gray-900">{smartGoal.timeTracking.type === 'fixed_deadline' ? smartGoal.timeTracking.deadline ? timestampToDateString(smartGoal.timeTracking.deadline) : 'No deadline' : REVIEW_CYCLE_OPTIONS.find(opt => opt.value === smartGoal.timeTracking.reviewCycle)?.label}</p>
      </div>
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Milestones</h3>
        <div className="space-y-3">
          {smartGoal.milestones.map((milestone, index) => (
            <div key={index} className="bg-white p-3 rounded-md">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{milestone.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  milestone.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : milestone.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {STATUS_OPTIONS.find(opt => opt.value === milestone.status)?.label}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                <p>Target Date: {milestone.targetDate ? timestampToDateString(milestone.targetDate) : 'No target date'}</p>
                <p>Success Criteria: {milestone.successCriteria}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {smartGoal.routines && smartGoal.routines.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Habits & Routines</h3>
          <div className="space-y-3">
            {smartGoal.routines.map((routine, index) => (
              <div key={index} className="bg-white p-3 rounded-md">
                <h4 className="font-medium text-gray-900">{routine.title}</h4>
                {routine.description && (
                  <p className="mt-1 text-sm text-gray-600">{routine.description}</p>
                )}
                <div className="mt-2 text-sm text-gray-600">
                  <p>Frequency: {routine.frequency}</p>
                  <p>Target: {routine.targetCount} times per {routine.frequency}</p>
                  {routine.endDate && <p>End Date: {routine.endDate ? timestampToDateString(routine.endDate) : 'No end date'}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderEditForm = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Area
        </label>
        <select
          value={smartGoal.areaId}
          onChange={e => setSmartGoal(prev => ({ ...prev, areaId: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
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
          value={smartGoal.name}
          onChange={e => setSmartGoal(prev => ({ ...prev, name: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Specific Action
        </label>
        <textarea
          value={smartGoal.specificAction}
          onChange={e => setSmartGoal(prev => ({ ...prev, specificAction: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How will you measure progress?
        </label>
        <select
          value={smartGoal.measurableMetric}
          onChange={e => setSmartGoal(prev => ({ 
            ...prev, 
            measurableMetric: e.target.value as MeasurableMetric,
            customMetric: e.target.value === 'custom' ? prev.customMetric : undefined
          }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        >
          {MEASURABLE_METRIC_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {smartGoal.measurableMetric === 'custom' && (
          <div className="mt-2">
            <input
              type="text"
              value={smartGoal.customMetric || ''}
              onChange={e => setSmartGoal(prev => ({ ...prev, customMetric: e.target.value }))}
              className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Is this goal achievable with your current resources?
        </label>
        <select
          value={smartGoal.achievabilityCheck}
          onChange={e => setSmartGoal(prev => ({ ...prev, achievabilityCheck: e.target.value as AchievabilityCheck }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
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
          value={smartGoal.relevance}
          onChange={e => setSmartGoal(prev => ({ ...prev, relevance: e.target.value }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How will you track time for this goal?
        </label>
        <select
          value={smartGoal.timeTracking.type}
          onChange={e => setSmartGoal(prev => ({ 
            ...prev, 
            timeTracking: {
              ...prev.timeTracking,
              type: e.target.value as TimeTrackingType,
              deadline: e.target.value === 'fixed_deadline' ? prev.timeTracking.deadline : undefined,
              reviewCycle: e.target.value === 'recurring_review' ? 'monthly' : undefined
            }
          }))}
          className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="fixed_deadline">Fixed deadline</option>
          <option value="recurring_review">Continuous goal with regular reviews</option>
        </select>
      </div>

      {smartGoal.timeTracking.type === 'fixed_deadline' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            When will you complete this goal?
          </label>
          <ReactDatePicker
            selected={smartGoal.timeTracking.deadline ? smartGoal.timeTracking.deadline.toDate() : null}
            onChange={(date: Date | null) => {
              setSmartGoal(prev => ({
                ...prev,
                timeTracking: {
                  ...prev.timeTracking,
                  deadline: date ? Timestamp.fromDate(date) : undefined
                }
              }));
            }}
            dateFormat="yyyy-MM-dd"
            className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            How often will you review progress?
          </label>
          <select
            value={smartGoal.timeTracking.reviewCycle}
            onChange={e => setSmartGoal(prev => ({ 
              ...prev, 
              timeTracking: {
                ...prev.timeTracking,
                reviewCycle: e.target.value as ReviewCycle
              }
            }))}
            className="w-full p-3 text-lg border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500"
          >
            {REVIEW_CYCLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const wizardSteps = [
    {
      title: "What area is this goal for?",
      subtitle: "Choose the life area this goal belongs to",
      component: renderAreaStep
    },
    {
      title: "What do you want to achieve?",
      subtitle: "Be specific about what you want to accomplish",
      component: renderSpecificStep
    },
    {
      title: "How will you measure success?",
      subtitle: "Define concrete numbers or milestones",
      component: renderMeasurableStep
    },
    {
      title: "Is it achievable?",
      subtitle: "Consider your resources and constraints",
      component: renderAchievableStep
    },
    {
      title: "Why is this important?",
      subtitle: "Connect this goal to your bigger picture",
      component: renderRelevantStep
    },
    {
      title: "When will you achieve this?",
      subtitle: "Set a realistic deadline or review cycle",
      component: renderTimeboundStep
    },
    {
      title: "Break it down",
      subtitle: "List the key milestones to reach your goal",
      component: renderMilestonesStep
    },
    {
      title: "Add Tasks",
      subtitle: "Create actionable tasks to achieve your milestones",
      component: renderTasksStep
    },
    {
      title: "Add Habits & Routines",
      subtitle: "Create recurring actions to support your goal",
      component: renderRoutinesStep
    },
    {
      title: "Review Your SMART Goal",
      subtitle: "Make sure everything looks right",
      component: renderReviewStep
    }
  ];

  const renderGoalsList = () => (
    <div className="space-y-4">
      {goals.map(goal => (
        <div key={goal.id} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
              <p className="text-sm text-gray-600">{goal.specificAction}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleShareClick(goal)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Share goal"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleEdit(goal)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Edit goal"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(goal.id)}
                className="text-red-400 hover:text-red-600 transition-colors"
                aria-label="Delete goal"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Goals</h1>
        <button
          onClick={() => {
            setIsAdding(true);
            setCurrentStep(0);
            setEditingGoal(null);
            setEditMode('wizard');
          }}
          className={"text-blue-600 hover:text-blue-700"}
        >
          + Add Goal
        </button>
      </div>

      {renderGoalsList()}

      <GoalSharingModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSharingGoal(null);
        }}
        goalId={sharingGoal?.id || undefined}
        initialTitle={sharingGoal?.name || undefined}
      />

      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {editMode === 'wizard' ? wizardSteps[currentStep].title : 'Edit Goal'}
                </h2>
                {editMode === 'wizard' && wizardSteps[currentStep].subtitle && (
                  <p className="text-gray-600 mt-1">{wizardSteps[currentStep].subtitle}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setCurrentStep(0);
                  setEditingGoal(null);
                  setEditMode('wizard');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-8">
              {editMode === 'wizard' ? wizardSteps[currentStep].component() : renderEditForm()}
            </div>

            <div className="flex justify-between items-center">
              {editMode === 'wizard' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className={`flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-700 ${
                      currentStep === 0 ? 'invisible' : ''
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                  <div className="flex gap-1">
                    {wizardSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      if (currentStep === wizardSteps.length - 1) {
                        handleSubmit(event);
                      } else {
                        setCurrentStep(prev => prev + 1);
                      }
                    }}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {currentStep === wizardSteps.length - 1 ? (submitting ? 'Creating...' : 'Create Goal') : 'Next'}
                  </button>
                </>
              ) : (
                <div className="flex justify-end w-full gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingGoal(null);
                      setEditMode('wizard');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalsPage;