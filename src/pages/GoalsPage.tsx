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
import { DAYS_OF_WEEK } from '../constants';
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
  TaskReviewItem as TaskReviewItemType,
  ReviewFrequency,
  DayOfWeek,
  TimeOfDay,
  Task,
  Milestone
} from '../types';
import { toast } from 'react-hot-toast';
import AreaSharingModal from '../components/AreaSharingModal';
import { v4 as uuidv4 } from 'uuid';
import { useWeeklyPlanning } from '../contexts/WeeklyPlanningContext';
import { TaskReviewList } from '../components/TaskReviewList';
import { LongTermGoalReview } from '../components/LongTermGoalReview';
import { SharedGoalReview } from '../components/SharedGoalReview';
import { useSharedGoalsContext } from '../contexts/SharedGoalsContext';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

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
    routines: string[];
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
    milestoneId?: string;
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
    permissions: {};
    review: {
      reflectionFrequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      reviewStatus: {
        lastReviewDate: Timestamp;
        nextReviewDate: Timestamp;
        completedReviews: string[];
      };
      adherenceRate: number;
      streakData: {
        currentStreak: number;
        longestStreak: number;
        lastCompletedDate: Timestamp;
      };
    };
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
    tasks: [],
    routines: []
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
      assignedTo: undefined,
      milestoneId: undefined
    }
  ]
});

const handleTimeChange = (date: Date | null): TimeOfDay => {
  if (!date) {
    return { hour: 9, minute: 0 };
  }
  return {
    hour: date.getHours(),
    minute: date.getMinutes()
  };
};

const addRoutine = (smartGoal: SmartGoalForm): SmartGoalForm => ({
  ...smartGoal,
  routines: [
    ...smartGoal.routines,
    {
      id: uuidv4(),
      title: '',
      description: '',
      frequency: 'weekly' as const,
      schedule: {
        type: 'weekly' as const,
        targetCount: 3,
        timeOfDay: { hour: 9, minute: 0 },
        daysOfWeek: [
          { day: 'monday' as DayOfWeek, time: { hour: 9, minute: 0 } },
          { day: 'wednesday' as DayOfWeek, time: { hour: 9, minute: 0 } },
          { day: 'friday' as DayOfWeek, time: { hour: 9, minute: 0 } }
        ],
        dayOfMonth: undefined,
        monthsOfYear: []
      } as RoutineSchedule,
      targetCount: 3,
      completionDates: [],
      permissions: {},
      review: {
        reflectionFrequency: 'weekly' as const,
        reviewStatus: {
          lastReviewDate: Timestamp.now(),
          nextReviewDate: Timestamp.now(),
          completedReviews: []
        },
        adherenceRate: 0,
        streakData: {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedDate: Timestamp.now()
        }
      }
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
      tasks: [],
      routines: []
    }
  ]
});

const addTaskToMilestone = (smartGoal: SmartGoalForm, milestoneIndex: number) => {
  const milestone = smartGoal.milestones[milestoneIndex];
  const newTask = {
    id: uuidv4(),
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    status: 'not_started' as TaskStatus,
    completed: false,
    dueDate: undefined,
    assignedTo: undefined,
    milestoneId: milestone.id
  };

  const newMilestones = [...smartGoal.milestones];
  newMilestones[milestoneIndex] = {
    ...newMilestones[milestoneIndex],
    tasks: [...newMilestones[milestoneIndex].tasks, newTask.id]
  };

  return {
    ...smartGoal,
    milestones: newMilestones,
    tasks: [...smartGoal.tasks, newTask]
  };
};

