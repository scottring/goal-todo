import React, { useState, useEffect } from 'react';
import { useAreasContext } from '../contexts/AreasContext';
import { useGoalsContext } from '../contexts/GoalsContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Grid,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
  Divider,
  Chip,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import AddIcon from '@mui/icons-material/Add';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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
  RoutineSchedule,
  Routine,
  TaskReviewItem as TaskReviewItemType
} from '../types';
import { toast } from 'react-hot-toast';
import GoalSharingModal from '../components/GoalSharingModal';
import { v4 as uuidv4 } from 'uuid';
import { useWeeklyPlanning } from '../contexts/WeeklyPlanningContext';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';

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
    id: string;
    title: string;
    description?: string;
    dueDate?: Timestamp;
    priority: TaskPriority;
    status: TaskStatus;
    completed: boolean;
    assignedTo?: string;
  }[];
  routines: {
    id: string;
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
    id: uuidv4(),
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
      id: uuidv4(),
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
      id: uuidv4(),
      title: '',
      description: '',
      frequency: 'daily' as const,
      schedule: {
        type: 'daily' as const,
        targetCount: 1,
        timeOfDay: { hour: 9, minute: 0 },
        daysOfWeek: [],
        dayOfMonth: undefined,
        monthsOfYear: []
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
      id: uuidv4(),
      name: '',
      targetDate: Timestamp.fromDate(new Date()),
      successCriteria: '',
      status: 'not_started' as TaskStatus,
      tasks: []
    }
  ]
});

interface CleanableObject {
  [key: string]: unknown;
}

const isObject = (value: unknown): value is CleanableObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const removeUndefinedFields = <T extends CleanableObject>(obj: T): T => {
  const cleanObj = {} as T;
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    
    if (Array.isArray(value)) {
      cleanObj[key as keyof T] = value.map(item => 
        isObject(item) ? removeUndefinedFields(item) : item
      ) as T[keyof T];
    } else if (isObject(value)) {
      const cleaned = removeUndefinedFields(value);
      if (Object.keys(cleaned).length > 0) {
        cleanObj[key as keyof T] = cleaned as T[keyof T];
      }
    } else {
      cleanObj[key as keyof T] = value as T[keyof T];
    }
  });
  
  return cleanObj;
};

type TaskAction = 'mark_completed' | 'push_forward' | 'mark_missed' | 'archive' | 'close';

interface StepProps {
  onNext: () => void;
  onBack: () => void;
}