const addRoutineToMilestone = (smartGoal: SmartGoalForm, milestoneIndex: number) => {
  const newRoutine = {
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
    permissions: {},
    review: {
      reflectionFrequency: 'weekly' as const,
      reviewStatus: {
        lastReviewDate: Timestamp.now(),
        nextReviewDate: Timestamp.now(),
        completedReviews: []
      },
      adherenceRate: 0,
      streakData: {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: Timestamp.now()
      }
    }
  };

  const newMilestones = [...smartGoal.milestones];
  newMilestones[milestoneIndex] = {
    ...newMilestones[milestoneIndex],
    routines: [...newMilestones[milestoneIndex].routines, newRoutine.id]
  };

  return {
    ...smartGoal,
    milestones: newMilestones,
    routines: [...smartGoal.routines, newRoutine]
  };
};

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
  const [taskTitleUpdates, setTaskTitleUpdates] = useState<{[key: string]: string}>({});
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [taskTitleError, setTaskTitleError] = useState<{[key: string]: string}>({});
  const [openRoutineModal, setOpenRoutineModal] = useState<string | null>(null);

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
          tasks: m.tasks || [],
          routines: m.routines || []
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
          permissions: {},
          review: {
            reflectionFrequency: 'weekly',
            reviewStatus: {
              lastReviewDate: Timestamp.now(),
              nextReviewDate: Timestamp.now(),
              completedReviews: []
            },
            adherenceRate: 0,
            streakData: {
              currentStreak: 0,
              longestStreak: 0,
              lastCompletedDate: Timestamp.now()
            }
          }
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

  const handleCardClick = (goalId: string, event: React.MouseEvent) => {
    // Prevent navigation if clicking on action buttons
    if ((event.target as HTMLElement).closest('.action-buttons')) {
      return;
    }
    navigate(`/goals/${goalId}`);
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
        <Paper key={index} sx={{ p: 3, position: 'relative' }}>
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
            <TextField
              label="Success Criteria"
              value={milestone.successCriteria}
              onChange={(e) => handleMilestoneChange(index, 'successCriteria', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={milestone.status}
                onChange={(e) => handleMilestoneChange(index, 'status', e.target.value)}
                label="Status"
              >
                {STATUS_OPTIONS.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tasks Section */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tasks
              </Typography>
              <Stack spacing={2}>
                {milestone.tasks.map((taskId) => {
                  const task = smartGoal.tasks.find(t => t.id === taskId);
                  if (!task) return null;

                  return (
                    <Box key={taskId} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Task</Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newMilestones = [...smartGoal.milestones];
                            newMilestones[index] = {
                              ...newMilestones[index],
                              tasks: milestone.tasks.filter(id => id !== taskId)
                            };
                            setSmartGoal(prev => ({
                              ...prev,
                              milestones: newMilestones,
                              tasks: prev.tasks.filter(t => t.id !== taskId)
                            }));
                            setTaskTitleError(prev => {
                              const { [taskId]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          color="error"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack spacing={2}>
                        <TextField
                          label="Title"
                          value={taskTitleUpdates[taskId] ?? task.title}
                          onChange={(e) => {
                            setTaskTitleUpdates(prev => ({
                              ...prev,
                              [taskId]: e.target.value
                            }));
                            // Clear error when user starts typing
                            setTaskTitleError(prev => {
                              const { [taskId]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          onBlur={() => {
                            if (taskTitleUpdates[taskId] === undefined) return;
                            setUpdatingTaskId(taskId);
                            const newTitle = taskTitleUpdates[taskId];
                            
                            // Check if this title already exists in any milestone's tasks
                            const titleExists = smartGoal.milestones.some(m => 
                              m.tasks.some(tid => {
                                const t = smartGoal.tasks.find(task => task.id === tid);
                                return t && t.id !== taskId && t.title === newTitle;
                              })
                            );

                            if (titleExists) {
                              // If title exists, don't update and show error
                              setTaskTitleError(prev => ({
                                ...prev,
                                [taskId]: 'A task with this name already exists in a milestone'
                              }));
                              setTaskTitleUpdates(prev => {
                                const { [taskId]: _, ...rest } = prev;
                                return rest;
                              });
                            } else {
                              // If title doesn't exist, proceed with the update
                              setSmartGoal(prev => ({
                                ...prev,
                                tasks: prev.tasks.map(t => 
                                  t.id === taskId ? { ...t, title: newTitle } : t
                                )
                              }));
                              setTaskTitleUpdates(prev => {
                                const { [taskId]: _, ...rest } = prev;
                                return rest;
                              });
                              setTaskTitleError(prev => {
                                const { [taskId]: _, ...rest } = prev;
                                return rest;
                              });
                            }
                            setUpdatingTaskId(null);
                          }}
                          sx={{ width: '100%' }}
                          disabled={updatingTaskId === taskId}
                          error={!!taskTitleError[taskId]}
                          helperText={taskTitleError[taskId]}
                        />
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label="Due Date"
                            value={task.dueDate?.toDate() || null}
                            onChange={(date) => {
                              setSmartGoal(prev => ({
                                ...prev,
                                tasks: prev.tasks.map(t => 
                                  t.id === taskId ? { ...t, dueDate: date ? Timestamp.fromDate(date) : undefined } : t
                                )
                              }));
                            }}
                            slotProps={{
                              textField: {
                                fullWidth: true,
                                size: "small"
                              }
                            }}
                          />
                        </LocalizationProvider>
                      </Stack>
                    </Box>
                  );
                })}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setSmartGoal(prev => addTaskToMilestone(prev, index))}
                >
                  Add Task
                </Button>
              </Stack>
            </Box>

            {/* Routines Section */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Routines
              </Typography>
              <Stack spacing={2}>
                {milestone.routines.map((routineId) => {
                  const routine = smartGoal.routines.find(r => r.id === routineId);
                  if (!routine) return null;

                  return (
                    <Box key={routineId} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">Routine</Typography>
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newMilestones = [...smartGoal.milestones];
                            newMilestones[index] = {
                              ...newMilestones[index],
                              routines: milestone.routines.filter(id => id !== routineId)
                            };
                            setSmartGoal(prev => ({
                              ...prev,
                              milestones: newMilestones,
                              routines: prev.routines.filter(r => r.id !== routineId)
                            }));
                          }}
                          color="error"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Stack spacing={2}>
                        <TextField
                          label="Title"
                          value={routine.title}
                          onChange={(e) => {
                            setSmartGoal(prev => ({
                              ...prev,
                              routines: prev.routines.map(r => 
                                r.id === routineId ? { ...r, title: e.target.value } : r
                              )
                            }));
                          }}
                          fullWidth
                          size="small"
                        />
                        <TextField
                          label="Description"
                          value={routine.description || ''}
                          onChange={(e) => {
                            setSmartGoal(prev => ({
                              ...prev,
                              routines: prev.routines.map(r => 
                                r.id === routineId ? { ...r, description: e.target.value } : r
                              )
                            }));
                          }}
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Frequency</InputLabel>
                          <Select
                            value={routine.frequency}
                            onChange={(e) => {
                              const frequency = e.target.value as typeof routine.frequency;
                              setSmartGoal(prev => ({
                                ...prev,
                                routines: prev.routines.map(r => 
                                  r.id === routineId ? {
                                    ...r,
                                    frequency,
                                    schedule: {
                                      ...r.schedule,
                                      type: frequency
                                    }
                                  } : r
                                )
                              }));
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
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setOpenRoutineModal(`${milestone.id}-${routineId}`)}
                        >
                          Edit Schedule & Details
                        </Button>
                      </Stack>
                    </Box>
                  );
                })}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setSmartGoal(prev => addRoutineToMilestone(prev, index))}
                >
                  Add Routine
                </Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
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

  const renderTasksStep = () => {
    // Filter tasks to only show those not in milestones
    const independentTasks = smartGoal.tasks.filter(task => !task.milestoneId);

    return (
      <Stack spacing={3}>
        {independentTasks.map((task, index) => (
          <Box key={index}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1">
                Task {index + 1}
              </Typography>
              <IconButton
                size="small"
                onClick={() => {
                  const newTasks = smartGoal.tasks.filter(t => t.id !== task.id);
                  setSmartGoal(prev => ({ ...prev, tasks: newTasks }));
                }}
                color="error"
              >
                <CloseIcon fontSize="small" />
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
  };

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
                const targetCount = parseInt(e.target.value) || 1;
                newRoutines[index] = {
                  ...routine,
                  targetCount,
                  schedule: {
                    ...routine.schedule,
                    targetCount,
                    daysOfWeek: Array(targetCount).fill(null).map((_, i) => 
                      routine.schedule.daysOfWeek?.[i] || {
                        day: 'monday',
                        time: { hour: 9, minute: 0 }
                      }
                    )
                  }
                };
                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
              }}
              fullWidth
              InputProps={{ inputProps: { min: 1 } }}
            />

            {routine.frequency === 'weekly' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Schedule for {routine.targetCount} days per week
                </Typography>
                <Stack spacing={2}>
                  {Array.from({ length: routine.targetCount }).map((_, dayIndex) => {
                    const currentSchedule = routine.schedule.daysOfWeek?.[dayIndex];
                    return (
                      <Box key={dayIndex} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Day</InputLabel>
                            <Select
                              value={currentSchedule?.day || 'monday'}
                              onChange={(e) => {
                                const newRoutines = [...smartGoal.routines];
                                const newDaysOfWeek = [...(routine.schedule.daysOfWeek || [])];
                                newDaysOfWeek[dayIndex] = {
                                  ...newDaysOfWeek[dayIndex],
                                  day: e.target.value as DayOfWeek,
                                  time: currentSchedule?.time || { hour: 9, minute: 0 }
                                };
                                newRoutines[index] = {
                                  ...routine,
                                  schedule: {
                                    ...routine.schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                              }}
                              label="Day"
                            >
                              {DAYS_OF_WEEK.map((day: string) => (
                                <MenuItem key={day} value={day.toLowerCase()}>
                                  {day.charAt(0).toUpperCase() + day.slice(1)}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <TimePicker
                              label="Time"
                              value={new Date().setHours(
                                currentSchedule?.time?.hour || 9,
                                currentSchedule?.time?.minute || 0
                              )}
                              onChange={(newDate) => {
                                if (!newDate) return;
                                const timeOfDay = handleTimeChange(new Date(newDate));
                                const newRoutines = [...smartGoal.routines];
                                const newDaysOfWeek = [...(routine.schedule.daysOfWeek || [])];
                                newDaysOfWeek[dayIndex] = {
                                  ...newDaysOfWeek[dayIndex],
                                  day: currentSchedule?.day || 'monday',
                                  time: timeOfDay
                                };
                                newRoutines[index] = {
                                  ...routine,
                                  schedule: {
                                    ...routine.schedule,
                                    daysOfWeek: newDaysOfWeek
                                  }
                                };
                                setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                              }}
                            />
                          </LocalizationProvider>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {(routine.frequency === 'daily' || routine.frequency === 'monthly') && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <TimePicker
                  label="Time of Day"
                  value={new Date().setHours(
                    routine.schedule.timeOfDay?.hour || 9,
                    routine.schedule.timeOfDay?.minute || 0
                  )}
                  onChange={(newDate) => {
                    if (!newDate) return;
                    const timeOfDay = handleTimeChange(new Date(newDate));
                    const newRoutines = [...smartGoal.routines];
                    newRoutines[index] = {
                      ...routine,
                      schedule: {
                        ...routine.schedule,
                        timeOfDay
                      }
                    };
                    setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                  }}
                />
              </LocalizationProvider>
            )}

            {routine.frequency === 'monthly' && (
              <TextField
                label="Day of Month"
                type="number"
                value={routine.schedule.dayOfMonth || ''}
                onChange={(e) => {
                  const newRoutines = [...smartGoal.routines];
                  newRoutines[index] = {
                    ...routine,
                    schedule: {
                      ...routine.schedule,
                      dayOfMonth: parseInt(e.target.value)
                    }
                  };
                  setSmartGoal(prev => ({ ...prev, routines: newRoutines }));
                }}
                fullWidth
                InputProps={{ inputProps: { min: 1, max: 31 } }}
              />
            )}

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
                  <Box sx={{ position: 'relative', mb: 6 }}>
                    <Typography variant="h5" align="center" gutterBottom sx={{ mb: 3 }}>
                      Create SMART Goal
                    </Typography>
                    <Stepper 
                      activeStep={currentStep} 
                      alternativeLabel
                      sx={{
                        '& .MuiStepLabel-root': {
                          '& .MuiStepLabel-label': {
                            display: 'none'
                          },
                          '& .MuiStepIcon-root': {
                            width: '2rem',
                            height: '2rem',
                            color: 'grey.300',
                            '&.Mui-active': {
                              color: 'primary.main',
                            },
                            '&.Mui-completed': {
                              color: 'success.main',
                            }
                          }
                        },
                        '& .MuiStepConnector-root': {
                          top: '1rem',
                          '& .MuiStepConnector-line': {
                            borderColor: 'grey.300'
                          },
                          '&.Mui-active .MuiStepConnector-line': {
                            borderColor: 'primary.main'
                          },
                          '&.Mui-completed .MuiStepConnector-line': {
                            borderColor: 'success.main'
                          }
                        }
                      }}
                    >
                      {wizardSteps.map((_, index) => (
                        <Step key={index}>
                          <StepLabel />
                        </Step>
                      ))}
                    </Stepper>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      align="center" 
                      sx={{ mt: 2 }}
                    >
                      Step {currentStep + 1} of {wizardSteps.length}
                    </Typography>
                  </Box>

                  <Paper 
                    elevation={2} 
                    sx={{ 
                      p: 4, 
                      borderRadius: 2,
                      backgroundColor: 'background.paper',
                      transition: 'all 0.3s ease-in-out'
                    }}
                  >
                    <Typography variant="h6" gutterBottom color="primary">
                      {wizardSteps[currentStep].title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {wizardSteps[currentStep].subtitle}
                    </Typography>
                    <Box sx={{ mt: 3 }}>
                      {wizardSteps[currentStep].component()}
                    </Box>
                  </Paper>
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
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '200px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[4]
                }
              }}
              onClick={(e) => handleCardClick(goal.id, e)}
            >
              <CardContent sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 2
                }}>
                  <Typography 
                    variant="h6" 
                    component="h3"
                    sx={{
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      lineHeight: 1.3,
                      mb: 1
                    }}
                  >
                    {goal.name}
                  </Typography>
                  <Box 
                    className="action-buttons"
                    sx={{ 
                      display: 'flex', 
                      gap: 0.5,
                      ml: 1,
                      flexShrink: 0
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareClick(goal);
                      }}
                      sx={{ color: 'primary.main' }}
                    >
                      <ShareIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(goal);
                      }}
                      sx={{ color: 'action.active' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(goal.id);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    minHeight: '4.5em'
                  }}
                >
                  {goal.specificAction}
                </Typography>

                <Box sx={{ mt: 'auto' }}>
                  {areas.find(a => a.id === goal.areaId)?.name && (
                    <Chip
                      label={areas.find(a => a.id === goal.areaId)?.name}
                      size="small"
                      sx={{ 
                        backgroundColor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isShareModalOpen && sharingGoal && (
        <AreaSharingModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setSharingGoal(null);
          }}
          areaId={sharingGoal.areaId}
          areaName={areas.find(a => a.id === sharingGoal.areaId)?.name || 'Area'}
        />
      )}

      {/* Routine Details Modal */}
      {smartGoal.milestones.map((milestone) => (
        milestone.routines.map((routineId) => {
          const routine = smartGoal.routines.find(r => r.id === routineId);
          if (!routine) return null;

          return (
            <Dialog
              key={`${milestone.id}-${routineId}`}
              open={openRoutineModal === `${milestone.id}-${routineId}`}
              onClose={() => setOpenRoutineModal(null)}
              maxWidth="md"
              fullWidth
            >
              <DialogTitle>Edit Routine Schedule & Details</DialogTitle>
              <DialogContent>
                <div className="space-y-6 py-4">
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
                        setSmartGoal(prev => {
                          const newRoutines = prev.routines.map(r => 
                            r.id === routineId ? {
                              ...r,
                              targetCount,
                              schedule: {
                                ...r.schedule,
                                targetCount
                              }
                            } : r
                          );
                          return { ...prev, routines: newRoutines };
                        });
                      }}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>

                  {routine.frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Schedule
                      </label>
                      <div className="space-y-4">
                        {[...Array(routine.targetCount)].map((_, occurrenceIndex) => (
                          <div key={occurrenceIndex} className="space-y-2">
                            <div className="flex gap-2">
                              <select
                                value={routine.schedule.daysOfWeek?.[occurrenceIndex]?.day || 'monday'}
                                onChange={e => {
                                  setSmartGoal(prev => {
                                    const newRoutines = prev.routines.map(r => {
                                      if (r.id !== routineId) return r;
                                      
                                      const newDaysOfWeek = [...(r.schedule.daysOfWeek || [])];
                                      newDaysOfWeek[occurrenceIndex] = {
                                        ...(newDaysOfWeek[occurrenceIndex] || {}),
                                        day: e.target.value as DayOfWeek,
                                        time: newDaysOfWeek[occurrenceIndex]?.time || { hour: 9, minute: 0 }
                                      };
                                      
                                      return {
                                        ...r,
                                        schedule: {
                                          ...r.schedule,
                                          daysOfWeek: newDaysOfWeek
                                        }
                                      };
                                    });
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
                                  setSmartGoal(prev => {
                                    const newRoutines = prev.routines.map(r => {
                                      if (r.id !== routineId) return r;
                                      
                                      const newDaysOfWeek = [...(r.schedule.daysOfWeek || [])];
                                      newDaysOfWeek[occurrenceIndex] = {
                                        ...(newDaysOfWeek[occurrenceIndex] || { day: 'monday' }),
                                        time: { hour: hours, minute: minutes }
                                      };
                                      
                                      return {
                                        ...r,
                                        schedule: {
                                          ...r.schedule,
                                          daysOfWeek: newDaysOfWeek
                                        }
                                      };
                                    });
                                    return { ...prev, routines: newRoutines };
                                  });
                                }}
                                className="w-32 p-2 border rounded-md"
                              />
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
                          setSmartGoal(prev => {
                            const newRoutines = prev.routines.map(r => 
                              r.id === routineId ? {
                                ...r,
                                schedule: {
                                  ...r.schedule,
                                  dayOfMonth
                                }
                              } : r
                            );
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
                <Button onClick={() => setOpenRoutineModal(null)}>Close</Button>
              </DialogActions>
            </Dialog>
          );
        })
      )}
    </Container>
  );
}

export default GoalsPage;