const WeeklyReviewStep: React.FC<StepProps> = ({ onNext, onBack }) => {
  const [activeTab, setActiveTab] = useState(0);
  const {
    currentSession,
    updateTaskReview,
    updateLongTermGoalReview,
    updateSharedGoalReview,
    sendTeamReminders
  } = useWeeklyPlanning();
  const { goals } = useGoalsContext();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTaskAction = async (taskId: string, action: TaskAction) => {
    const task = currentSession?.reviewPhase?.taskReviews?.find((t: TaskReviewItemType) => t.taskId === taskId);
    if (!task) {
      console.error('Task not found:', taskId);
      return;
    }

    const reviewData: TaskReviewItemType = {
      taskId,
      title: task.title || 'Untitled Task',
      status: action === 'mark_completed' ? 'completed' : 
             action === 'mark_missed' ? 'missed' : 
             'needs_review',
      originalDueDate: task.originalDueDate instanceof Timestamp ? 
                      task.originalDueDate : 
                      Timestamp.fromDate(new Date()),
      action,
      priority: task.priority || 'medium'
    };

    await updateTaskReview(reviewData);
  };

  const handleGoalReview = async (goalId: string, madeProgress: boolean, adjustments?: string, nextReviewDate?: Date) => {
    try {
      await updateLongTermGoalReview(goalId, madeProgress, adjustments, nextReviewDate);
    } catch (error) {
      console.error('Error updating goal review:', error);
    }
  };

  const handleSharedGoalUpdate = async (goalId: string, taskId: string, status: 'completed' | 'pending') => {
    await updateSharedGoalReview(goalId, status === 'completed' ? [taskId] : [], status === 'pending' ? [taskId] : []);
  };

  const handleSendReminder = async (goalId: string, userId: string) => {
    await sendTeamReminders(goalId, [userId]);
  };

  const getTaskReviewCount = () => {
    return currentSession?.reviewPhase?.taskReviews?.length || 0;
  };

  const getSharedGoalReviewCount = () => {
    return currentSession?.reviewPhase?.sharedGoalReviews?.length || 0;
  };

  const getLongTermGoalCount = () => {
    return goals?.length || 0;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Weekly Review
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="review tabs">
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>TASKS & ROUTINES</span>
                {getTaskReviewCount() > 0 && (
                  <Badge badgeContent={getTaskReviewCount()} color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>LONG-TERM GOALS</span>
                {getLongTermGoalCount() > 0 && (
                  <Badge badgeContent={getLongTermGoalCount()} color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>SHARED GOALS</span>
                {getSharedGoalReviewCount() > 0 && (
                  <Badge badgeContent={getSharedGoalReviewCount()} color="error" sx={{ ml: 1 }} />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <TaskReviewList
          tasks={currentSession?.reviewPhase.taskReviews || []}
          onTaskAction={handleTaskAction}
        />
      )}

      {activeTab === 1 && (
        <Stack spacing={3}>
          {goals.map(goal => (
            <LongTermGoalReview
              key={goal.id}
              goalId={goal.id}
              goalName={goal.name}
              description={goal.specificAction}
              lastReviewDate={goal.timeTracking.reviewStatus?.lastReviewDate}
              nextReviewDate={goal.timeTracking.nextReviewDate}
              onUpdateReview={handleGoalReview}
            />
          ))}
          {goals.length === 0 && (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No long-term goals found. Create some goals to start tracking your progress.
            </Typography>
          )}
        </Stack>
      )}

      {activeTab === 2 && (
        <Stack spacing={3}>
          {/* TODO: Get shared goals from currentSession */}
          <SharedGoalReview
            goalId="example"
            goalName="Example Shared Goal"
            tasks={[]}
            collaborators={[]}
            onSendReminder={handleSendReminder}
            onUpdateTaskStatus={handleSharedGoalUpdate}
          />
        </Stack>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={onNext}>
          Continue to Planning
        </Button>
      </Box>
    </Paper>
  );
};

const GoalsPage: React.FC = () => {
  const location = useLocation();
  const { areas } = useAreasContext();
    const { goals, createGoal, updateGoal, deleteGoal } = useGoalsContext();
  const { currentUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'wizard' | 'edit'>('wizard');
  const [smartGoal, setSmartGoal] = useState<SmartGoalForm>(initialSmartGoal);
  const [submitting, setSubmitting] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingGoal, setSharingGoal] = useState<SourceActivity | null>(null);
  const navigate = useNavigate();

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
        customMetric: smartGoal.customMetric?.trim(),
        achievabilityCheck: smartGoal.achievabilityCheck,
        relevance: smartGoal.relevance.trim(),
        timeTracking: {
          type: smartGoal.timeTracking.type,
          ...(smartGoal.timeTracking.type === 'fixed_deadline' 
            ? { deadline: smartGoal.timeTracking.deadline }
            : {
                reviewCycle: smartGoal.timeTracking.reviewCycle || 'monthly',
                nextReviewDate: smartGoal.timeTracking.reviewCycle 
                  ? calculateNextReviewDate(smartGoal.timeTracking.reviewCycle)
                  : Timestamp.now()
              }
          )
        },
        milestones: smartGoal.milestones.map(m => ({
          id: m.id || uuidv4(),
          name: m.name.trim(),
          targetDate: m.targetDate || Timestamp.fromDate(new Date()),
          successCriteria: m.successCriteria.trim(),
          status: m.status,
          tasks: m.tasks || []
        })),
        areaId: smartGoal.areaId,
        sharedWith: [],
        tasks: smartGoal.tasks.map(task => ({
          id: task.id || uuidv4(),
          ownerId: currentUser?.uid || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          title: task.title.trim(),
          description: task.description?.trim() || '',
          dueDate: task.dueDate || undefined,
          priority: task.priority,
          status: task.status,
          completed: task.completed,
          assignedTo: task.assignedTo,
          sharedWith: [],
          permissions: {}
        })),
        routines: smartGoal.routines.map(routine => ({
          id: 'id' in routine && routine.id ? routine.id : uuidv4(),
          title: routine.title.trim(),
          description: routine.description?.trim() || '',
          frequency: routine.frequency,
          schedule: {
            type: routine.frequency,
            targetCount: routine.targetCount || 1,
            timeOfDay: routine.schedule?.timeOfDay || { hour: 9, minute: 0 },
            daysOfWeek: routine.schedule?.daysOfWeek || [],
            dayOfMonth: routine.schedule?.dayOfMonth,
            monthsOfYear: routine.schedule?.monthsOfYear || []
          },
          targetCount: routine.targetCount || 1,
          endDate: routine.endDate,
          completionDates: routine.completionDates || [],
          ownerId: currentUser?.uid || '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        }))
      };

      // Since we've already handled all optional fields above, we can safely cast the cleaned data
      const cleanedGoalData = removeUndefinedFields(goalData) as typeof goalData;

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
    navigate(`/goals/${goal.id}/edit`);
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
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Area
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Choose the area of your life this goal belongs to
      </Typography>

      <FormControl fullWidth required>
        <InputLabel>Area</InputLabel>
        <Select
          value={smartGoal.areaId}
          onChange={(e) => setSmartGoal(prev => ({ ...prev, areaId: e.target.value }))}
          label="Area"
        >
          {areas.map(area => (
            <MenuItem key={area.id} value={area.id}>
              {area.name}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          Areas help you organize and track related goals together
        </FormHelperText>
      </FormControl>
    </Box>
  );

  const renderSpecificStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Make it Specific
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define your goal with clear, specific details
        </Typography>
      </Box>

      <TextField
        label="Goal Name"
        value={smartGoal.name}
        onChange={(e) => setSmartGoal(prev => ({ ...prev, name: e.target.value }))}
        fullWidth
        required
        helperText="Give your goal a clear, memorable name"
      />

      <TextField
        label="Specific Action"
        value={smartGoal.specificAction}
        onChange={(e) => setSmartGoal(prev => ({ ...prev, specificAction: e.target.value }))}
        fullWidth
        required
        multiline
        rows={3}
        helperText="What exactly do you want to accomplish? Be as specific as possible"
      />
    </Stack>
  );

  const renderMeasurableStep = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Make it Measurable
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define how you'll measure progress towards this goal
        </Typography>
      </Box>

      <FormControl fullWidth required>
        <InputLabel>Measurement Type</InputLabel>
        <Select
          value={smartGoal.measurableMetric}
          onChange={(e) => {
            const value = e.target.value as MeasurableMetric;
            setSmartGoal(prev => ({
              ...prev,
              measurableMetric: value,
              customMetric: value === 'custom' ? prev.customMetric : undefined
            }));
          }}
          label="Measurement Type"
        >
          {MEASURABLE_METRIC_OPTIONS.map(option => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          How will you track progress towards this goal?
        </FormHelperText>
      </FormControl>

      {smartGoal.measurableMetric === 'custom' && (
        <TextField
          label="Custom Metric"
          value={smartGoal.customMetric || ''}
          onChange={(e) => setSmartGoal(prev => ({ ...prev, customMetric: e.target.value }))}
          fullWidth
          required
          helperText="Define your custom way of measuring progress"
        />
      )}
    </Stack>
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

  const renderTimeboundStep = (): JSX.Element => (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Make it Time-bound
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Set a clear timeline for achieving your goal
        </Typography>
      </Box>

      <FormControl fullWidth>
        <InputLabel>Tracking Type</InputLabel>
        <Select
          value={smartGoal.timeTracking.type}
          onChange={(e) => setSmartGoal(prev => ({
            ...prev,
            timeTracking: {
              ...prev.timeTracking,
              type: e.target.value as TimeTrackingType
            }
          }))}
          label="Tracking Type"
        >
          <MenuItem value="fixed_deadline">Fixed Deadline</MenuItem>
          <MenuItem value="recurring_review">Recurring Review</MenuItem>
        </Select>
      </FormControl>

      {smartGoal.timeTracking.type === 'fixed_deadline' ? (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Deadline"
            value={smartGoal.timeTracking.deadline?.toDate() || null}
            onChange={(date) => setSmartGoal(prev => ({
              ...prev,
              timeTracking: {
                ...prev.timeTracking,
                deadline: date ? Timestamp.fromDate(date) : undefined
              }
            }))}
            slotProps={{
              textField: {
                fullWidth: true,
                helperText: 'When do you want to achieve this goal by?'
              }
            }}
          />
        </LocalizationProvider>
      ) : (
        <FormControl fullWidth>
          <InputLabel>Review Cycle</InputLabel>
          <Select
            value={smartGoal.timeTracking.reviewCycle || ''}
            onChange={(e) => setSmartGoal(prev => ({
              ...prev,
              timeTracking: {
                ...prev.timeTracking,
                reviewCycle: e.target.value as ReviewCycle,
                nextReviewDate: calculateNextReviewDate(e.target.value as ReviewCycle)
              }
            }))}
            label="Review Cycle"
          >
            {REVIEW_CYCLE_OPTIONS.map(option => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            How often do you want to review your progress?
          </FormHelperText>
        </FormControl>
      )}
    </Stack>
  );

  const renderMilestonesStep = (): JSX.Element => (
    <Stack spacing={3}>
      {smartGoal.milestones.map((milestone, index) => (
        <Box key={index} sx={{ position: 'relative' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" gutterBottom>
              Milestone {index + 1}
            </Typography>
            {index > 0 && (
              <IconButton
                size="small"
                onClick={() => {
                  const newMilestones = smartGoal.milestones.filter((_, i) => i !== index);
                  setSmartGoal(prev => ({ ...prev, milestones: newMilestones }));
                }}
                color="error"
              >
                <CloseIcon />
              </IconButton>
            )}
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={milestone.name}
              onChange={(e) => handleMilestoneChange(index, 'name', e.target.value)}
              fullWidth
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Target Date"
                value={milestone.targetDate?.toDate() || null}
                onChange={(date) => handleMilestoneChange(index, 'targetDate', date ? Timestamp.fromDate(date) : undefined)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Stack>
        </Box>
      ))}
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setSmartGoal(prev => addMilestone(prev))}
      >
        Add Milestone
      </Button>
    </Stack>
  );

  const renderTasksStep = (): JSX.Element => (
    <Stack spacing={3}>
      {smartGoal.tasks.map((task, index) => (
        <Box key={index}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Task {index + 1}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                const newTasks = smartGoal.tasks.filter((_, i) => i !== index);
                setSmartGoal(prev => ({ ...prev, tasks: newTasks }));
              }}
              color="error"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={task.title}
              onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
              fullWidth
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={task.dueDate?.toDate() || null}
                onChange={(date) => handleTaskChange(index, 'dueDate', date ? Timestamp.fromDate(date) : undefined)}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Stack>
        </Box>
      ))}
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setSmartGoal(prev => addTask(prev))}
      >
        Add Task
      </Button>
    </Stack>
  );

  const renderRoutinesStep = () => (
    <Stack spacing={3}>
      {smartGoal.routines.map((routine, index) => (
        <Paper key={index} sx={{ p: 3, position: 'relative' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">
              Routine {index + 1}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                const newRoutines = smartGoal.routines.filter((_, i) => i !== index);
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              color="error"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Title"
              value={routine.title}
              onChange={(e) => {
                const newRoutines = [...smartGoal.routines];
                newRoutines[index] = { ...routine, title: e.target.value };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
            />
            <TextField
              label="Description"
              value={routine.description || ''}
              onChange={(e) => {
                const newRoutines = [...smartGoal.routines];
                newRoutines[index] = { ...routine, description: e.target.value };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Frequency</InputLabel>
              <Select
                value={routine.frequency}
                onChange={(e) => {
                  const newRoutines = [...smartGoal.routines];
                  const frequency = e.target.value as typeof routine.frequency;
                  newRoutines[index] = {
                    ...routine,
                    frequency,
                    schedule: {
                      ...routine.schedule,
                      type: frequency
                    }
                  };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                label="Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Target Count"
              type="number"
              value={routine.targetCount}
              onChange={(e) => {
                const newRoutines = [...smartGoal.routines];
                newRoutines[index] = {
                  ...routine,
                  targetCount: parseInt(e.target.value) || 1,
                  schedule: {
                    ...routine.schedule,
                    targetCount: parseInt(e.target.value) || 1
                  }
                };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
              InputProps={{ inputProps: { min: 1 } }}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date (Optional)"
                value={routine.endDate?.toDate() || null}
                onChange={(date) => {
                  const newRoutines = [...smartGoal.routines];
                  newRoutines[index] = {
                    ...routine,
                    endDate: date ? Timestamp.fromDate(date) : undefined
                  };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true
                  }
                }}
              />
            </LocalizationProvider>
          </Stack>
        </Paper>
      ))}
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setSmartGoal(prev => addRoutine(prev))}
      >
        Add Routine
      </Button>
    </Stack>
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

  const renderEditForm = () => (
    <Box sx={{ height: '80vh', overflowY: 'auto' }}>
      <Stack spacing={4} sx={{ pb: 4 }}>
        {wizardSteps.map((step, index) => (
          <Paper key={index} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {step.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {step.subtitle}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {step.component()}
          </Paper>
        ))}
      </Stack>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Goals
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Set and track your SMART goals
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setIsAdding(true);
              setSmartGoal(initialSmartGoal);
              setCurrentStep(0);
            }}
          >
            Add Goal
          </Button>
        </Box>
      </Box>

      {isAdding && (
        <Dialog
          open={true}
          onClose={() => setIsAdding(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                {editingGoal ? 'Edit SMART Goal' : 'Create SMART Goal'}
              </Typography>
              <IconButton
                edge="end"
                onClick={() => {
                  setIsAdding(false);
                  setEditingGoal(null);
                  setSmartGoal(initialSmartGoal);
                }}
                size="small"
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {editingGoal ? (
                renderEditForm()
              ) : (
                <>
                  <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
                    {wizardSteps.map((step, index) => (
                      <Step key={index}>
                        <StepLabel>{step.title.split(' ')[0]}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>

                  <Box sx={{ mt: 4 }}>
                    {wizardSteps[currentStep].component()}
                  </Box>
                </>
              )}
            </Box>
          </DialogContent>

          <DialogActions>
            {editingGoal ? (
              <>
                <Button onClick={() => {
                  setIsAdding(false);
                  setEditingGoal(null);
                  setSmartGoal(initialSmartGoal);
                }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={(e) => handleSubmit(e as React.FormEvent)}
                  disabled={submitting}
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                  disabled={currentStep === 0}
                >
                  Back
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    if (currentStep === wizardSteps.length - 1) {
                      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                    } else {
                      setCurrentStep(prev => prev + 1);
                    }
                  }}
                  disabled={submitting}
                >
                  {currentStep === wizardSteps.length - 1 ? 'Create Goal' : 'Next'}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      )}

      <Grid container spacing={3}>
        {goals.map(goal => (
          <Grid item xs={12} sm={6} lg={4} key={goal.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {goal.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {goal.specificAction}
                    </Typography>
                    {areas.find(a => a.id === goal.areaId)?.name && (
                      <Chip
                        label={areas.find(a => a.id === goal.areaId)?.name}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleShareClick(goal)}
                      sx={{ color: 'primary.main' }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(goal)}
                      sx={{ color: 'action.active' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(goal.id)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isShareModalOpen && sharingGoal && (
        <GoalSharingModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSharingGoal(null);
          }}
          goalId={sharingGoal.id}
          initialTitle={sharingGoal.name}
        />
      )}
    </Container>
  );
}

export default GoalsPage;
